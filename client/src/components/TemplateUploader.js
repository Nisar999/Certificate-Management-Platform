import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import toast from 'react-hot-toast';
import './TemplateUploader.css';

const TemplateUploader = ({ onUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setPreview({ url: previewUrl, name: file.name, type: file.type });

    // Upload file
    setUploading(true);
    const formData = new FormData();
    formData.append('template', file);

    try {
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await axios.post(`${API_BASE}/certificates/upload-template`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Template uploaded successfully!');
      onUpload({
        templatePath: response.data.templatePath,
        filename: response.data.filename,
        preview: previewUrl,
        originalName: file.name,
        type: file.type
      });
    } catch (error) {
      toast.error(`Upload failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  return (
    <div className="template-uploader">
      <h2>Upload Certificate Template</h2>
      <p className="subtitle">Upload your certificate template (PDF, PNG, JPG - Max 10MB)</p>

      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''} ${uploading ? 'uploading' : ''}`}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="upload-progress">
            <div className="spinner"></div>
            <p>Uploading template...</p>
          </div>
        ) : preview ? (
          <div className="preview-container">
            {preview.type === 'application/pdf' ? (
              <div className="pdf-preview">
                <div className="pdf-icon">📄</div>
                <p>{preview.name}</p>
                <span className="file-type">PDF Document</span>
              </div>
            ) : (
              <img src={preview.url} alt="Template preview" className="image-preview" />
            )}
            <div className="preview-overlay">
              <p>✓ Template Ready</p>
              <span>Click or drag to replace</span>
            </div>
          </div>
        ) : (
          <div className="upload-prompt">
            <div className="upload-icon">📁</div>
            <h3>
              {isDragActive ? 'Drop your template here' : 'Drag & drop your template'}
            </h3>
            <p>or <span className="browse-text">browse files</span></p>
            <div className="supported-formats">
              <span>Supported: PDF, PNG, JPG</span>
            </div>
          </div>
        )}
      </div>

      {preview && (
        <div className="template-info">
          <h4>Template Information</h4>
          <div className="info-grid">
            <div className="info-item">
              <label>File Name:</label>
              <span>{preview.name}</span>
            </div>
            <div className="info-item">
              <label>File Type:</label>
              <span>{preview.type}</span>
            </div>
          </div>
        </div>
      )}

      <div className="upload-tips">
        <h4>💡 Tips for best results:</h4>
        <ul>
          <li>Use high-resolution templates (300 DPI recommended)</li>
          <li>Leave clear space for name and certificate ID placement</li>
          <li>PDF templates maintain better quality when scaling</li>
          <li>Ensure template dimensions are suitable for printing</li>
        </ul>
      </div>
    </div>
  );
};

export default TemplateUploader;