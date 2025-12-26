# Deployment Guide - Certificate Management Platform

This guide covers deploying the Certificate Management Platform to Vercel with full OAuth support.

## Quick Deploy to Vercel

### Prerequisites

- Node.js 18+ installed
- A Vercel account
- Google OAuth credentials (see [OAUTH_SETUP.md](./OAUTH_SETUP.md))

### Step 1: Prepare Your Repository

1. Make sure all changes are committed:
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push
   ```

### Step 2: Deploy to Vercel

#### Option A: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel --prod
   ```

4. Follow the prompts and note your deployment URL

#### Option B: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your Git repository
4. Vercel will auto-detect the configuration from `vercel.json`
5. Click "Deploy"

### Step 3: Configure Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to "Settings" → "Environment Variables"
3. Add the following variables:

   ```
   NODE_ENV=production
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   ```

4. Click "Save" for each variable
5. **Important**: Redeploy after adding environment variables

### Step 4: Update Google OAuth Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Click on your OAuth 2.0 Client ID
4. Add your Vercel URL to "Authorized redirect URIs":
   ```
   https://your-app-name.vercel.app/api/mass-mail/auth/google/callback
   ```
5. Click "Save"

### Step 5: Test Your Deployment

1. Visit your Vercel URL: `https://your-app-name.vercel.app`
2. Navigate to "Mass Mailer"
3. Click "Sign in with Google"
4. Complete the OAuth flow
5. Test sending emails

## Architecture Overview

### Frontend (React)
- Built with Create React App
- Deployed as static files from `client/build`
- Routes handled by React Router

### Backend (Serverless Functions)
- API endpoints deployed as Vercel serverless functions
- Located in `/api` directory
- OAuth handling in `api/mass-mail.js`

### Routing Configuration

The `vercel.json` file configures URL rewrites:

```json
{
  "rewrites": [
    {
      "source": "/api/mass-mail/auth/google/callback",
      "destination": "/api/mass-mail"
    },
    {
      "source": "/api/mass-mail/auth/google",
      "destination": "/api/mass-mail"
    },
    {
      "source": "/api/mass-mail/(.*)",
      "destination": "/api/mass-mail"
    },
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This ensures:
- OAuth routes are properly handled
- API calls are routed to serverless functions
- Frontend routes fall back to React Router

## Troubleshooting

### 404 Error on OAuth Callback

**Symptoms**: After Google authentication, you see "404 - Page Not Found"

**Causes**:
1. Vercel rewrites not configured correctly
2. Serverless function not handling the route
3. Redirect URI mismatch

**Solutions**:
1. Verify `vercel.json` has the correct rewrites (see above)
2. Check that `api/mass-mail.js` handles path-based routing
3. Ensure redirect URI in Google Console matches exactly
4. Redeploy after making changes

### Environment Variables Not Working

**Symptoms**: OAuth fails with "mock_client_id" or authentication errors

**Solutions**:
1. Verify variables are set in Vercel dashboard
2. Check variable names match exactly (case-sensitive)
3. **Redeploy** after adding/changing variables
4. Check the deployment logs for errors

### Build Failures

**Symptoms**: Deployment fails during build

**Solutions**:
1. Check build logs in Vercel dashboard
2. Verify `package.json` scripts are correct
3. Ensure all dependencies are listed
4. Try building locally first:
   ```bash
   cd client
   npm install
   npm run build
   ```

### CORS Errors

**Symptoms**: API calls fail with CORS errors

**Solutions**:
1. Verify CORS headers in `api/mass-mail.js`
2. Check that API calls use the correct base URL
3. Ensure frontend is calling the right domain

## Local Development

To test the deployment setup locally:

1. Install dependencies:
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example server/.env
   # Edit server/.env with your credentials
   ```

3. Start the development servers:
   ```bash
   # Terminal 1 - Backend
   cd server
   npm start

   # Terminal 2 - Frontend
   cd client
   npm start
   ```

4. Access the app at `http://localhost:3000`

## Production Checklist

Before deploying to production:

- [ ] All environment variables configured in Vercel
- [ ] Google OAuth credentials created and configured
- [ ] Redirect URIs updated in Google Cloud Console
- [ ] Code committed and pushed to Git
- [ ] Build tested locally
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Custom domain configured (optional)
- [ ] Error monitoring set up (optional)

## Monitoring and Logs

### View Deployment Logs

1. Go to Vercel dashboard
2. Click on your project
3. Select "Deployments"
4. Click on a deployment to view logs

### View Runtime Logs

1. Go to Vercel dashboard
2. Click on your project
3. Select "Logs" tab
4. Filter by function or time range

### Common Log Messages

- `OAuth error details`: Check Google OAuth configuration
- `Database connection failed`: Normal for serverless (uses SQLite in /tmp)
- `CORS error`: Check API CORS headers

## Performance Optimization

### Frontend
- Static assets cached by Vercel CDN
- Code splitting with React lazy loading
- Image optimization with Vercel Image Optimization

### Backend
- Serverless functions auto-scale
- Cold start optimization with minimal dependencies
- Response caching where appropriate

## Security

### Best Practices Implemented

1. **HTTPS Only**: Enforced by Vercel
2. **Environment Variables**: Secrets stored securely
3. **CORS**: Configured to allow only your domain
4. **Security Headers**: Set in `vercel.json`
5. **OAuth**: Secure token handling

### Additional Recommendations

1. Enable Vercel's security features
2. Set up rate limiting for API endpoints
3. Monitor for unusual activity
4. Regularly update dependencies
5. Use Vercel's Web Application Firewall (WAF)

## Rollback

If you need to rollback a deployment:

1. Go to Vercel dashboard
2. Click "Deployments"
3. Find the previous working deployment
4. Click "..." → "Promote to Production"

## Support

- **Vercel Documentation**: https://vercel.com/docs
- **Google OAuth**: https://developers.google.com/identity/protocols/oauth2
- **Project Issues**: Check the GitHub repository

## Next Steps

After successful deployment:

1. Set up custom domain (optional)
2. Configure email notifications
3. Set up monitoring and alerts
4. Add team members in Vercel
5. Configure preview deployments for branches
