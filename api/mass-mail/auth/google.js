// Explicit file for /api/mass-mail/auth/google
export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Environment variables
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'mock_client_id';
    const BASE_URL = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://certificate-management-platform.vercel.app';

    const REDIRECT_URI = `${BASE_URL}/api/mass-mail/auth/google/callback`;

    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
        `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        'response_type=code&' +
        'scope=https://www.googleapis.com/auth/gmail.send%20https://www.googleapis.com/auth/userinfo.email%20https://www.googleapis.com/auth/userinfo.profile&' +
        'access_type=offline&' +
        'prompt=consent';

    return res.redirect(authUrl);
}
