import React, { useState, useEffect } from 'react';
import { templateAPI } from '../services/api';
import TemplateSelector from '../components/TemplateSelector';
import EventCategorySelector from '../components/EventCategorySelector';
import { LoadingSpinner, EmptyState, Button } from '../components';
import './TemplateManagement.css';

const TemplateManagement = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [filterCategories, setFilterCategories] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categories: [],
    filePath: '',
    templateData: null
  });

  useEffect(() => {
    fetchTemplates();
  }, [filterCategories]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterCategories.length > 0) {
        params.category = filterCategories[0]; // API supports single category filter
      }
      
      const response = await templateAPI.getAllTemplates(params);
      setTemplates(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }
    
    if (formData.categories.length === 0) {
      setError('At least one category is required');
      return;
    }

    try {
      setLoading(true);
      await templateAPI.createTemplate(formData);
      
      // Reset form and refresh templates
      setFormData({
        name: '',
        description: '',
        categories: [],
        filePath: '',
        templateData: null
      });
      setShowCreateForm(false);
      await fetchTemplates();
      setError(null);
    } catch (err) {
      console.error('Failed to create template:', err);
      setError(err.response?.data?.error?.message || 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTemplate = async (e) => {
    e.preventDefault();
    
    if (!editingTemplate) return;

    try {
      setLoading(true);
      await templateAPI.updateTemplate(editingTemplate.id, formData);
      
      // Reset form and refresh templates
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        categories: [],
        filePath: '',
        templateData: null
      });
      await fetchTemplates();
      setError(null);
    } catch (err) {
      console.error('Failed to update template:', err);
      setError(err.response?.data?.error?.message || 'Failed to update template');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      setLoading(true);
      await templateAPI.deleteTemplate(templateId);
      await fetchTemplates();
      setError(null);
    } catch (err) {
      console.error('Failed to delete template:', err);
      setError(err.response?.data?.error?.message || 'Failed to delete template');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      categories: template.categories || [],
      filePath: template.filePath || '',
      templateData: template.templateData
    });
    setShowCreateForm(true);
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
    setShowCreateForm(false);
    setFormData({
      name: '',
      description: '',
      categories: [],
      filePath: '',
      templateData: null
    });
    setError(null);
  };

  const renderTemplateForm = () => (
    <div className="template-form-overlay">
      <div className="template-form">
        <div className="form-header">
          <h3>{editingTemplate ? 'Edit Template' : 'Create New Template'}</h3>
          <button 
            type="button" 
            onClick={handleCancelEdit}
            className="close-btn"
          >
            ×
          </button>
        </div>

        <form onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}>
          <div className="form-group">
            <label htmlFor="templateName">Template Name *</label>
            <input
              id="templateName"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter template name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="templateDescription">Description</label>
            <textarea
              id="templateDescription"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter template description"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Event Categories *</label>
            <EventCategorySelector
              selectedCategories={formData.categories}
              onCategoriesChange={(categories) => setFormData({ ...formData, categories })}
              multiple={true}
            />
          </div>

          <div className="form-group">
            <label htmlFor="templateFilePath">File Path</label>
            <input
              id="templateFilePath"
              type="text"
              value={formData.filePath}
              onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
              placeholder="Enter template file path (optional)"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={handleCancelEdit} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="template-management">
      <div className="page-header">
        <h1>Template Management</h1>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="create-btn"
          disabled={loading}
        >
          Create New Template
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="dismiss-btn">×</button>
        </div>
      )}

      <div className="filters-section">
        <div className="filter-group">
          <label>Filter by Categories:</label>
          <EventCategorySelector
            selectedCategories={filterCategories}
            onCategoriesChange={setFilterCategories}
            multiple={true}
          />
          {filterCategories.length > 0 && (
            <button 
              onClick={() => setFilterCategories([])}
              className="clear-filters-btn"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="templates-section">
        <h2>Available Templates ({templates.length})</h2>
        
        {loading ? (
          <LoadingSpinner 
            size="medium" 
            color="primary" 
            message="Loading templates..." 
          />
        ) : templates.length === 0 ? (
          <EmptyState
            icon={filterCategories.length > 0 ? "🔍" : "📄"}
            title={filterCategories.length > 0 ? 'No Templates Found' : 'No Templates Available'}
            description={
              filterCategories.length > 0 
                ? `No templates found for selected categories: ${filterCategories.join(', ')}. Try adjusting your filters or create a new template for these categories.`
                : 'Get started by creating your first template. Templates help you standardize your email campaigns and certificates across different event categories.'
            }
            action={
              filterCategories.length === 0 ? (
                <Button 
                  variant="primary"
                  onClick={() => setShowCreateForm(true)}
                >
                  Create Your First Template
                </Button>
              ) : (
                <Button 
                  variant="secondary"
                  onClick={() => setFilterCategories([])}
                >
                  Clear Filters
                </Button>
              )
            }
          />
        ) : (
          <div className="templates-grid">
            {templates.map((template) => (
              <div key={template.id} className="template-card">
                <div className="template-header">
                  <h3>{template.name}</h3>
                  <div className="template-actions">
                    <button 
                      onClick={() => handleEditTemplate(template)}
                      className="edit-btn"
                      title="Edit template"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="delete-btn"
                      title="Delete template"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {template.description && (
                  <p className="template-description">{template.description}</p>
                )}

                <div className="template-categories">
                  <strong>Categories:</strong>
                  <div className="category-tags">
                    {template.categories.map((category) => (
                      <span key={category} className="category-tag">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>

                {template.filePath && (
                  <div className="template-file">
                    <strong>File:</strong> {template.filePath.split('/').pop()}
                  </div>
                )}

                <div className="template-meta">
                  <span className={`status ${template.isActive ? 'active' : 'inactive'}`}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="created-date">
                    Created: {new Date(template.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="template-selector-demo">
        <h2>Template Selection Preview</h2>
        <p>This shows how templates will appear in the batch creation process:</p>
        <TemplateSelector
          selectedTemplateId={null}
          onTemplateChange={() => {}} // Demo only
          eventCategories={filterCategories}
          disabled={false}
        />
      </div>

      {showCreateForm && renderTemplateForm()}
    </div>
  );
};

export default TemplateManagement;