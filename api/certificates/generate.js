import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import dbConnect from '../../utils/db';
import Template from '../../models/Template';
import Participant from '../../models/Participant';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        await dbConnect();
        const { templateId, participantIds } = req.body;

        const template = await Template.findById(templateId);
        if (!template) {
            return res.status(404).json({ success: false, error: { message: 'Template not found' } });
        }

        const participants = await Participant.find({ _id: { $in: participantIds } });

        if (participants.length === 0) {
            return res.status(400).json({ success: false, error: { message: 'No valid participants found' } });
        }

        const now = new Date();
        await Participant.updateMany(
            { _id: { $in: participantIds } },
            {
                $push: {
                    certificates: {
                        templateId: template._id,
                        generatedAt: now,
                        downloadUrl: `/api/certificates/download?t=${template._id}&p=`
                    }
                }
            }
        );

        return res.status(200).json({
            success: true,
            data: {
                generated: participants.length,
                templateName: template.name
            }
        });

    } catch (error) {
        console.error('Generation error:', error);
        return res.status(500).json({ success: false, error: { message: 'Generation failed', details: error.message } });
    }
}
