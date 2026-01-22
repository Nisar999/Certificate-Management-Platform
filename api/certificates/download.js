import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import dbConnect from '../../utils/db';
import Template from '../../models/Template';
import Participant from '../../models/Participant';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'GET') {
        return res.status(405).end();
    }

    try {
        await dbConnect();
        const { t: templateId, p: participantId } = req.query;

        if (!templateId || !participantId) {
            return res.status(400).send('Missing parameters');
        }

        const template = await Template.findById(templateId);
        if (!template) return res.status(404).send('Template not found');

        const participant = await Participant.findById(participantId);
        if (!participant) return res.status(404).send('Participant not found');

        const base64Data = template.imageBase64.split(',')[1];
        const imageBytes = Buffer.from(base64Data, 'base64');

        const pdfDoc = await PDFDocument.create();
        let image;
        try {
            if (template.imageBase64.includes('image/png')) {
                image = await pdfDoc.embedPng(imageBytes);
            } else {
                image = await pdfDoc.embedJpg(imageBytes);
            }
        } catch (e) {
            console.error('Image embed error', e);
            return res.status(500).send('Invalid template image');
        }

        const { width, height } = image.scale(1);
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(image, { x: 0, y: 0, width, height });

        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        for (const field of template.fields || []) {
            let text = '';
            if (field.id === 'name') text = participant.name;
            else if (field.id === 'email') text = participant.email;
            else if (field.id === 'date') text = new Date().toLocaleDateString();
            else if (field.id === 'certificateId') text = participant._id.toString().slice(-8).toUpperCase();
            else text = field.defaultValue || '';

            if (text) {
                page.drawText(text, {
                    x: field.x || 100,
                    y: height - (field.y || 100),
                    size: field.fontSize || 24,
                    font: font,
                    color: rgb(0, 0, 0)
                });
            }
        }

        const pdfBytes = await pdfDoc.save();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="certificate-${participant.name}.pdf"`);
        res.send(Buffer.from(pdfBytes));

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).send('Generation failed');
    }
}
