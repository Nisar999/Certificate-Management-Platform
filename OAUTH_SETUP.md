# Google OAuth Setup Guide

This guide will help you set up Google OAuth for the Mass Mailer feature.

## Prerequisites

- A Google Cloud Platform account
- Your application deployed on Vercel (or running locally)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "Certificate Management Platform")
4. Click "Create"

## Step 2: Enable Gmail API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click on it and press "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (unless you have a Google Workspace)
3. Click "Create"
4. Fill in the required fields:
   - **App name**: Certificate Management Platform
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click "Save and Continue"
6. On the "Scopes" page, click "Add or Remove Scopes"
7. Add these scopes:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
8. Click "Save and Continue"
9. Add test users (your email) if in testing mode
10. Click "Save and Continue"

## Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Enter a name (e.g., "Mass Mailer OAuth")
5. Add Authorized JavaScript origins:
   - For local: `http://localhost:3000`
   - For production: `https://your-app.vercel.app`
6. Add Authorized redirect URIs:
   - For local: `http://localhost:5000/api/mass-mail/auth/google/callback`
   - For production: `https://your-app.vercel.app/api/mass-mail/auth/google/callback`
7. Click "Create"
8. **Save your Client ID and Client Secret** - you'll need these!

## Step 5: Configure Environment Variables

### For Local Development

1. Copy `.env.example` to `server/.env`
2. Add your credentials:
   ```env
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/mass-mail/auth/google/callback
   ```

### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add these variables:
   - `GOOGLE_CLIENT_ID`: Your Google Client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google Client Secret
   - `GOOGLE_REDIRECT_URI`: `https://your-app.vercel.app/api/mass-mail/auth/google/callback`
4. Click "Save"
5. Redeploy your application

## Step 6: Test the OAuth Flow

1. Navigate to the Mass Mailer page
2. Click "Sign in with Google"
3. You should be redirected to Google's consent screen
4. Grant the requested permissions
5. You should be redirected back to your app with authentication success

## Troubleshooting

### 404 Error on OAuth Callback

**Problem**: Getting "404 - Page Not Found" when redirected back from Google.

**Solution**: 
- Verify the redirect URI in Google Cloud Console matches exactly: `https://your-app.vercel.app/api/mass-mail/auth/google/callback`
- Make sure you've deployed the latest code to Vercel
- Check that `vercel.json` has the correct rewrites configuration

### "redirect_uri_mismatch" Error

**Problem**: Google shows an error about redirect URI mismatch.

**Solution**:
- The redirect URI in your code must exactly match what's configured in Google Cloud Console
- Check for trailing slashes, http vs https, and exact domain names
- Update the redirect URI in Google Cloud Console if needed

### "Access Denied" Error

**Problem**: Google shows "Access denied" or "This app isn't verified".

**Solution**:
- If in testing mode, make sure your email is added as a test user
- For production, you'll need to verify your app with Google (or keep it in testing mode for internal use)

### Environment Variables Not Working

**Problem**: OAuth not working after setting environment variables.

**Solution**:
- Redeploy your Vercel application after adding environment variables
- Check that variable names match exactly (case-sensitive)
- Verify variables are set in the correct environment (Production/Preview/Development)

## Security Best Practices

1. **Never commit credentials**: Keep `.env` files in `.gitignore`
2. **Use environment variables**: Always use environment variables for sensitive data
3. **Rotate secrets regularly**: Change your client secret periodically
4. **Limit scopes**: Only request the Gmail permissions you actually need
5. **Monitor usage**: Check Google Cloud Console for unusual API usage

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
