import dbConnect from '../utils/db';
import Template from '../models/Template';
import Participant from '../models/Participant';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    await dbConnect();

    try {
        const totalParticipants = await Participant.countDocuments();
        const activeTemplates = await Template.countDocuments({ isActive: true });

        // Certificates generated count (sum of array lengths)
        // MongoDB aggregation
        const certStats = await Participant.aggregate([
            { $unwind: "$certificates" },
            { $count: "totalGenerated" }
        ]);
        const totalCertificates = certStats[0]?.totalGenerated || 0;

        // By Category
        const categoryStats = await Participant.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        return res.status(200).json({
            success: true,
            data: {
                totalParticipants,
                activeTemplates,
                totalCertificates,
                categoryStats: categoryStats.map(c => ({ category: c._id, count: c.count }))
            }
        });
    } catch (error) {
        console.error('Reports error:', error);
        return res.status(500).json({ success: false, error: { message: 'Failed to fetch report data' } });
    }
}
