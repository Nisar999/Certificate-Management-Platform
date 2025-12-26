# Quick Test Guide for Mass Mailer

## Immediate Testing (No Deployment Needed)

### Option 1: Use Demo Mode

1. Open your browser to the Mass Mailer page
2. Click **"Demo Mode (Skip Auth)"** button
3. You should see:
   - ✅ Gmail Connected Successfully!
   - The email form appears
   - No 404 errors

This bypasses authentication entirely and lets you test the UI.

### Option 2: Test API Endpoint Directly

Open your browser or use curl to test:

```bash
# Test status endpoint
curl http://localhost:3000/api/mass-mail

# Or in production
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

## Deploy and Test Full Flow

### 1. Deploy to Vercel

```bash
# Commit changes
git add .
git commit -m "Fix: Mass Mailer authentication endpoints"

# Deploy
vercel --prod
```

### 2. Test Authentication Flow

1. **Navigate to Mass Mailer**:
   ```
   https://your-app.vercel.app/mass-mailer
   ```

2. **Click "Sign in with Google"**:
   - Should redirect to `/api/mass-mail?action=auth`
   - Then redirect to Google OAuth page
   - **Note**: Without Google OAuth credentials, you'll see an error from Google

3. **Use Demo Mode Instead**:
   - Click "Demo Mode (Skip Auth)"
   - This works without any Google setup

### 3. Test Disconnect

1. After authentication (or demo mode)
2. Click the **"Disconnect"** button
3. Should return to the sign-in screen
4. No 404 errors

## What Each Button Does

### "Sign in with Google" Button
```javascript
// Redirects to:
/api/mass-mail?action=auth
  ↓
Google OAuth page
  ↓
/api/mass-mail/auth/google/callback
  ↓
Back to /mass-mailer?auth=success
```

### "Demo Mode (Skip Auth)" Button
```javascript
// Simply sets:
setIsAuthenticated(true)
// No API calls, no redirects
```

### "Disconnect" Button
```javascript
// Calls:
POST /api/mass-mail/auth/disconnect
  ↓
Returns success
  ↓
setIsAuthenticated(false)
```

## Expected Behavior

### ✅ Working Correctly

- No 404 errors when clicking any button
- Demo mode works immediately
- Disconnect button works
- Status endpoint returns valid JSON
- Page loads without errors

### ⚠️ Expected Limitations (Without Google OAuth Setup)

- "Sign in with Google" will redirect to Google but fail
- Actual email sending won't work
- Token management is simulated

### ❌ Issues to Watch For

- 404 errors → Check Vercel deployment logs
- Redirect loops → Check BASE_URL in mass-mail.js
- CORS errors → Check CORS headers in mass-mail.js

## Quick Verification Checklist

- [ ] Mass Mailer page loads without errors
- [ ] "Demo Mode" button works
- [ ] Form appears after demo mode
- [ ] "Disconnect" button works
- [ ] No 404 errors in browser console
- [ ] API endpoint responds: `/api/mass-mail`

## Browser Console Commands

Open browser console (F12) and run:

```javascript
// Test status endpoint
fetch('/api/mass-mail')
  .then(r => r.json())
  .then(console.log);

// Test disconnect endpoint
fetch('/api/mass-mail/auth/disconnect', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

## Common Issues and Solutions

### Issue: 404 on Sign In
**Solution**: Use Demo Mode for now, or set up Google OAuth credentials

### Issue: Redirect Loop
**Solution**: Check that BASE_URL in `api/mass-mail.js` is correct

### Issue: CORS Error
**Solution**: CORS headers are already set, but verify in mass-mail.js

### Issue: Function Timeout
**Solution**: Increase maxDuration in vercel.json (currently 10 seconds)

## Setting Up Real Google OAuth (Optional)

If you want real authentication:

1. **Google Cloud Console**:
   - Create project
   - Enable Gmail API
   - Create OAuth 2.0 credentials
   - Add redirect URI: `https://your-app.vercel.app/api/mass-mail/auth/google/callback`

2. **Vercel Environment Variables**:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

3. **Redeploy**:
   ```bash
   vercel --prod
   ```

## Success Criteria

✅ **The fix is working if**:
1. No 404 errors appear
2. Demo mode works
3. Disconnect works
4. API endpoints respond correctly

You don't need real Google OAuth for the fix to be verified!

---

**Quick Test**: Just click "Demo Mode" and verify the form appears!
