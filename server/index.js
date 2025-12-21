const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

// Import database utilities
const { testConnection } = require('./utils/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Certificate Management Platform API is running!',
    version: '2.0.0',
    features: ['Certificate Generation', 'Email Campaigns', 'AWS Integration', 'Database Management']
  });
});

// API root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Certificate Management Platform API',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      certificates: '/api/certificates',
      massMailer: '/api/mass-mail',
      reports: '/api/reports',
      aws: '/api/aws',
      ids: '/api/ids',
      emails: '/api/emails',
      health: '/api/health'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({
      status: 'healthy',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to check database tables
app.get('/api/debug/tables', async (req, res) => {
  try {
    const { sequelize } = require('./models');
    const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table';");
    res.json({ tables: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check templates directly
app.get('/api/debug/templates', async (req, res) => {
  try {
    const { sequelize } = require('./models');
    const [results] = await sequelize.query("SELECT * FROM templates;");
    res.json({ templates: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check participants
app.get('/api/debug/participants', async (req, res) => {
  try {
    const { sequelize } = require('./models');
    const [results] = await sequelize.query("SELECT COUNT(*) as count FROM participants;");
    const [participants] = await sequelize.query("SELECT * FROM participants LIMIT 5;");
    res.json({ count: results[0].count, sample: participants });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import route handlers
const certificateRoutes = require('./routes/certificates');
const reportRoutes = require('./routes/reports');
const awsRoutes = require('./routes/aws');
const idRoutes = require('./routes/ids');
const emailRoutes = require('./routes/emails');
const massMailerRoutes = require('./routes/massMailer');

// API routes
app.use('/api/certificates', certificateRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/aws', awsRoutes);
app.use('/api/ids', idRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/mass-mail', massMailerRoutes);
app.use('/api/auth', massMailerRoutes); // For OAuth routes

// OAuth callback is handled in massMailer routes

// Initialize database connection
async function initializeServer() {
  try {
    console.log('Initializing Certificate Management Platform...');
    
    // Test database connection
    const dbConnected = await testConnection();
    if (dbConnected) {
      console.log('✓ Database connection established');
    } else {
      console.warn('⚠ Database connection failed - running in fallback mode');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ API endpoints available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  const { closeConnection } = require('./utils/database');
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  const { closeConnection } = require('./utils/database');
  await closeConnection();
  process.exit(0);
});

// Start the server
initializeServer();