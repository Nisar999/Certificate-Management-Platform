// Vercel serverless function for mass mailer API (deterministic router)
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { method, query, url } = req;

    // Environment variables with fallbacks
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'mock_client_id';
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'mock_client_secret';
    const BASE_URL = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://certificate-management-platform.vercel.app';

    try {
        // Router for Mass Mailer API
        // Handles /api/mass-mail/auth/... via explicit rewrite -> router.js?path=...

        // Get path segments from query param (rewrite) or URL fallback
        const pathParam = query.path || '';

        const getSegments = () => {
            // Priority 1: Rewrite path param
            if (Array.isArray(pathParam)) return pathParam; // Should be string usually, but Vercel can pass arrays
            if (typeof pathParam === 'string' && pathParam) return pathParam.split('/').filter(Boolean);

            // Priority 2: Fallback to URL parsing (unlikely if rewrite works)
            const urlPath = url.includes('?') ? url.split('?')[0] : url;
            // Remove /api/mass-mail prefix if present
            const cleanPath = urlPath.replace(/^\/api\/mass-mail\/?/, '');
            return cleanPath.split('/').filter(Boolean);
        };

        const segments = getSegments();

        console.log('Router processing segments:', segments); // Debug log

        // Initialize action
        let action = query.action || 'status';

        // Check segments for actions
        if (segments.length > 0) {
            if (segments.includes('auth')) {
                // e.g. ['auth', 'google'] or ['auth', 'disconnect']
                const authIndex = segments.indexOf('auth');
                if (authIndex + 1 < segments.length) {
                    const next = segments[authIndex + 1];
                    if (next === 'google') {
                        if (segments.includes('callback')) {
                            action = 'callback';
                        } else {
                            action = 'auth';
                        }
                    } else if (next === 'disconnect') {
                        action = 'disconnect';
                    }
                }
            } else if (segments.includes('send-bulk')) {
                action = 'send';
            } else if (segments.includes('status')) {
                action = 'status';
            }
        }

        // Google OAuth authentication
        if (action === 'auth' && method === 'GET') {
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

        // OAuth callback
        if (action === 'callback' && method === 'GET') {
            const { code, error } = query;

            if (error) {
                // Redirect to frontend with error
                const frontendUrl = BASE_URL.includes('vercel.app')
                    ? BASE_URL
                    : 'http://localhost:3000';
                return res.redirect(`${frontendUrl}/mass-mailer?auth=error&reason=${encodeURIComponent(error)}`);
            }

            if (!code) {
                const frontendUrl = BASE_URL.includes('vercel.app')
                    ? BASE_URL
                    : 'http://localhost:3000';
                return res.redirect(`${frontendUrl}/mass-mailer?auth=error&reason=no_code`);
            }

            // In production, you would exchange the code for tokens here
            // For now, we'll redirect to the frontend with success
            const frontendUrl = BASE_URL.includes('vercel.app')
                ? BASE_URL
                : 'http://localhost:3000';

            // Store the code temporarily (in production, use proper token storage)
            return res.redirect(`${frontendUrl}/mass-mailer?auth=success&code=${encodeURIComponent(code)}`);
        }

        // Send bulk emails
        if (action === 'send' && method === 'POST') {
            const { recipients, subject, template } = req.body;

            if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Recipients array is required'
                });
            }

            // Mock email sending
            const results = recipients.map((recipient, index) => ({
                email: recipient.email,
                name: recipient.name,
                status: Math.random() > 0.05 ? 'sent' : 'failed',
                messageId: `mock_message_${Date.now()}_${index}`,
                sentAt: new Date().toISOString()
            }));

            const successful = results.filter(r => r.status === 'sent').length;
            const failed = results.filter(r => r.status === 'failed').length;

            return res.json({
                success: true,
                message: 'Bulk email sending completed',
                data: {
                    total: recipients.length,
                    successful,
                    failed,
                    results
                }
            });
        }

        // Disconnect from Gmail
        if (action === 'disconnect' && method === 'POST') {
            // In production, you would revoke tokens here
            return res.json({
                success: true,
                message: 'Successfully disconnected from Gmail',
                data: {
                    disconnectedAt: new Date().toISOString()
                }
            });
        }

        // Default status endpoint
        const isRealAuth = GOOGLE_CLIENT_ID !== 'mock_client_id';

        return res.json({
            success: true,
            message: 'Mass Mailer API is working!',
            data: {
                authenticated: true,
                email: isRealAuth ? 'Connected via Google OAuth' : 'demo@example.com',
                quotaRemaining: 500,
                lastActivity: new Date().toISOString(),
                authMode: isRealAuth ? 'production' : 'demo',
                clientId: GOOGLE_CLIENT_ID.substring(0, 20) + '...',
                availableActions: [
                    'GET /api/mass-mail (status)',
                    'GET /api/mass-mail?action=auth (Google OAuth)',
                    'GET /api/mass-mail?action=callback (OAuth callback)',
                    'POST /api/mass-mail?action=send (Send emails)'
                ]
            }
        });

    } catch (error) {
        console.error('Mass Mailer API Error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An internal server error occurred',
                details: error.message
            }
        });
    }
}
