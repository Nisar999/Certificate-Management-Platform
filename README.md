# Certificate Management Platform

A comprehensive, cloud-integrated certificate generation and email distribution platform with advanced analytics and batch processing capabilities.

## 🚀 Features

### Core Functionality
- **Automated Certificate Generation**: Create professional certificates with unique ID generation
- **Batch Processing**: Handle large volumes with Excel/CSV import
- **Email Campaigns**: Mass email distribution with delivery tracking
- **Template Management**: Support for multiple event categories and templates
- **Real-time Analytics**: Comprehensive reporting and dashboard

### Cloud Integration
- **AWS S3**: Secure certificate and template storage
- **AWS SES**: Reliable email delivery service
- **PostgreSQL**: Robust database with migration system
- **Auto-scaling**: ECS Fargate deployment ready

### Advanced Features
- **Unique ID Generation**: SOU-YYYYMMDD-MMM-XXXXX format with collision detection
- **Event Categorization**: Technical, Non-technical, Spiritual, Administrative, Humanitarian, STEM
- **Delivery Tracking**: Real-time email delivery status and retry mechanisms
- **Export Capabilities**: CSV and Excel export for all data

## 📁 Project Structure

```
certificate-management-platform/
├── client/                     # React frontend application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API service layer
│   │   └── utils/             # Utility functions
│   └── public/                # Static assets
├── server/                    # Node.js backend API
│   ├── config/               # Configuration files
│   │   ├── database.js       # Database configuration
│   │   └── aws.js           # AWS services configuration
│   ├── models/              # Sequelize database models
│   ├── migrations/          # Database migration files
│   ├── routes/              # API route handlers
│   │   ├── certificates.js  # Certificate generation routes
│   │   ├── aws.js          # AWS integration routes
│   │   ├── ids.js          # ID generation routes
│   │   └── reports.js      # Analytics and reporting routes
│   ├── services/           # Business logic services
│   │   ├── certificateService.js
│   │   ├── s3Service.js
│   │   ├── sesService.js
│   │   └── idGenerationService.js
│   └── utils/              # Utility functions
└── .kiro/                  # Kiro specification files
    └── specs/
        └── certificate-management-platform/
```

## 🛠 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- AWS Account (for cloud features)
- npm or yarn

### Installation

1. **Clone and Install**:
```bash
git clone <repository-url>
cd certificate-management-platform
npm run install-all
```

2. **Database Setup**:
```bash
# Create database
createdb certificate_manager_dev

# Run migrations
npm run db:setup
```

3. **Environment Configuration**:
```bash
# Copy and configure environment variables
cp server/.env.example server/.env
# Edit server/.env with your configuration
```

4. **Start Development**:
```bash
npm run dev
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

## ⚙️ Configuration

### Environment Variables

Configure `server/.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=certificate_manager_dev
DB_USER=postgres
DB_PASSWORD=your_password

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your-certificate-bucket
AWS_SES_REGION=us-east-1

# Gmail OAuth2 (Legacy Support)
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_USER=your_email@gmail.com
```

### Database Schema

The platform uses PostgreSQL with the following main tables:
- `batches` - Certificate generation batches
- `participants` - Individual certificate recipients
- `email_campaigns` - Email distribution campaigns
- `templates` - Certificate templates
- `email_delivery_logs` - Email delivery tracking
- `certificate_id_logs` - ID generation audit trail

## 📊 API Documentation

### Certificate Management
```
POST   /api/certificates/upload          # Upload participant data
POST   /api/certificates/generate        # Generate certificate batch
GET    /api/certificates/batch/:id       # Get batch details
PUT    /api/certificates/batch/:id       # Update batch
DELETE /api/certificates/batch/:id       # Delete batch
```

### ID Generation
```
POST   /api/ids/generate                 # Generate single ID
POST   /api/ids/bulk-generate            # Generate multiple IDs
GET    /api/ids/validate/:id             # Validate ID uniqueness
GET    /api/ids/stats                    # Get generation statistics
```

### Email Campaigns
```
POST   /api/emails/campaign              # Create email campaign
POST   /api/emails/send/:campaignId      # Send campaign
GET    /api/emails/campaign/:id/status   # Get campaign status
GET    /api/emails/delivery-stats/:id    # Get delivery statistics
```

### AWS Integration
```
POST   /api/aws/s3/upload               # Upload to S3
GET    /api/aws/s3/presigned-url/:key   # Get presigned URL
GET    /api/aws/ses/statistics          # Get SES statistics
POST   /api/aws/ses/send-bulk           # Send bulk emails
```

### Analytics & Reporting
```
GET    /api/reports/dashboard            # Dashboard statistics
GET    /api/reports/certificates         # Certificate reports
GET    /api/reports/emails              # Email campaign reports
POST   /api/reports/export              # Export report data
```

## 🏗 Development

### Database Operations
```bash
# Create new migration
cd server && npx sequelize-cli migration:generate --name migration-name

# Run migrations
npm run db:migrate

# Rollback migration
cd server && npm run db:migrate:undo

# Reset database
npm run db:reset
```

### Testing
```bash
# Run server tests
cd server && npm test

# Run client tests
cd client && npm test
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format
```

## 🚀 Deployment

### AWS ECS Deployment
```bash
# Build and push to ECR
docker build -t certificate-management-platform .
docker tag certificate-management-platform:latest <ecr-repo-url>:latest
docker push <ecr-repo-url>:latest
```

### Environment Setup
1. **RDS PostgreSQL**: Set up managed database
2. **S3 Buckets**: Create buckets for certificates and templates
3. **SES Configuration**: Verify domains and email addresses
4. **ECS Service**: Deploy containerized application
5. **Load Balancer**: Configure ALB with SSL

### Production Configuration
- Enable SSL/TLS encryption
- Configure CloudWatch logging
- Set up automated backups
- Implement monitoring and alerting
- Configure auto-scaling policies

## 📈 Usage Guide

### Certificate Generation Workflow
1. **Create Batch**: Define event categories and select template
2. **Upload Data**: Import participant data via CSV/Excel
3. **Generate IDs**: Automatic unique certificate ID generation
4. **Generate Certificates**: Batch PDF generation with cloud storage
5. **Email Campaign**: Send certificates to participants
6. **Track Delivery**: Monitor email delivery status and analytics

### Data Format Requirements

**Excel/CSV columns**:
- `Sr_no`: Serial number (optional)
- `Name`: Participant full name (required)
- `Email`: Valid email address (required)
- `Certificate_ID`: Auto-generated if not provided
- `Category`: Event category (optional)

### Event Categories
- **Technical**: Programming, software development, technical workshops
- **Non-technical**: Soft skills, management, general workshops
- **Spiritual**: Religious, meditation, spiritual development
- **Administrative**: Organizational, administrative tasks
- **Humanitarian**: Community service, social work
- **STEM**: Science, Technology, Engineering, Mathematics

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Development Guidelines
- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Follow semantic versioning
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact the development team

## 🔄 Version History

- **v2.0.0**: Complete platform rewrite with AWS integration
- **v1.0.0**: Initial certificate generator with basic features

---

**Built with ❤️ for efficient certificate management and distribution**