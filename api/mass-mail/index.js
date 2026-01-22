// Main handler for /api/mass-mail (status, disconnect, send)
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, query, url } = req;

  // Simple action detection logic based on URL or query
  // Since we have separate files for auth, this handles everything else
  let action = query.action || 'status';

  // Fallback for disconnect/send if passed via path (though client uses query param or body usually)
  // Check path segments if needed
  if (url.includes('/auth/disconnect')) action = 'disconnect';
  if (url.includes('/send-bulk')) action = 'send';

  // Handlers
  if (action === 'disconnect' && method === 'POST') {
    return res.json({ success: true, message: 'Disconnected' });
  }

  if (action === 'send' && method === 'POST') {
    const { recipients } = req.body;
    if (!recipients) return res.status(400).json({ success: false, error: 'Recipients required' });

    // Mock results
    return res.json({
      success: true,
      message: 'Bulk email sending completed',
      data: {
        total: recipients.length,
        successful: recipients.length,
        failed: 0,
        results: recipients.map(r => ({ email: r.email, status: 'sent' }))
      }
    });
  }

  // Default Status
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'mock_client_id';
  const isRealAuth = GOOGLE_CLIENT_ID !== 'mock_client_id';

  return res.json({
    success: true,
    message: 'Mass Mailer API is active (Filesystem Routing)',
    data: {
      authenticated: true,
      email: isRealAuth ? 'Connected via Google OAuth' : 'demo@example.com',
      authMode: isRealAuth ? 'production' : 'demo'
    }
  });
}
