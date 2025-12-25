// Vercel serverless function for certificates API
const path = require('path');
const fs = require('fs');

// Mock database for Vercel (since SQLite resets on deploy)
let mockData = {
  templates: [
    {
      id: 1,
      name: 'Technical Certificate Template',
      description: 'Standard template for technical events',
      categories: ['Technical'],
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Non-Technical Certificate Template',
      description: 'Standard template for non-technical events',
      categories: ['Non-technical'],
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ],
  batches: [],
  participants: []
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, url } = req;
  const urlPath = url.split('?')[0];

  try {
    // Route handling
    if (method === 'GET' && urlPath === '/api/certificates') {
      return res.json({
        message: 'Certificates API',
        endpoints: {
          templates: '/api/certificates/templates',
          batches: '/api/certificates/batches',
          'event-categories': '/api/certificates/event-categories'
        },
        status: 'active'
      });
    }

    // Get all templates
    if (method === 'GET' && urlPath === '/api/certificates/templates') {
      const { category, isActive } = req.query;
      let templates = mockData.templates;

      if (isActive !== undefined) {
        templates = templates.filter(t => t.isActive === (isActive === 'true'));
      }

      if (category) {
        templates = templates.filter(t => t.categories.includes(category));
      }

      return res.json({
        success: true,
        data: templates
      });
    }

    // Get template by ID
    if (method === 'GET' && urlPath.match(/^\/api\/certificates\/templates\/\d+$/)) {
      const templateId = parseInt(urlPath.split('/').pop());
      const template = mockData.templates.find(t => t.id === templateId);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template not found'
          }
        });
      }

      return res.json({
        success: true,
        data: template
      });
    }

    // Create template
    if (method === 'POST' && urlPath === '/api/certificates/templates') {
      const { name, description, categories } = req.body;

      if (!name || !categories || !Array.isArray(categories) || categories.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name and categories are required'
          }
        });
      }

      const validCategories = ['Technical', 'Non-technical', 'Spiritual', 'Administrative', 'Humanitarian', 'STEM'];
      const invalidCategories = categories.filter(cat => !validCategories.includes(cat));
      
      if (invalidCategories.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid categories: ${invalidCategories.join(', ')}`
          }
        });
      }

      const newTemplate = {
        id: Math.max(...mockData.templates.map(t => t.id), 0) + 1,
        name: name.trim(),
        description: description?.trim() || null,
        categories,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      mockData.templates.push(newTemplate);

      return res.status(201).json({
        success: true,
        message: 'Template created successfully',
        data: newTemplate
      });
    }

    // Get event categories
    if (method === 'GET' && urlPath === '/api/certificates/event-categories') {
      const categories = [
        { value: 'Technical', label: 'Technical', description: 'Technical workshops, coding sessions, and tech talks' },
        { value: 'Non-technical', label: 'Non-technical', description: 'Soft skills, leadership, and general workshops' },
        { value: 'Spiritual', label: 'Spiritual', description: 'Religious and spiritual development activities' },
        { value: 'Administrative', label: 'Administrative', description: 'Organizational and administrative tasks' },
        { value: 'Humanitarian', label: 'Humanitarian', description: 'Community service and humanitarian activities' },
        { value: 'STEM', label: 'STEM', description: 'Science, Technology, Engineering, and Mathematics activities' }
      ];

      return res.json({
        success: true,
        data: categories
      });
    }

    // Get all batches
    if (method === 'GET' && urlPath === '/api/certificates/batches') {
      const { page = 1, limit = 10, status, eventCategory } = req.query;
      let batches = mockData.batches;

      if (status) {
        batches = batches.filter(b => b.status === status);
      }

      if (eventCategory) {
        batches = batches.filter(b => b.eventCategories.includes(eventCategory));
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const paginatedBatches = batches.slice(offset, offset + parseInt(limit));

      return res.json({
        success: true,
        data: {
          batches: paginatedBatches,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(batches.length / parseInt(limit)),
            totalItems: batches.length,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    }

    // Certificate generation endpoint (simplified for demo)
    if (method === 'POST' && urlPath === '/api/certificates/generate') {
      const { templatePath, name, certificateId, textConfig, category = 'Technical' } = req.body;
      
      if (!name || !certificateId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name and certificate ID are required'
          }
        });
      }

      // Simulate certificate generation
      const mockCertificate = {
        certificateId,
        name,
        category,
        localPath: `/tmp/certificates/${certificateId}.pdf`,
        cloudUrl: `https://example.com/certificates/${certificateId}.pdf`,
        generatedAt: new Date().toISOString()
      };

      return res.json({
        success: true,
        message: 'Certificate generated successfully',
        data: mockCertificate
      });
    }

    // Default 404 for unmatched routes
    return res.status(404).json({
      success: false,
      error: {
        code: 'ENDPOINT_NOT_FOUND',
        message: 'API endpoint not found',
        availableEndpoints: [
          'GET /api/certificates',
          'GET /api/certificates/templates',
          'POST /api/certificates/templates',
          'GET /api/certificates/event-categories',
          'GET /api/certificates/batches',
          'POST /api/certificates/generate'
        ]
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An internal server error occurred',
        details: error.message
      }
    });
  }
}