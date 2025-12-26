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
        batches = batches.filter(b => b.eventCategories && b.eventCategories.includes(eventCategory));
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

    // Get batch by ID
    if (method === 'GET' && urlPath.match(/^\/api\/certificates\/batch\/\d+$/)) {
      const batchId = parseInt(urlPath.split('/').pop());
      const batch = mockData.batches.find(b => b.id === batchId);

      if (!batch) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'BATCH_NOT_FOUND',
            message: 'Batch not found'
          }
        });
      }

      return res.json({
        success: true,
        data: batch
      });
    }

    // Create batch
    if (method === 'POST' && urlPath === '/api/certificates/batch') {
      const { participants, batchData } = req.body;

      if (!participants || !Array.isArray(participants) || participants.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Participants array is required and cannot be empty'
          }
        });
      }

      const newBatch = {
        id: Math.max(...mockData.batches.map(b => b.id), 0) + 1,
        name: batchData?.name || `Batch ${Date.now()}`,
        eventName: batchData?.eventName || 'Event',
        eventCategories: batchData?.eventCategories || ['Technical'],
        templateId: batchData?.templateId || 1,
        participants: participants.map((p, idx) => ({
          id: Date.now() + idx,
          ...p,
          status: 'pending'
        })),
        status: 'pending',
        totalParticipants: participants.length,
        generatedCount: 0,
        failedCount: 0,
        createdAt: new Date().toISOString()
      };

      mockData.batches.push(newBatch);

      return res.status(201).json({
        success: true,
        message: 'Batch created successfully',
        data: newBatch
      });
    }

    // Update batch
    if (method === 'PUT' && urlPath.match(/^\/api\/certificates\/batch\/\d+$/)) {
      const batchId = parseInt(urlPath.split('/').pop());
      const batchIndex = mockData.batches.findIndex(b => b.id === batchId);

      if (batchIndex === -1) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'BATCH_NOT_FOUND',
            message: 'Batch not found'
          }
        });
      }

      mockData.batches[batchIndex] = {
        ...mockData.batches[batchIndex],
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      return res.json({
        success: true,
        message: 'Batch updated successfully',
        data: mockData.batches[batchIndex]
      });
    }

    // Delete batch
    if (method === 'DELETE' && urlPath.match(/^\/api\/certificates\/batch\/\d+$/)) {
      const batchId = parseInt(urlPath.split('/').pop());
      const batchIndex = mockData.batches.findIndex(b => b.id === batchId);

      if (batchIndex === -1) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'BATCH_NOT_FOUND',
            message: 'Batch not found'
          }
        });
      }

      mockData.batches.splice(batchIndex, 1);

      return res.json({
        success: true,
        message: 'Batch deleted successfully'
      });
    }

    // Upload participant file
    if (method === 'POST' && urlPath === '/api/certificates/upload') {
      // Mock file upload processing
      const mockParticipants = [
        { name: 'John Doe', email: 'john@example.com', certificateId: 'CERT001' },
        { name: 'Jane Smith', email: 'jane@example.com', certificateId: 'CERT002' }
      ];

      return res.json({
        success: true,
        message: 'File uploaded and processed successfully',
        data: {
          participants: mockParticipants,
          totalCount: mockParticipants.length
        }
      });
    }

    // Upload template
    if (method === 'POST' && urlPath === '/api/certificates/upload-template') {
      return res.json({
        success: true,
        message: 'Template uploaded successfully',
        data: {
          templatePath: `/uploads/templates/template_${Date.now()}.png`,
          uploadedAt: new Date().toISOString()
        }
      });
    }

    // Update participant
    if (method === 'PUT' && urlPath.match(/^\/api\/certificates\/participant\/\d+$/)) {
      const participantId = parseInt(urlPath.split('/').pop());

      return res.json({
        success: true,
        message: 'Participant updated successfully',
        data: {
          id: participantId,
          ...req.body,
          updatedAt: new Date().toISOString()
        }
      });
    }

    // Export batch participants as CSV
    if (method === 'GET' && urlPath.match(/^\/api\/certificates\/batch\/\d+\/export\/csv$/)) {
      const batchId = parseInt(urlPath.split('/')[3]);
      
      const csvContent = 'Name,Email,Certificate ID,Status\nJohn Doe,john@example.com,CERT001,completed\nJane Smith,jane@example.com,CERT002,completed';
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=batch_${batchId}_participants.csv`);
      return res.send(csvContent);
    }

    // Export batch participants as Excel
    if (method === 'GET' && urlPath.match(/^\/api\/certificates\/batch\/\d+\/export\/excel$/)) {
      const batchId = parseInt(urlPath.split('/')[3]);
      
      return res.json({
        success: true,
        message: 'Excel export not implemented in mock API',
        data: {
          downloadUrl: `/exports/batch_${batchId}_participants.xlsx`
        }
      });
    }

    // Download certificate by ID
    if (method === 'GET' && urlPath.match(/^\/api\/certificates\/download\/[\w-]+$/)) {
      const certificateId = urlPath.split('/').pop();
      
      return res.json({
        success: true,
        message: 'Certificate download not implemented in mock API',
        data: {
          certificateId,
          downloadUrl: `/certificates/${certificateId}.pdf`
        }
      });
    }

    // Download certificates as ZIP
    if (method === 'POST' && urlPath === '/api/certificates/download-zip') {
      const { certificates } = req.body;

      return res.json({
        success: true,
        message: 'ZIP download not implemented in mock API',
        data: {
          downloadUrl: `/certificates/batch_${Date.now()}.zip`,
          certificateCount: certificates?.length || 0
        }
      });
    }

    // Bulk generate certificates
    if (method === 'POST' && urlPath === '/api/certificates/bulk-generate') {
      return res.json({
        success: true,
        message: 'Bulk certificate generation started',
        data: {
          batchId: Date.now(),
          totalCertificates: 10,
          status: 'processing',
          startedAt: new Date().toISOString()
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
        requestedUrl: urlPath,
        availableEndpoints: [
          'GET /api/certificates',
          'GET /api/certificates/templates',
          'POST /api/certificates/templates',
          'GET /api/certificates/templates/:id',
          'PUT /api/certificates/templates/:id',
          'DELETE /api/certificates/templates/:id',
          'GET /api/certificates/event-categories',
          'GET /api/certificates/batches',
          'GET /api/certificates/batch/:id',
          'POST /api/certificates/batch',
          'PUT /api/certificates/batch/:id',
          'DELETE /api/certificates/batch/:id',
          'POST /api/certificates/upload',
          'POST /api/certificates/upload-template',
          'POST /api/certificates/generate',
          'POST /api/certificates/bulk-generate',
          'GET /api/certificates/download/:id',
          'POST /api/certificates/download-zip',
          'PUT /api/certificates/participant/:id',
          'GET /api/certificates/batch/:id/export/csv',
          'GET /api/certificates/batch/:id/export/excel'
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