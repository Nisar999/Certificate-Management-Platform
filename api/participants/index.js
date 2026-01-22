import dbConnect from '../utils/db';
import Participant from '../models/Participant';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    await dbConnect();

    if (req.method === 'GET') {
        try {
            const { category, search, limit = 50, page = 1 } = req.query;
            const query = {};

            if (category && category !== 'All') {
                query.category = category;
            }

            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ];
            }

            const limitNum = parseInt(limit);
            const skip = (parseInt(page) - 1) * limitNum;

            const participants = await Participant.find(query)
                .limit(limitNum)
                .skip(skip)
                .sort({ createdAt: -1 });

            const total = await Participant.countDocuments(query);

            return res.status(200).json({
                success: true,
                data: {
                    participants,
                    pagination: {
                        total,
                        page: parseInt(page),
                        pages: Math.ceil(total / limitNum)
                    }
                }
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: { message: 'Failed to fetch participants' } });
        }
    }

    if (req.method === 'POST') {
        try {
            const { name, email, category } = req.body;

            if (!name || !email || !category) {
                return res.status(400).json({ success: false, error: { message: 'Missing fields' } });
            }

            const participant = await Participant.create({
                name,
                email,
                category,
                status: 'active'
            });

            return res.status(201).json({ success: true, data: participant });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({ success: false, error: { message: 'Participant already exists in this category' } });
            }
            return res.status(500).json({ success: false, error: { message: 'Failed the create participant' } });
        }
    }
}
