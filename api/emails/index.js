// Vercel serverless function for email API
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
    // Get OAuth authorization URL
    if (method === 'GET' && urlPath === '/api/emails/auth-url') {
      // Mock OAuth URL for demonstration
      const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
        'client_id=mock_client_id&' +
        'redirect_uri=https://your-app.vercel.app/api/emails/auth-callback&' +
        'response_type=code&' +
        'scope=https://www.googleapis.com/auth/gmail.send&' +
        'access_type=offline';

      return res.json({
        success: true,
        data: {
          authUrl,
          message: 'Visit this URL to authorize email sending'
        }
      });
    }

    // Handle OAuth callback
    if (method === 'POST' && urlPath === '/api/emails/auth-callback') {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Authorization code is required'
          }
        });
      }

      // Mock token exchange
      return res.json({
        success: true,
        message: 'Email authorization successful',
        data: {
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token',
          expiresIn: 3600,
          authorizedAt: new Date().toISOString()
        }
      });
    }

    // Send bulk emails
    if (method === 'POST' && urlPath === '/api/emails/send-bulk') {
      const { recipients, subject, template, attachments = [] } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Recipients array is required and cannot be empty'
          }
        });
      }

      if (!subject || !template) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Subject and template are required'
          }
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

    // Get email templates
    if (method === 'GET' && urlPath === '/api/emails/templates') {
      const templates = [
        {
          id: 1,
          name: 'Certificate Delivery',
          subject: 'Your Certificate is Ready!',
          content: 'Dear {{name}}, your certificate for {{eventName}} is attached.',
          isActive: true
        },
        {
          id: 2,
          name: 'Event Reminder',
          subject: 'Reminder: {{eventName}} Tomorrow',
          content: 'Dear {{name}}, this is a reminder about {{eventName}} scheduled for tomorrow.',
          isActive: true
        },
        {
          id: 3,
          name: 'Thank You Note',
          subject: 'Thank You for Participating',
          content: 'Dear {{name}}, thank you for participating in {{eventName}}.',
          isActive: true
        }
      ];

      return res.json({
        success: true,
        data: templates
      });
    }

    // Get email campaign statistics
    if (method === 'GET' && urlPath === '/api/emails/campaigns') {
      const campaigns = [
        {
          id: 1,
          name: 'Technical Workshop Certificates',
          subject: 'Your Technical Workshop Certificate',
          recipients: 120,
          sent: 118,
          delivered: 115,
          opened: 95,
          clicked: 12,
          bounced: 3,
          status: 'completed',
          createdAt: '2024-06-15T10:00:00Z'
        },
        {
          id: 2,
          name: 'Leadership Training Certificates',
          subject: 'Leadership Training Completion Certificate',
          recipients: 85,
          sent: 84,
          delivered: 82,
          opened: 68,
          clicked: 8,
          bounced: 2,
          status: 'completed',
          createdAt: '2024-06-10T14:30:00Z'
        }
      ];

      return res.json({
        success: true,
        data: campaigns
      });
    }

    // Test email configuration
    if (method === 'POST' && urlPath === '/api/emails/test') {
      const { testEmail } = req.body;

      if (!testEmail) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Test email address is required'
          }
        });
      }

      // Mock test email
      return res.json({
        success: true,
        message: 'Test email sent successfully',
        data: {
          testEmail,
          messageId: `test_${Date.now()}`,
          sentAt: new Date().toISOString()
        }
      });
    }

    // Default 404 for unmatched routes
    return res.status(404).json({
      success: false,
      error: {
        code: 'ENDPOINT_NOT_FOUND',
        message: 'Email API endpoint not found',
        availableEndpoints: [
          'GET /api/emails/auth-url',
          'POST /api/emails/auth-callback',
          'POST /api/emails/send-bulk',
          'GET /api/emails/templates',
          'GET /api/emails/campaigns',
          'POST /api/emails/test'
        ]
      }
    });

  } catch (error) {
    console.error('Email API Error:', error);
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