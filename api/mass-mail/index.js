// Vercel serverless function for mass mailer API
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

  try {
    // Google OAuth authentication
    if (method === 'GET' && urlPath === '/api/mass-mail/auth/google') {
      // Mock Google OAuth URL for demonstration
      const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
        'client_id=mock_client_id&' +
        'redirect_uri=https://certificate-management-platform.vercel.app/api/mass-mail/auth/callback&' +
        'response_type=code&' +
        'scope=https://www.googleapis.com/auth/gmail.send&' +
        'access_type=offline';

      return res.redirect(authUrl);
    }

    // OAuth callback
    if (method === 'GET' && urlPath === '/api/mass-mail/auth/callback') {
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Authorization code is required'
        });
      }

      // Mock token exchange - in production, you'd exchange the code for tokens
      return res.json({
        success: true,
        message: 'Authentication successful',
        data: {
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token',
          expiresIn: 3600
        }
      });
    }

    // Send bulk emails
    if (method === 'POST' && urlPath === '/api/mass-mail/send-bulk') {
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
    if (method === 'GET' && urlPath === '/api/mass-mail/status') {
      return res.json({
        success: true,
        data: {
          authenticated: true,
          email: 'demo@example.com',
          quotaRemaining: 500,
          lastActivity: new Date().toISOString()
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