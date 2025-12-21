import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30 seconds timeout for file uploads
});

// Certificate API
export const certificateAPI = {
  uploadTemplate: (file) => {
    const formData = new FormData();
    formData.append('template', file);
    return api.post('/certificates/upload-template', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  generateSingle: (data) => {
    return api.post('/certificates/generate', data);
  },

  generateBulk: (excelFile, templatePath, textConfig) => {
    const formData = new FormData();
    formData.append('excelFile', excelFile);
    formData.append('templatePath', templatePath);
    formData.append('textConfig', JSON.stringify(textConfig));
    return api.post('/certificates/bulk-generate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  downloadCertificate: (certificatePath) => {
    return api.get(`/${certificatePath}`, {
      responseType: 'blob'
    });
  },

  downloadCertificateById: (certificateId) => {
    return api.get(`/certificates/download/${certificateId}`, {
      responseType: 'blob'
    });
  },

  downloadCertificatesZip: (certificates) => {
    return api.post('/certificates/download-zip', { certificates }, {
      responseType: 'blob'
    });
  },

  generateBatchCertificates: (data) => {
    return api.post('/certificates/generate', data);
  }
};

// Batch API
export const batchAPI = {
  getAllBatches: (params = {}) => {
    return api.get('/certificates/batches', { params });
  },

  getBatch: (batchId) => {
    return api.get(`/certificates/batch/${batchId}`);
  },

  createBatch: (participants, batchData) => {
    return api.post('/certificates/batch', { participants, batchData });
  },

  updateBatch: (batchId, updateData) => {
    return api.put(`/certificates/batch/${batchId}`, updateData);
  },

  deleteBatch: (batchId) => {
    return api.delete(`/certificates/batch/${batchId}`);
  }
};

// Participant API
export const participantAPI = {
  uploadParticipantFile: (file) => {
    const formData = new FormData();
    formData.append('participantFile', file);
    return api.post('/certificates/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  getBatchParticipants: (batchId) => {
    return api.get(`/certificates/batch/${batchId}`);
  },

  updateParticipant: (participantId, updateData) => {
    return api.put(`/certificates/participant/${participantId}`, updateData);
  },

  exportParticipantsCSV: (batchId) => {
    return api.get(`/certificates/batch/${batchId}/export/csv`, {
      responseType: 'blob'
    });
  },

  exportParticipantsExcel: (batchId) => {
    return api.get(`/certificates/batch/${batchId}/export/excel`, {
      responseType: 'blob'
    });
  }
};

// Template API
export const templateAPI = {
  getAllTemplates: (params = {}) => {
    return api.get('/certificates/templates', { params });
  },

  getTemplate: (templateId) => {
    return api.get(`/certificates/templates/${templateId}`);
  },

  createTemplate: (templateData) => {
    return api.post('/certificates/templates', templateData);
  },

  updateTemplate: (templateId, updateData) => {
    return api.put(`/certificates/templates/${templateId}`, updateData);
  },

  deleteTemplate: (templateId) => {
    return api.delete(`/certificates/templates/${templateId}`);
  },

  getEventCategories: () => {
    return api.get('/certificates/event-categories');
  }
};

// Email API
export const emailAPI = {
  getAuthUrl: () => {
    return api.get('/email/auth-url');
  },

  authenticateWithCode: (code) => {
    return api.post('/email/auth-callback', { code });
  },

  sendBulkEmails: (data) => {
    return api.post('/email/send-bulk', data);
  }
};

// Error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;

// Reports API
export const reportsAPI = {
  getDashboardStats: (params = {}) => {
    return api.get('/reports/dashboard', { params });
  },

  getCertificateReports: (params = {}) => {
    return api.get('/reports/certificates', { params });
  },

  getEmailReports: (params = {}) => {
    return api.get('/reports/emails', { params });
  },

  getCategoryStats: (params = {}) => {
    return api.get('/reports/categories', { params });
  },

  exportReportData: (reportType, format, filters = {}) => {
    return api.post('/reports/export', {
      reportType,
      format,
      filters
    }, {
      responseType: 'blob'
    });
  },

  // Legacy endpoints for backward compatibility
  getGenerationStats: () => {
    return api.get('/reports/stats');
  },

  getGenerationRecords: (params = {}) => {
    return api.get('/reports/records', { params });
  },

  getCloudStatus: () => {
    return api.get('/reports/cloud-status');
  },

  exportLegacyCSV: (params = {}) => {
    return api.get('/reports/export', { 
      params,
      responseType: 'blob'
    });
  }
};