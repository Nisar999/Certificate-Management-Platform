// Vercel serverless function for mass mailer API (simplified structure)
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
    // Parse the URL path to handle both query params and path-based routing
    const urlPath = url.split('?')[0];
    const pathSegments = urlPath.split('/').filter(Boolean);
    
    // Handle path-based routing: /api/mass-mail/auth/google
    let action = query.action || 'status';
    
    // Check if URL contains /auth/google or /auth/google/callback
    if (pathSegments.includes('auth')) {
      const authIndex = pathSegments.indexOf('auth');
      const nextSegment = pathSegments[authIndex + 1];
      
      if (nextSegment === 'google') {
        const callbackSegment = pathSegments[authIndex + 2];
        action = callbackSegment === 'callback' ? 'callback' : 'auth';
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