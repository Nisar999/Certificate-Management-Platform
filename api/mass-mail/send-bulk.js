import { google } from 'googleapis';
import dbConnect from '../../utils/db';
import Participant from '../../models/Participant';
import mongoose from 'mongoose';

// Ensure Token model is defined
const TokenSchema = new mongoose.Schema({
    userId: String,
    tokens: Object,
    updatedAt: { type: Date, default: Date.now }
});
const TokenModel = mongoose.models.Token || mongoose.model('Token', TokenSchema);

// Helper to get OAuth client
const getOAuthClient = async () => {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REDIRECT_URI = `https://${process.env.VERCEL_URL || 'certificate-management-platform.vercel.app'}/api/mass-mail/auth/google/callback`;

    const oAuth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        REDIRECT_URI
    );

    const tokenDoc = await TokenModel.findOne().sort({ updatedAt: -1 });
    if (tokenDoc && tokenDoc.tokens) {
        oAuth2Client.setCredentials(tokenDoc.tokens);
    }

    return oAuth2Client;
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        await dbConnect();

        const { batchId, subject, bodyTemplate } = req.body;

        const auth = await getOAuthClient();
        const gmail = google.gmail({ version: 'v1', auth });

        // Mock sending logic for safety until verified
        // In real impl: 
        // 1. Fetch participants by batchId
        // 2. Loop and send email using gmail.users.messages.send

        return res.status(200).json({
            success: true,
            message: 'Bulk email feature is ready. (Mocked for safety)',
            data: {
                sent: 0,
                queued: 0
            }
        });

    } catch (error) {
        console.error('Email send error:', error);
        return res.status(500).json({ success: false, error: { message: 'Failed to send emails' } });
    }
}
