import dbConnect from '../../utils/db';
import Template from '../../models/Template';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ success: false, error: { message: 'ID required' } });
    }

    await dbConnect();

    if (req.method === 'GET') {
        try {
            const template = await Template.findById(id);
            if (!template) {
                return res.status(404).json({ success: false, error: { message: 'Template not found' } });
            }
            return res.status(200).json({ success: true, data: template });
        } catch (error) {
            return res.status(500).json({ success: false, error: { message: 'Server error' } });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const template = await Template.findByIdAndDelete(id);
            if (!template) {
                return res.status(404).json({ success: false, error: { message: 'Template not found' } });
            }
            return res.status(200).json({ success: true, message: 'Template deleted' });
        } catch (error) {
            return res.status(500).json({ success: false, error: { message: 'Failed to delete' } });
        }
    }

    if (req.method === 'PUT') {
        try {
            const updateData = req.body;
            const template = await Template.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
            if (!template) {
                return res.status(404).json({ success: false, error: { message: 'Template not found' } });
            }
            return res.status(200).json({ success: true, data: template });
        } catch (error) {
            return res.status(500).json({ success: false, error: { message: 'Failed to update' } });
        }
    }
}
