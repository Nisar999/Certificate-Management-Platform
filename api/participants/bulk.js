import dbConnect from '../../utils/db';
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
        const { participants, category } = req.body;

        if (!participants || !Array.isArray(participants)) {
            return res.status(400).json({ success: false, error: { message: 'Invalid participants data' } });
        }

        // Process bulk upsert
        const operations = participants.map(p => ({
            updateOne: {
                filter: { email: p.email, category: category || p.category },
                update: {
                    $set: {
                        name: p.name,
                        email: p.email,
                        category: category || p.category,
                        status: 'active'
                    }
                },
                upsert: true
            }
        }));

        const result = await Participant.bulkWrite(operations);

        return res.status(200).json({
            success: true,
            data: {
                matched: result.matchedCount,
                modified: result.modifiedCount,
                upserted: result.upsertedCount
            }
        });

    } catch (error) {
        console.error('Bulk import error:', error);
        return res.status(500).json({ success: false, error: { message: 'Bulk import failed', details: error.message } });
    }
}
