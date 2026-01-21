// Explicit file for /api/mass-mail/auth/google/callback
export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { query } = req;
    const { code, error } = query;

    const BASE_URL = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://certificate-management-platform.vercel.app';

    // Determine frontend URL
    const frontendUrl = BASE_URL.includes('vercel.app')
        ? BASE_URL
        : 'http://localhost:3000';

    if (error) {
        return res.redirect(`${frontendUrl}/mass-mailer?auth=error&reason=${encodeURIComponent(error)}`);
    }

    if (!code) {
        return res.redirect(`${frontendUrl}/mass-mailer?auth=error&reason=no_code`);
    }

    // Success
    return res.redirect(`${frontendUrl}/mass-mailer?auth=success&code=${encodeURIComponent(code)}`);
}
