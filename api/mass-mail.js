// Vercel serverless function for Mass Mailer API
// Replaces local file storage with Supabase and real Gmail sending
import { google } from 'googleapis';
import { supabase } from './utils/supabaseClient';
import AdmZip from 'adm-zip';
import csv from 'csv-parser';
import { Readable } from 'stream';
import Busboy from 'busboy';

export const config = {
  api: {
    bodyParser: false, // Disable default body parser to handle multipart/form-data
  },
};

export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, query } = req;
  const action = query.action || 'status';

  // Environment Config
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const BASE_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (req.headers.origin || 'http://localhost:3000');
  const REDIRECT_URI = `${BASE_URL}/api/mass-mail?action=callback`;

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );

  // --- HELPER: Get Tokens from Supabase ---
  async function getStoredTokens() {
    const { data, error } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('id', 'gmail_token')
      .single();

    if (error || !data || !data.access_token) return null;
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      scope: data.scope,
      token_type: data.token_type,
      expiry_date: data.expiry_date
    };
  }

  // --- HELPER: Save Tokens to Supabase ---
  async function saveTokens(tokens) {
    const { error } = await supabase
      .from('oauth_tokens')
      .upsert({
        id: 'gmail_token',
        ...tokens,
        updated_at: new Date().toISOString()
      });

    if (error) console.error('Error saving tokens:', error);
    return !error;
  }

  try {
    // ==========================================
    // AUTH FLOW
    // ==========================================

    // 1. Initiate Auth
    if (action === 'auth' && method === 'GET') {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Critical for refresh token
        scope: [
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ],
        prompt: 'consent'
      });
      return res.redirect(authUrl);
    }

    // 2. Auth Callback
    if (action === 'callback' && method === 'GET') {
      const { code, error } = query;

      if (error) {
        return res.redirect(`${BASE_URL}/mass-mailer?auth=error&reason=${encodeURIComponent(error)}`);
      }

      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      await saveTokens(tokens);

      return res.redirect(`${BASE_URL}/mass-mailer?auth=success`);
    }

    // 3. Auth Status
    if (action === 'status' && method === 'GET') {
      const tokens = await getStoredTokens();
      return res.json({
        success: true,
        data: {
          authenticated: !!tokens,
          email: tokens ? 'Connected via Google' : null
        }
      });
    }

    // ==========================================
    // SENDING FLOW (Multipart Upload)
    // ==========================================
    if (action === 'send' && method === 'POST') {
      const tokens = await getStoredTokens();
      if (!tokens) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }

      oauth2Client.setCredentials(tokens);

      // Parse Multipart Form Data
      const busboy = Busboy({ headers: req.headers });
      const buffers = {};
      const fields = {};

      return new Promise((resolve, reject) => {
        busboy.on('file', (fieldname, file, info) => {
          const chunks = [];
          file.on('data', (data) => chunks.push(data));
          file.on('end', () => {
            buffers[fieldname] = Buffer.concat(chunks);
            buffers[`${fieldname}_info`] = info;
          });
        });

        busboy.on('field', (fieldname, val) => {
          fields[fieldname] = val;
        });

        busboy.on('finish', async () => {
          try {
            const { subject, body, senderDisplayName } = fields;
            const csvBuffer = buffers['csvfile'];
            const zipBuffer = buffers['zipfile'];

            if (!csvBuffer || !zipBuffer || !subject || !body) {
              res.status(400).json({ success: false, message: 'Missing required fields or files' });
              return resolve();
            }

            // Parse ZIP
            const zip = new AdmZip(zipBuffer);
            const zipEntries = zip.getEntries(); // Array of ZipEntry

            // Parse CSV
            const recipients = [];
            const stream = Readable.from(csvBuffer.toString());

            await new Promise((resolveParse, rejectParse) => {
              stream
                .pipe(csv())
                .on('data', (data) => recipients.push(data))
                .on('end', resolveParse)
                .on('error', rejectParse);
            });

            // Send Emails
            const results = [];
            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

            // Get user email for From header
            let userEmail = '';
            try {
              const userInfo = await google.oauth2({ version: 'v2', auth: oauth2Client }).userinfo.get();
              userEmail = userInfo.data.email;
            } catch (e) { console.error('Failed to get user email', e); }

            for (const recipient of recipients) {
              const email = recipient.Email || recipient.email || recipient.Mail;
              const name = recipient.Name || recipient.name;
              const certId = recipient['Certificate ID'] || recipient.Certificate_ID || recipient.certificateId;

              if (!email || !certId) {
                results.push({ email, status: 'SKIPPED', error: 'Missing email or ID' });
                continue;
              }

              // Find connection in ZIP
              const certEntry = zipEntries.find(entry =>
                entry.name.toLowerCase().includes(certId.toLowerCase()) && !entry.isDirectory
              );

              if (!certEntry) {
                results.push({ email, status: 'FAILED', error: 'Certificate not found in ZIP' });
                continue;
              }

              // Prepare Email
              const attachmentData = certEntry.getData().toString('base64');
              const emailContent = [
                `To: ${email}`,
                `Subject: ${subject}`,
                `From: "${senderDisplayName || 'Certificate System'}" <${userEmail}>`,
                'MIME-Version: 1.0',
                'Content-Type: multipart/mixed; boundary="boundary_123"',
                '',
                '--boundary_123',
                'Content-Type: text/html; charset=utf-8',
                '',
                body.replace(/{Name}/g, name).replace(/{CertificateID}/g, certId),
                '',
                '--boundary_123',
                `Content-Type: application/pdf; name="${certEntry.name}"`,
                'Content-Transfer-Encoding: base64',
                `Content-Disposition: attachment; filename="${certEntry.name}"`,
                '',
                attachmentData,
                '--boundary_123--'
              ].join('\n');

              const encodedMessage = Buffer.from(emailContent)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

              try {
                await gmail.users.messages.send({
                  userId: 'me',
                  requestBody: { raw: encodedMessage }
                });
                results.push({ email, status: 'SENT' });

                // Optional: Log to Supabase
                await supabase.from('email_logs').insert({
                  recipient_email: email,
                  certificate_id: certId,
                  status: 'SENT'
                });

              } catch (sendError) {
                console.error(`Failed to send to ${email}`, sendError);
                results.push({ email, status: 'FAILED', error: sendError.message });
              }

              // Rate limit 
              await new Promise(r => setTimeout(r, 500));
            }

            res.json({
              success: true,
              message: `Processed ${recipients.length} recipients`,
              data: { results }
            });
            resolve();

          } catch (processError) {
            console.error('Processing error:', processError);
            res.status(500).json({ success: false, error: processError.message });
            resolve();
          }
        });

        busboy.on('error', (e) => {
          console.error('Busboy error:', e);
          res.status(500).json({ success: false, error: e.message });
          resolve();
        });

        req.pipe(busboy);
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
