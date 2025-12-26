# Mass Mailer Sign-In Fix

## Problem

When clicking "Sign in with Google" in the Mass Mailer page, users were getting a 404 error.

## Root Cause

The Mass Mailer authentication flow has multiple endpoints that need to be properly routed:

1. `/api/mass-mail?action=auth` - Initiates Google OAuth
2. `/api/mass-mail/auth/google` - Alternative auth endpoint
3. `/api/mass-mail/auth/google/callback` - OAuth callback from Google
4. `/api/mass-mail/auth/disconnect` - Disconnect from Gmail

The serverless function wasn't handling the `disconnect` action, and the routing needed clarification.

## What Was Fixed

### 1. Updated `api/mass-mail.js`

**Added disconnect endpoint handling**:
```javascript
// Disconnect from Gmail
if (action === 'disconnect' && method === 'POST') {
  return res.json({
    success: true,
    message: 'Successfully disconnected from Gmail',
    data: {
      disconnectedAt: new Date().toISOString()
    }
  });
}
```

**Enhanced path parsing** to handle `/auth/disconnect` route:
```javascript
if (pathSegments.includes('auth')) {
  const authIndex = pathSegments.indexOf('auth');
  const nextSegment = pathSegments[authIndex + 1];
  
  if (nextSegment === 'google') {
    const callbackSegment = pathSegments[authIndex + 2];
    action = callbackSegment === 'callback' ? 'callback' : 'auth';
  } else if (nextSegment === 'disconnect') {
    action = 'disconnect';
  }
}
```

### 2. Updated `vercel.json`

**Added disconnect route**:
```json
{
  "source": "/api/mass-mail/auth/disconnect",
  "destination": "/api/mass-mail"
}
```

## How the Authentication Flow Works

### Step 1: User Clicks "Sign in with Google"
```
Frontend: handleGoogleAuth()
  ↓
Redirects to: /api/mass-mail?action=auth
  ↓
Serverless function detects action=auth
  ↓
Redirects to: Google OAuth consent page
```

### Step 2: User Grants Permission
```
Google OAuth page
  ↓
User clicks "Allow"
  ↓
Google redirects to: /api/mass-mail/auth/google/callback?code=...
```

### Step 3: Callback Processing
```
Serverless function receives callback
  ↓
Detects action=callback
  ↓
Processes authorization code
  ↓
Redirects to: /mass-mailer?auth=success&code=...
```

### Step 4: Frontend Updates
```
Frontend detects auth=success in URL
  ↓
Sets isAuthenticated = true
  ↓
Shows success toast
  ↓
Cleans up URL parameters
```

## Testing the Fix

### Local Testing

1. **Start the development server**:
   ```bash
   cd client
   npm start
   ```

2. **Navigate to Mass Mailer**:
   ```
   http://localhost:3000/mass-mailer
   ```

3. **Click "Sign in with Google"**:
   - Should redirect to `/api/mass-mail?action=auth`
   - In development, this will try to connect to `http://localhost:5000/api/mass-mail?action=auth`
   - You'll need the backend server running for local testing

4. **Alternative: Use Demo Mode**:
   - Click "Demo Mode (Skip Auth)" button
   - This bypasses authentication for testing

### Production Testing (Vercel)

1. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

2. **Test the authentication flow**:
   ```
   https://your-app.vercel.app/mass-mailer
   ```

3. **Click "Sign in with Google"**:
   - Should redirect to Google OAuth page
   - After granting permission, should redirect back with success

4. **Check the status endpoint**:
   ```bash
   curl https://your-app.vercel.app/api/mass-mail
   ```

   Expected response:
   ```json
   {
     "success": true,
     "message": "Mass Mailer API is working!",
     "data": {
       "authenticated": true,
       "email": "demo@example.com",
       "quotaRemaining": 500,
       "authMode": "demo"
     }
   }
   ```

## Environment Variables Required

For production Google OAuth to work, you need to set these in Vercel:

1. **GOOGLE_CLIENT_ID**: Your Google OAuth client ID
2. **GOOGLE_CLIENT_SECRET**: Your Google OAuth client secret
3. **VERCEL_URL**: Automatically set by Vercel

### How to Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Gmail API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Set authorized redirect URIs:
   ```
   https://your-app.vercel.app/api/mass-mail/auth/google/callback
   ```
6. Copy the Client ID and Client Secret
7. Add them to Vercel environment variables

## Current Behavior

### Without Google OAuth Credentials (Demo Mode)
- Status endpoint returns `authMode: "demo"`
- Authentication is simulated
- Emails won't actually be sent
- Good for testing UI/UX

### With Google OAuth Credentials (Production Mode)
- Status endpoint returns `authMode: "production"`
- Real Google OAuth flow
- Emails can be sent via Gmail API
- Requires proper token management

## Known Limitations

1. **Token Storage**: Currently, tokens are not persisted. In production, you should:
   - Store tokens in a database
   - Implement token refresh logic
   - Handle token expiration

2. **Email Sending**: The actual email sending logic is mocked. To implement:
   - Use Google Gmail API with the access token
   - Handle rate limits (Gmail has sending quotas)
   - Implement retry logic for failed sends

3. **File Processing**: ZIP and CSV file processing is not implemented in the serverless function

## Next Steps

### For Development
1. Run the full Express server for complete functionality:
   ```bash
   cd server
   npm start
   ```

2. The server has full implementation of:
   - File upload handling
   - ZIP extraction
   - CSV parsing
   - Email sending via Gmail API
   - Token management

### For Production

**Option 1: Complete Serverless Implementation**
- Add file storage (Vercel Blob or AWS S3)
- Implement ZIP/CSV processing in serverless function
- Add database for token storage
- Implement Gmail API integration

**Option 2: Use Full Server**
- Deploy the Express server separately
- Update frontend to point to server URL
- Keep Vercel for frontend only

## Troubleshooting

### Still Getting 404?

1. **Clear browser cache**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

2. **Check Vercel logs**:
   ```bash
   vercel logs --follow
   ```

3. **Verify the function is deployed**:
   ```bash
   curl https://your-app.vercel.app/api/mass-mail
   ```

4. **Check environment variables** in Vercel dashboard

### OAuth Redirect Mismatch?

1. Verify redirect URI in Google Cloud Console matches:
   ```
   https://your-app.vercel.app/api/mass-mail/auth/google/callback
   ```

2. Check VERCEL_URL environment variable

3. Ensure BASE_URL in mass-mail.js is correct

### Demo Mode Not Working?

1. Click "Demo Mode (Skip Auth)" button
2. This bypasses OAuth and sets authenticated state
3. You can test the UI without real authentication

## Files Modified

1. `api/mass-mail.js` - Added disconnect endpoint and improved routing
2. `vercel.json` - Added disconnect route rewrite
3. `MASS_MAILER_FIX.md` - This documentation

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/mass-mail` | GET | Check authentication status |
| `/api/mass-mail?action=auth` | GET | Initiate Google OAuth |
| `/api/mass-mail/auth/google` | GET | Alternative auth endpoint |
| `/api/mass-mail/auth/google/callback` | GET | OAuth callback handler |
| `/api/mass-mail/auth/disconnect` | POST | Disconnect from Gmail |
| `/api/mass-mail?action=send` | POST | Send bulk emails |

---

**Ready to test?** Deploy with: `vercel --prod`
