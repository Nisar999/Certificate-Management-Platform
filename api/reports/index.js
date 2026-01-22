// Vercel serverless function for Reports API
// Now dynamic, fetching real data from Supabase 'email_logs'
import { supabase } from '../utils/supabaseClient';

export default async function handler(req, res) {
  // Config CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, url } = req;
  const urlPath = url.split('?')[0];

  try {
    // ----------------------------------------------------
    // GET /api/reports/dashboard
    // Returns aggregate stats from 'email_logs'
    // ----------------------------------------------------
    if (method === 'GET' && urlPath === '/api/reports/dashboard') {
      const { count: totalEmails, error: countError } = await supabase
        .from('email_logs')
        .select('*', { count: 'exact', head: true });

      const { count: sentEmails } = await supabase
        .from('email_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'SENT');

      const { count: failedEmails } = await supabase
        .from('email_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'FAILED');

      if (countError) throw countError;

      // Calculate success rate
      const successRate = totalEmails > 0
        ? ((sentEmails / totalEmails) * 100).toFixed(1)
        : 0;

      // Real data structure
      const realStats = {
        totalCertificates: 0, // Placeholder if you add certificate table later
        totalBatches: 0,      // Placeholder
        totalParticipants: totalEmails || 0,
        successRate: parseFloat(successRate),
        categoriesBreakdown: {
          'Email Campaigns': totalEmails || 0
        },
        monthlyGeneration: [] // Can implement aggregation if needed
      };

      return res.json({
        success: true,
        data: realStats
      });
    }

    // ----------------------------------------------------
    // GET /api/reports/emails
    // Detailed email stats
    // ----------------------------------------------------
    if (method === 'GET' && urlPath === '/api/reports/emails') {
      const { data: logs, error } = await supabase
        .from('email_logs')
        .select('status, sent_at')
        .order('sent_at', { ascending: false });

      if (error) throw error;

      const total = logs.length;
      const sent = logs.filter(l => l.status === 'SENT').length;
      // We don't track opens/clicks in this simple implementation yet
      const deliveryRate = total > 0 ? ((sent / total) * 100).toFixed(1) : 0;

      const emailStats = {
        totalEmailsSent: total,
        deliveryRate: parseFloat(deliveryRate),
        openRate: 0, // Needs tracking pixel implementation
        clickRate: 0,
        bounceRate: 0,
        recentCampaigns: [] // Could group by date/batch if we added batch_id to schema
      };

      return res.json({
        success: true,
        data: emailStats
      });
    }

    // Default "Not Found" for other endpoints not yet ported
    return res.status(404).json({
      success: false,
      message: 'Endpoint not implemented in dynamic version yet',
      availableEndpoints: [
        '/api/reports/dashboard',
        '/api/reports/emails'
      ]
    });

  } catch (error) {
    console.error('Reports API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
