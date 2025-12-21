import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { batchAPI, certificateAPI } from '../services/api';
import TemplateUploader from '../components/TemplateUploader';
import TextEditor from '../components/TextEditor';
import BulkProcessor from '../components/BulkProcessor';
import { EmptyState, Button } from '../components';
import './CertificateGenerator.css';

const CertificateGenerator = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Original 3-step process state
  const [currentStep, setCurrentStep] = useState(1);
  const [templateData, setTemplateData] = useState(null);
  const [textConfig, setTextConfig] = useState({
    name: {
      x: 300,
      y: 400,
      fontSize: 36,
      fontFamily: 'Arial',
      color: { r: 0, g: 0, b: 0 },
      bold: false,
      italic: false
    },
    certificateId: {
      x: 300,
      y: 200,
      fontSize: 24,
      fontFamily: 'Arial',
      color: { r: 0, g: 0, b: 0 },
      bold: false,
      italic: false
    }
  });

  // Batch-based system state
  const [showBatchMode, setShowBatchMode] = useState(false);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [generationProgress, setGenerationProgress] = useState(null);

  const steps = [
    { number: 1, title: 'Upload Template', component: 'uploader' },
    { number: 2, title: 'Configure Text', component: 'editor' },
    { number: 3, title: 'Generate Certificates', component: 'processor' }
  ];

  const handleTemplateUpload = (data) => {
    setTemplateData(data);
    setCurrentStep(2);
  };

  const handleTextConfigSave = (config) => {
    setTextConfig(config);
    setCurrentStep(3);
  };

  const loadBatches = async () => {
    try {
      setLoading(true);
      const response = await batchAPI.getAllBatches();
      setBatches(response.data.data.batches || []);
    } catch (error) {
      toast.error('Failed to load batches');
      console.error('Error loading batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCertificates = async (batchId) => {
    try {
      setGenerating(true);
      setSelectedBatch(batchId);
      
      const response = await certificateAPI.generateBatchCertificates({ batchId });
      
      if (response.data.success) {
        toast.success('Certificates generated successfully!');
        setGenerationProgress(response.data.data);
        await loadBatches();
      } else {
        toast.error('Failed to generate certificates');
      }
    } catch (error) {
      toast.error('Failed to generate certificates');
      console.error('Certificate generation error:', error);
    } finally {
      setGenerating(false);
      setSelectedBatch(null);
    }
  };

  const switchToBatchMode = () => {
    setShowBatchMode(true);
    loadBatches();
  };

  const switchToStepMode = () => {
    setShowBatchMode(false);
  };

  // Handle navigation state from batch creation
  useEffect(() => {
    if (location.state?.batchId) {
      // If we came from batch creation, switch to batch mode and show success message
      setShowBatchMode(true);
      loadBatches();
      if (location.state.batchName) {
        toast.success(`Ready to generate certificates for "${location.state.batchName}"`);
      }
    }
  }, [location.state]);

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <TemplateUploader onUpload={handleTemplateUpload} />;
      case 2:
        return (
          <TextEditor
            templateData={templateData}
            textConfig={textConfig}
            onSave={handleTextConfigSave}
            onBack={() => setCurrentStep(1)}
          />
        );
      case 3:
        return (
          <BulkProcessor
            templateData={templateData}
            textConfig={textConfig}
            onBack={() => setCurrentStep(2)}
          />
        );
      default:
        return null;
    }
  };

  const renderBatchMode = () => (
    <div className="batch-mode">
      <div className="page-header">
        <h2>🎓 Generate from Batches</h2>
        <p>Generate certificates for existing participant batches</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading batches...</p>
        </div>
      ) : batches.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No Batches Found"
          description="You need to create participant batches before you can generate certificates. Upload participant data and create your first batch to get started."
          action={
            <Button 
              variant="primary"
              onClick={() => navigate('/participants')}
            >
              📊 Manage Participants
            </Button>
          }
        />
      ) : (
        <div className="batches-grid">
          {batches.map((batch) => (
            <div key={batch.id} className="batch-card">
              <div className="batch-header">
                <h3>{batch.name}</h3>
                <span className={`status-badge status-${batch.status}`}>
                  {batch.status}
                </span>
              </div>
              
              <div className="batch-details">
                <div className="detail-item">
                  <span className="label">Participants:</span>
                  <span className="value">{batch.participantCount || 0}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Categories:</span>
                  <span className="value">{batch.eventCategories?.join(', ') || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Created:</span>
                  <span className="value">
                    {new Date(batch.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {batch.certificatesGenerated > 0 && (
                  <div className="detail-item">
                    <span className="label">Certificates:</span>
                    <span className="value">{batch.certificatesGenerated} generated</span>
                  </div>
                )}
              </div>

              <div className="batch-actions">
                <button
                  onClick={() => handleGenerateCertificates(batch.id)}
                  disabled={generating && selectedBatch === batch.id}
                  className="btn btn-primary"
                >
                  {generating && selectedBatch === batch.id ? (
                    <>
                      <span className="spinner"></span>
                      Generating...
                    </>
                  ) : (
                    <>
                      🎓 Generate Certificates
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {generationProgress && (
        <div className="generation-results">
          <h3>Generation Results</h3>
          <div className="results-summary">
            <div className="result-stat">
              <span className="stat-number">{generationProgress.totalParticipants}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="result-stat success">
              <span className="stat-number">{generationProgress.successful}</span>
              <span className="stat-label">Success</span>
            </div>
            <div className="result-stat error">
              <span className="stat-number">{generationProgress.failed}</span>
              <span className="stat-label">Failed</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="certificate-generator">
      <div className="container">
        <div className="page-header">
          <h1>Certificate Generator</h1>
          <p>Choose your preferred method to generate certificates</p>
        </div>

        <div className="mode-selector">
          <button
            onClick={switchToStepMode}
            className={`mode-btn ${!showBatchMode ? 'active' : ''}`}
          >
            📝 Step-by-Step Generator
          </button>
          <button
            onClick={switchToBatchMode}
            className={`mode-btn ${showBatchMode ? 'active' : ''}`}
          >
            📊 Batch Generator
          </button>
        </div>

        {showBatchMode ? (
          renderBatchMode()
        ) : (
          <div className="step-mode">
            <div className="steps-indicator">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className={`step-indicator ${currentStep >= step.number ? 'active' : ''}`}
                >
                  <div className="step-number">{step.number}</div>
                  <div className="step-title">{step.title}</div>
                </div>
              ))}
            </div>

            <div className="step-content">
              {renderCurrentStep()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificateGenerator;