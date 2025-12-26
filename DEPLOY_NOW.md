# Quick Deployment Guide

## The Fix is Complete! 🎉

Your frontend and backend are now properly integrated. All 404 errors should be resolved.

## Deploy to Vercel (Recommended)

### Option 1: Using Vercel CLI

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Deploy to production
vercel --prod
```

### Option 2: Using Git Push

```bash
# Commit the changes
git add .
git commit -m "Fix: Add missing API endpoints for frontend integration"
git push origin main
```

If your Vercel project is connected to your Git repository, it will automatically deploy.

## Test Your Deployment

After deployment, test these URLs (replace `your-app` with your actual domain):

1. **Health Check**:
   ```
   https://your-app.vercel.app/api/health
   ```

2. **Certificates API**:
   ```
   https://your-app.vercel.app/api/certificates
   ```

3. **Email Campaigns**:
   ```
   https://your-app.vercel.app/api/emails/campaigns
   ```

4. **Reports Dashboard**:
   ```
   https://your-app.vercel.app/api/reports/dashboard
   ```

5. **Frontend Pages** (should all load without 404 errors):
   - https://your-app.vercel.app/
   - https://your-app.vercel.app/participants
   - https://your-app.vercel.app/templates
   - https://your-app.vercel.app/mass-mailer
   - https://your-app.vercel.app/reports

## What to Expect

✅ **Working**:
- All pages load without 404 errors
- Navigation works correctly
- API endpoints respond with mock data
- No console errors for missing endpoints

⚠️ **Mock Data**:
- Templates show sample data
- Batches are empty initially
- Reports show demo statistics
- Email campaigns show sample campaigns

## Local Development

To run locally with the full server:

```bash
# Terminal 1: Start the backend server
cd server
npm install
npm start

# Terminal 2: Start the frontend
cd client
npm install
npm start
```

Then update `client/.env.local`:
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Next Steps

1. **Deploy Now**: Run `vercel --prod` to deploy
2. **Test Pages**: Visit each page and verify no 404 errors
3. **Add Real Data**: Connect to a database for persistence
4. **Implement Features**: Add real certificate generation, email sending, etc.

## Troubleshooting

### Still Getting 404 Errors?

1. **Clear Browser Cache**: Hard refresh with Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

2. **Check Vercel Logs**:
   ```bash
   vercel logs
   ```

3. **Verify Deployment**:
   ```bash
   vercel ls
   ```

4. **Check Environment**: Make sure you're on the production deployment

### API Not Responding?

1. Check the Vercel function logs in your dashboard
2. Verify the `vercel.json` configuration is correct
3. Ensure all API files are in the `/api` directory

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Vercel function logs
3. Verify the API endpoint URLs match what the frontend is calling
4. Review `INTEGRATION_FIX.md` for detailed information

---

**Ready to deploy?** Run: `vercel --prod`
