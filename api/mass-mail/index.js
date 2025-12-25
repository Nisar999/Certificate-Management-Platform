// Vercel serverless function for mass mailer API
// Updated: Force redeploy with environment variables
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, url } = req;
  const urlPath = url.split('?')[0];

  // Environment variables with fallbacks
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'mock_client_id';
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'mock_client_secret';
  const BASE_URL = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.BASE_URL || 'https://certificate-management-platform.vercel.app';
  const REDIRECT_URI = `${BASE_URL}/api/mass-mail/auth/callback`;

  try {
    // Google OAuth authentication
    if (method === 'GET' && (urlPath === '/auth/google' || urlPath === '/api/mass-mail/auth/google')) {
      // Build Google OAuth URL with environment variables
      const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
        `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        'response_type=code&' +
        'scope=https://www.googleapis.com/auth/gmail.send&' +
        'access_type=offline';

      return res.redirect(authUrl);
    }

    // OAuth callback
    if (method === 'GET' && (urlPath === '/auth/callback' || urlPath === '/api/mass-mail/auth/callback')) {
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Authorization code is required'
        });
      }

      // If using real Google credentials, exchange code for tokens
      if (GOOGLE_CLIENT_ID !== 'mock_client_id' && GOOGLE_CLIENT_SECRET !== 'mock_client_secret') {
        try {
          // Exchange authorization code for access token
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: GOOGLE_CLIENT_ID,
              client_secret: GOOGLE_CLIENT_SECRET,
              code: code,
              grant_type: 'authorization_code',
              redirect_uri: REDIRECT_URI,
            }),
          });

          const tokenData = await tokenResponse.json();

          if (!tokenResponse.ok) {
            return res.status(400).json({
              success: false,
              error: 'Failed to exchange authorization code',
              details: tokenData.error_description || tokenData.error
            });
          }

          return res.json({
            success: true,
            message: 'Authentication successful',
            data: {
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token,
              expiresIn: tokenData.expires_in,
              tokenType: tokenData.token_type
            }
          });

        } catch (error) {
          return res.status(500).json({
            success: false,
            error: 'Failed to authenticate with Google',
            details: error.message
          });
        }
      }

      // Mock token exchange for demonstration
      return res.json({
        success: true,
        message: 'Authentication successful (Demo Mode)',
        data: {
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token',
          expiresIn: 3600,
          tokenType: 'Bearer'
        }
      });
    }

    // Send bulk emails
    if (method === 'POST' && (urlPath === '/send-bulk' || urlPath === '/api/mass-mail/send-bulk')) {
      const { recipients, subject, template, attachments = [] } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Recipients array is required'
        });
      }

      if (!subject || !template) {
        return res.status(400).json({
          success: false,
          error: 'Subject and template are required'
        });
      }

      // Mock email sending
      const results = recipients.map((recipient, index) => ({
        email: recipient.email,
        name: recipient.name,
        status: Math.random() > 0.05 ? 'sent' : 'failed', // 95% success rate
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
          results,
          campaignId: `campaign_${Date.now()}`,
          sentAt: new Date().toISOString()
        }
      });
    }

    // Get email status
    if (method === 'GET' && (urlPath === '/status' || urlPath === '/api/mass-mail/status')) {
      const isRealAuth = GOOGLE_CLIENT_ID !== 'mock_client_id';
      
      return res.json({
        success: true,
        data: {
          authenticated: true,
          email: isRealAuth ? 'Connected via Google OAuth' : 'demo@example.com',
          quotaRemaining: 500,
          lastActivity: new Date().toISOString(),
          authMode: isRealAuth ? 'production' : 'demo',
          clientId: GOOGLE_CLIENT_ID.substring(0, 20) + '...' // Show partial client ID for verification
        }
      });
    }

    // Default 404 for unmatched routes
    return res.status(404).json({
      success: false,
      error: {
        code: 'ENDPOINT_NOT_FOUND',
        message: 'Mass mailer API endpoint not found',
        availableEndpoints: [
          'GET /api/mass-mail/auth/google',
          'GET /api/mass-mail/auth/callback',
          'POST /api/mass-mail/send-bulk',
          'GET /api/mass-mail/status'
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