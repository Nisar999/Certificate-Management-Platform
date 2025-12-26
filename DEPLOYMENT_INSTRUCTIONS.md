# Deployment Instructions

## Current Status

✅ **Code pushed to GitHub successfully**
- Repository: https://github.com/Nisar999/Certificate-Management-Platform
- Branch: main
- Latest commit: eb1b8fe

## Vercel Deployment Issue

The Vercel CLI deployment is failing with build errors, but the code builds successfully locally.

### What's Been Fixed

1. ✅ Frontend-backend integration (all API endpoints added)
2. ✅ Mass mailer authentication flow
3. ✅ Certificate and email API endpoints
4. ✅ Code pushed to GitHub

### Deployment Options

#### Option 1: Deploy via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your project: `certificate-management-platform`
3. Go to Settings → Git
4. Ensure it's connected to your GitHub repository
5. Go to Deployments
6. Click "Redeploy" on the latest deployment
7. Or wait for automatic deployment from GitHub push

#### Option 2: Manual Vercel CLI Deployment

If the dashboard doesn't work, try:

```bash
# From project root
vercel --prod
```

If it asks about configuration, use these settings:
- Build Command: `cd client && npm install && npm run build`
- Output Directory: `client/build`
- Install Command: `npm install`

#### Option 3: Deploy Frontend and Backend Separately

**Frontend (Vercel)**:
```bash
cd client
vercel --prod
```

**Backend (Railway/Render/Heroku)**:
Deploy the `/server` directory to a Node.js hosting service

Then update `client/src/services/api.js`:
```javascript
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-url.com/api'  // Your backend URL
  : 'http://localhost:5000/api';
```

## Troubleshooting

### Build Fails on Vercel

**Possible causes**:
1. Node version mismatch
2. Dependency conflicts
3. Memory limits

**Solutions**:
1. Check Vercel dashboard logs for specific error
2. Try setting Node version in package.json:
   ```json
   "engines": {
     "node": "18.x"
   }
   ```
3. Increase build timeout in Vercel settings

### API Endpoints Return 404

If deployed but APIs don't work:
1. Check that `/api` folder is included in deployment
2. Verify `vercel.json` rewrites are correct
3. Check function logs in Vercel dashboard

## Testing After Deployment

Once deployed, test these URLs:

1. **Frontend**: `https://your-app.vercel.app/`
2. **Health Check**: `https://your-app.vercel.app/api/health`
3. **Certificates API**: `https://your-app.vercel.app/api/certificates`
4. **Mass Mailer**: `https://your-app.vercel.app/api/mass-mail`
5. **Reports**: `https://your-app.vercel.app/api/reports/dashboard`

## What's Working Locally

✅ Server runs on `http://localhost:5000`
✅ Client runs on `http://localhost:3000`
✅ All API endpoints respond correctly
✅ Mass mailer authentication works
✅ Build completes successfully

## Next Steps

1. **Check Vercel Dashboard**: Look for automatic deployment from GitHub
2. **Review Build Logs**: Check what specific error is causing the build to fail
3. **Alternative**: Consider deploying to a different platform if Vercel continues to fail

## Support

If you need help:
1. Check Vercel dashboard for detailed error logs
2. Review the inspect URLs from failed deployments
3. Contact Vercel support if it's a platform issue

---

**Note**: The code is production-ready and works locally. The issue is specifically with the Vercel build process.
