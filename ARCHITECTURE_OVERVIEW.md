# Application Architecture Overview

## Current Structure

```
certificate-management-platform/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── pages/            # Page components
│   │   │   ├── Home.js
│   │   │   ├── ParticipantManagement.js
│   │   │   ├── TemplateManagement.js
│   │   │   ├── MassMailer.js
│   │   │   ├── EmailCampaigns.js
│   │   │   └── Reports.js
│   │   ├── components/       # Reusable UI components
│   │   ├── services/
│   │   │   └── api.js        # API client (axios)
│   │   └── App.js            # Main app with routing
│   └── build/                # Production build output
│
├── server/                    # Express.js Backend (Full Implementation)
│   ├── routes/               # API route handlers
│   ├── services/             # Business logic
│   ├── models/               # Database models
│   └── index.js              # Express server entry
│
├── api/                       # Vercel Serverless Functions
│   ├── certificates/
│   │   └── index.js          # Certificate API endpoints
│   ├── emails/
│   │   └── index.js          # Email API endpoints
│   ├── reports/
│   │   └── index.js          # Reports API endpoints
│   ├── mass-mail.js          # Mass mailer endpoint
│   └── health.js             # Health check endpoint
│
└── vercel.json               # Vercel deployment config
```

## Request Flow (Vercel Deployment)

```
User Browser
    ↓
React App (client/build)
    ↓
API Call (axios)
    ↓
vercel.json rewrites
    ↓
Serverless Function (/api/*)
    ↓
Response (JSON)
    ↓
React Component Updates
```

## API Architecture

### Frontend API Client (`client/src/services/api.js`)

**Base URL Configuration**:
```javascript
const API_BASE = process.env.NODE_ENV === 'production' 
  ? '/api'  // Vercel serverless functions
  : 'http://localhost:5000/api';  // Local Express server
```

**API Modules**:
- `certificateAPI` - Certificate generation and management
- `batchAPI` - Batch operations
- `participantAPI` - Participant management
- `templateAPI` - Template CRUD operations
- `emailAPI` - Email authentication and sending
- `massMailAPI` - Mass mailer functionality
- `reportsAPI` - Analytics and reporting

### Backend Endpoints

#### Certificates API (`/api/certificates`)
- Template management (CRUD)
- Batch management (CRUD)
- Participant management
- Certificate generation
- File uploads/downloads
- Event categories

#### Emails API (`/api/emails`)
- OAuth authentication
- Campaign management
- Bulk email sending
- Campaign progress tracking
- Statistics and analytics

#### Reports API (`/api/reports`)
- Dashboard statistics
- Certificate reports
- Email reports
- Category statistics
- Data export

#### Mass Mail API (`/api/mass-mail`)
- Google OAuth integration
- Bulk email sending
- Authentication status

## Data Flow Examples

### Creating a Certificate Batch

```
1. User uploads participant file
   → POST /api/certificates/upload
   → Returns parsed participants

2. User selects template
   → GET /api/certificates/templates
   → Returns available templates

3. User creates batch
   → POST /api/certificates/batch
   → Creates batch with participants

4. System generates certificates
   → POST /api/certificates/generate
   → Generates PDFs for each participant

5. User downloads certificates
   → POST /api/certificates/download-zip
   → Returns ZIP file with all certificates
```

### Sending Email Campaign

```
1. User creates campaign
   → POST /api/emails/campaign
   → Creates campaign record

2. User starts sending
   → POST /api/emails/send/:id
   → Initiates email sending

3. Frontend polls progress
   → GET /api/emails/campaign/:id/progress
   → Returns current progress

4. User views statistics
   → GET /api/emails/campaign/:id/statistics-summary
   → Returns delivery stats
```

## Deployment Strategies

### Current: Vercel Serverless (Recommended)

**Pros**:
- Automatic scaling
- Zero server management
- Global CDN
- Free tier available
- Easy deployment

**Cons**:
- 10-second function timeout
- Stateless (no persistent storage)
- Cold starts
- Limited file system access

**Best For**: 
- Production deployments
- High traffic applications
- Global distribution

### Alternative: Full Server Deployment

**Platforms**: Railway, Render, AWS Elastic Beanstalk, DigitalOcean

**Pros**:
- No timeout limits
- Persistent file system
- WebSocket support
- Background jobs
- Full control

**Cons**:
- Server management required
- Scaling complexity
- Higher costs
- Manual deployment

**Best For**:
- Development
- Complex processing
- Long-running tasks
- File-heavy operations

## Environment Variables

### Frontend (`client/.env`)
```
REACT_APP_API_URL=http://localhost:5000/api  # Development only
```

### Backend (`server/.env`)
```
PORT=5000
DATABASE_URL=postgresql://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...
```

### Vercel (Environment Variables in Dashboard)
```
DATABASE_URL=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_S3_BUCKET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Technology Stack

### Frontend
- **Framework**: React 18
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **UI Components**: Custom component library
- **Charts**: Chart.js + react-chartjs-2
- **Notifications**: react-hot-toast
- **File Upload**: react-dropzone
- **Build Tool**: Create React App

### Backend (Server)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Sequelize ORM (PostgreSQL/MySQL/SQLite)
- **File Storage**: AWS S3
- **Email**: AWS SES / Gmail API
- **PDF Generation**: pdf-lib / puppeteer
- **Authentication**: OAuth 2.0

### Backend (Serverless)
- **Runtime**: Node.js 18
- **Platform**: Vercel Functions
- **Storage**: Mock data (needs database integration)
- **Timeout**: 10 seconds

## Security Considerations

1. **CORS**: Enabled for all origins (configure for production)
2. **Headers**: Security headers set in `vercel.json`
3. **Authentication**: OAuth 2.0 for email services
4. **File Uploads**: Validation needed for production
5. **Rate Limiting**: Not implemented (add for production)
6. **Input Validation**: Basic validation in place

## Performance Optimizations

1. **Code Splitting**: React lazy loading
2. **Image Optimization**: Vercel automatic optimization
3. **Caching**: Browser caching via headers
4. **CDN**: Vercel global CDN
5. **Compression**: Automatic gzip/brotli

## Monitoring & Debugging

### Vercel Dashboard
- Function logs
- Analytics
- Performance metrics
- Error tracking

### Browser DevTools
- Network tab for API calls
- Console for errors
- React DevTools for component debugging

### Logging
```javascript
// Frontend
console.log('API Error:', error.response?.data || error.message);

// Backend
console.error('API Error:', error);
```

## Future Enhancements

1. **Database Integration**: Add PostgreSQL/MongoDB
2. **Real File Storage**: Implement S3/Blob storage
3. **Email Service**: Integrate SendGrid/SES
4. **PDF Generation**: Add real certificate generation
5. **Authentication**: Add user authentication
6. **WebSockets**: Real-time progress updates
7. **Caching**: Redis for performance
8. **Queue System**: Bull/BullMQ for background jobs
9. **Testing**: Jest + React Testing Library
10. **CI/CD**: GitHub Actions for automated testing

## Troubleshooting Guide

### 404 Errors
- Check `vercel.json` rewrites
- Verify API endpoint exists
- Check function logs in Vercel dashboard

### Timeout Errors
- Optimize function execution time
- Consider background jobs for long tasks
- Use streaming for large responses

### CORS Errors
- Verify CORS headers in API functions
- Check allowed origins
- Ensure credentials are handled correctly

### Build Errors
- Check `vercel.json` buildCommand
- Verify all dependencies are installed
- Check Node.js version compatibility

---

**Need Help?** Check the logs, review the code, and test endpoints individually.
