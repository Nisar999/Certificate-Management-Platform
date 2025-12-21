import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './ExportButton.css';

const ExportButton = ({ reportType, filters, label = "Export Data" }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const exportData = async (format) => {
    setIsExporting(true);
    setShowOptions(false);

    try {
      const response = await axios.post(`${API_BASE}/reports/export`, {
        reportType,
        format,
        filters
      }, {
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or create default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.${format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`${format.toUpperCase()} export completed successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export ${format.toUpperCase()} file`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-button-container">
      <button
        className="export-button"
        onClick={() => setShowOptions(!showOptions)}
        disabled={isExporting}
      >
        {isExporting ? (
          <>
            <span className="spinner"></span>
            Exporting...
          </>
        ) : (
          <>
            📥 {label}
          </>
        )}
      </button>

      {showOptions && (
        <div className="export-options">
          <button
            className="export-option"
            onClick={() => exportData('csv')}
            disabled={isExporting}
          >
            📄 Export as CSV
          </button>
          <button
            className="export-option"
            onClick={() => exportData('xlsx')}
            disabled={isExporting}
          >
            📊 Export as Excel
          </button>
          <button
            className="export-option"
            onClick={() => exportData('json')}
            disabled={isExporting}
          >
            📋 Export as JSON
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton;