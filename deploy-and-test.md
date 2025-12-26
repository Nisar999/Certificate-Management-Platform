# Quick Deploy and Test Guide

## Step 1: Commit Your Changes

```bash
git add .
git commit -m "Fix 404 OAuth error and add professional 404 page"
git push
```

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI (Fastest)

```bash
# Install Vercel CLI if you haven't
npm install -g vercel

# Login
vercel login

# Deploy to production
vercel --prod
```

### Option B: Using Git Integration

If your Vercel project is connected to Git:
1. Push your changes (already done in Step 1)
2. Vercel will automatically deploy
3. Check the Vercel dashboard for deployment status

## Step 3: Configure Environment Variables

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add these variables:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `GOOGLE_CLIENT_ID` | Your Google Client ID | Production |
   | `GOOGLE_CLIENT_SECRET` | Your Google Client Secret | Production |

5. Click "Save" for each
6. **Important**: Redeploy after adding variables

   ```bash
   vercel --prod
   ```

## Step 4: Update Google OAuth Settings

1. Go to https://console.cloud.google.com/
2. Select your project
3. Go to "APIs & Services" → "Credentials"
4. Click on your OAuth 2.0 Client ID
5. Under "Authorized redirect URIs", add:
   ```
   https://your-app-name.vercel.app/api/mass-mail/auth/google/callback
   ```
   (Replace `your-app-name` with your actual Vercel URL)
6. Click "Save"

## Step 5: Test the Application

### Test 1: Homepage
1. Visit `https://your-app-name.vercel.app`
2. ✅ Should load the homepage successfully

### Test 2: Navigation
1. Click through all menu items
2. ✅ All pages should load without errors

### Test 3: 404 Page
1. Visit `https://your-app-name.vercel.app/nonexistent-page`
2. ✅ Should show the new professional 404 page
3. ✅ "Return to Home" button should work
4. ✅ Quick links should work

### Test 4: OAuth Flow (The Main Fix!)
1. Go to "Mass Mailer" page
2. Click "Sign in with Google"
3. ✅ Should redirect to Google login (not 404!)
4. Sign in with your Google account
5. Grant permissions
6. ✅ Should redirect back to your app with success message
7. ✅ Should show "Connected" status

## Troubleshooting

### Still Getting 404 on OAuth?

**Check 1: Deployment Status**
```bash
vercel ls
```
Make sure your latest deployment is active.

**Check 2: Environment Variables**
```bash
vercel env ls
```
Verify your environment variables are set.

**Check 3: Vercel Logs**
```bash
vercel logs
```
Check for any errors during the OAuth flow.

**Check 4: Google Console**
- Verify redirect URI matches exactly
- Check that all required scopes are enabled
- Ensure your email is added as a test user (if in testing mode)

### Environment Variables Not Working?

After adding environment variables, you MUST redeploy:
```bash
vercel --prod
```

### Build Failures?

Check the build logs:
```bash
vercel logs --follow
```

Or view in the Vercel dashboard under "Deployments" → Click on deployment → "Building"

## Quick Test Commands

### Test Local Build
```bash
cd client
npm run build
```
Should complete without errors.

### Test Local Server
```bash
# Terminal 1
cd server
npm start

# Terminal 2
cd client
npm start
```
Visit http://localhost:3000

### Test API Endpoint
```bash
curl https://your-app-name.vercel.app/api/mass-mail
```
Should return JSON with status information.

## Success Checklist

- [ ] Code committed and pushed
- [ ] Deployed to Vercel successfully
- [ ] Environment variables configured
- [ ] Redeployed after adding environment variables
- [ ] Google OAuth redirect URI updated
- [ ] Homepage loads correctly
- [ ] All navigation links work
- [ ] 404 page displays for invalid routes
- [ ] OAuth flow completes successfully
- [ ] Can authenticate with Google
- [ ] No console errors in browser

## What Was Fixed

1. **OAuth 404 Error**: Fixed routing in `api/mass-mail.js` to handle path-based URLs
2. **Vercel Rewrites**: Added proper URL rewrites in `vercel.json`
3. **404 Page**: Created professional NotFound component
4. **Documentation**: Added comprehensive setup guides

## Next Steps After Successful Deployment

1. **Test Email Sending**: Try sending a test email through Mass Mailer
2. **Monitor Logs**: Keep an eye on Vercel logs for any issues
3. **Set Up Alerts**: Configure Vercel to notify you of deployment failures
4. **Custom Domain**: (Optional) Add a custom domain in Vercel settings
5. **Team Access**: (Optional) Invite team members in Vercel dashboard

## Support

If you encounter issues:

1. Check [404_FIX_SUMMARY.md](./404_FIX_SUMMARY.md) for detailed fix information
2. Review [OAUTH_SETUP.md](./OAUTH_SETUP.md) for OAuth configuration
3. Read [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for deployment help
4. Check Vercel logs: `vercel logs`
5. Verify Google Cloud Console settings

## Useful Commands

```bash
# View deployments
vercel ls

# View logs
vercel logs

# View environment variables
vercel env ls

# Remove a deployment
vercel rm [deployment-url]

# Open project in browser
vercel open

# View project info
vercel inspect
```

## Congratulations! 🎉

If all tests pass, your application is now fully deployed with working OAuth authentication!
