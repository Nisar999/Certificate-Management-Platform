# 🚀 Vercel Deployment Guide

## 🎯 **Quick Deploy (5 minutes)**

### **Option 1: Deploy via Vercel Dashboard**
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import this Git repository
4. Vercel will auto-detect the configuration
5. Click "Deploy" - Done! 🎉

### **Option 2: Deploy via Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name: certificate-management-platform
# - Directory: ./
# - Override settings? N

# Your app will be live at: https://certificate-management-platform.vercel.app
```

### **Option 3: Use PowerShell Script**
```powershell
# Run the deployment script
.\deploy-vercel.ps1
```

## 🏗️ **Architecture Overview**

### **Serverless Functions Structure**
```
api/
├── health.js                 # Health check endpoint
├── certificates/
│   └── index.js              # Certificate management API
├── reports/
│   └── index.js              # Analytics and reporting API
└── emails/
    └── index.js              # Email campaign API
```

### **API Endpoints**
- **Health**: `/api/health`
- **Certificates**: `/api/certificates/*`
- **Reports**: `/api/reports/*`
- **Emails**: `/api/emails/*`

## 🔧 **Environment Variables Setup**

After deployment, add these environment variables in Vercel Dashboard:

### **Required Variables:**
```
NODE_ENV=production
```

### **Google OAuth Configuration (Required for Mass Mailer):**
```
GOOGLE_CLIENT_ID=your_google_client_id_from_gcp_console
GOOGLE_CLIENT_SECRET=your_google_client_secret_from_gcp_console
```

### **Optional Variables:**
```
BASE_URL=https://your-custom-domain.com
# If not set, will auto-detect from VERCEL_URL or use default
```

### **How to Add Environment Variables in Vercel:**
1. Go to your Vercel Dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - **Name**: `GOOGLE_CLIENT_ID`
   - **Value**: Your actual Google Client ID from GCP Console
   - **Environment**: Production (and Preview if needed)
5. Click **Save**
6. Redeploy your project for changes to take effect

### **Getting Google OAuth Credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Gmail API**
4. Go to **APIs & Services** → **Credentials**
5. Create **OAuth 2.0 Client ID**
6. Set **Authorized JavaScript origins**: `https://your-vercel-app.vercel.app`
7. Set **Authorized redirect URIs**: `https://your-vercel-app.vercel.app/api/mass-mail/auth/callback`
8. Copy the Client ID and Client Secret to Vercel environment variables

## 📁 **Project Structure for Vercel**

```
certificate-management-platform/
├── api/                    # Vercel serverless functions
│   ├── health.js          # Health check endpoint
│   ├── certificates/      # Certificate API endpoints
│   ├── reports/           # Reports API endpoints
│   └── emails/            # Email API endpoints
├── client/                # React frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── server/                # Original server code (for reference)
├── vercel.json           # Vercel configuration
└── package.json          # Root package.json
```

## 🌟 **Features on Vercel**

### **✅ What Works:**
- ✅ **Frontend**: Full React app with all features
- ✅ **API**: All certificate, reports, and email endpoints
- ✅ **File Upload**: Template and participant file uploads (temporary)
- ✅ **PDF Generation**: Certificate creation (in-memory)
- ✅ **Mock Data**: Demonstration data for all features
- ✅ **HTTPS**: Automatic SSL certificate
- ✅ **Custom Domain**: Free custom domain support
- ✅ **Global CDN**: Fast loading worldwide

### **⚠️ Limitations:**
- **Database**: Uses mock data (resets on each deployment)
- **File Storage**: Temporary storage only (use external storage for persistence)
- **Function Timeout**: 30 seconds max per API call
- **Memory**: 1GB RAM per function

### **🔄 Production Recommendations:**
- **Database**: Use Vercel Postgres, PlanetScale, or Supabase
- **File Storage**: Use Vercel Blob, AWS S3, or Cloudinary
- **Email Service**: Use Vercel Email, SendGrid, or Resend

## 🔄 **Automatic Deployments**

Once connected to Git:
- **Push to main branch** → Automatic production deployment
- **Push to other branches** → Preview deployments
- **Pull requests** → Preview deployments with unique URLs

## 💰 **Cost: $0/month**

- ✅ **Hosting**: Free
- ✅ **Serverless Functions**: 100GB bandwidth free
- ✅ **SSL Certificate**: Free
- ✅ **Custom Domain**: Free
- ✅ **Global CDN**: Free

## 🚀 **Next Steps After Deployment**

1. **Test the deployment**: Visit your Vercel URL
2. **Set up custom domain** (optional): In Vercel dashboard
3. **Configure environment variables**: For Google OAuth, etc.
4. **Set up external database** (optional): For data persistence
5. **Configure file storage** (optional): For certificate storage

## 🆘 **Troubleshooting**

### **Build Fails:**
- Check `vercel.json` configuration
- Ensure all dependencies are in `package.json`
- Check build logs in Vercel dashboard

### **API Not Working:**
- Verify `api/` directory structure
- Check serverless function exports
- Review function logs in Vercel dashboard

### **CORS Issues:**
- All API functions include CORS headers
- Check browser network tab for errors

### **Function Timeouts:**
- Functions have 30-second timeout
- Optimize heavy operations
- Consider breaking into smaller functions

## 📊 **Monitoring & Analytics**

Vercel provides built-in:
- **Function Logs**: Real-time serverless function logs
- **Analytics**: Page views, performance metrics
- **Speed Insights**: Core Web Vitals monitoring
- **Error Tracking**: Automatic error detection

## 📞 **Support**

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
- **Serverless Functions**: [vercel.com/docs/functions](https://vercel.com/docs/functions)