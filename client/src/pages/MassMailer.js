import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import './MassMailerClean.css';
import './MassMailerMaterial.css';

const MassMailer = () => {
  const [zipFile, setZipFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [subject, setSubject] = useState('Your Certificate');
  const [bodyTemplate, setBodyTemplate] = useState('Dear {Name},\n\nPlease find attached your certificate.\n\nBest regards,\nThe Team');
  const [senderDisplayName, setSenderDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    
    // Check for auth success/error from URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      setIsAuthenticated(true);
      toast.success('Successfully authenticated with Gmail!');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('auth') === 'error') {
      const reason = urlParams.get('reason');
      let errorMessage = 'Failed to authenticate with Gmail';
      
      switch (reason) {
        case 'authorization_denied':
          errorMessage = 'Gmail authorization was denied. Please try again and grant permissions.';
          break;
        case 'no_code':
          errorMessage = 'No authorization code received from Gmail.';
          break;
        case 'token_exchange_failed':
          errorMessage = 'Failed to exchange authorization code for access token.';
          break;
        default:
          errorMessage = 'Gmail authentication failed. Please check your configuration.';
      }
      
      toast.error(errorMessage);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Use same API base logic as api.js
      const API_BASE = process.env.NODE_ENV === 'production' 
        ? '/api'  // Vercel serverless functions
        : process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(`${API_BASE}/mass-mail/status`);
      const data = await response.json();
      setIsAuthenticated(data.success && data.data.authenticated);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    }
  };

  const handleGoogleAuth = () => {
    // Use same API base logic as api.js
    const API_BASE = process.env.NODE_ENV === 'production' 
      ? '/api'  // Vercel serverless functions
      : process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    
    window.location.href = `${API_BASE}/mass-mail/auth/google`;
  };

  const handleDemoMode = () => {
    // Enable demo mode (skip authentication)
    setIsAuthenticated(true);
    toast.success('Demo mode enabled - authentication bypassed');
  };

  const handleSendEmails = async (e) => {
    e.preventDefault();
    
    if (!zipFile || !csvFile) {
      toast.error('Please select both ZIP file and CSV file');
      return;
    }

    if (!subject.trim() || !bodyTemplate.trim()) {
      toast.error('Please enter subject and email body');
      return;
    }

    setLoading(true);
    setResults(null);
    
    try {
      const formData = new FormData();
      formData.append('zipfile', zipFile);
      formData.append('csvfile', csvFile);
      formData.append('subject', subject);
      formData.append('body', bodyTemplate);
      formData.append('senderDisplayName', senderDisplayName);

      toast.loading('Sending emails...', { id: 'sending' });

      // Use same API base logic as api.js
      const API_BASE = process.env.NODE_ENV === 'production' 
        ? '/api'  // Vercel serverless functions
        : process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(`${API_BASE}/mass-mail/send-bulk`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        // Check if response is CSV (successful)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/csv')) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `email_results_${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          
          toast.success('Emails sent successfully! Results downloaded.', { id: 'sending' });
          
          // Reset form
          setZipFile(null);
          setCsvFile(null);
          setSenderDisplayName('');
          
          // Show basic results (you could parse CSV for more details)
          setResults({
            total: 'Check CSV',
            sent: 'Check CSV', 
            failed: 'Check CSV'
          });
        } else {
          const data = await response.json();
          toast.error(data.message || 'Failed to send emails', { id: 'sending' });
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to send emails', { id: 'sending' });
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      toast.error('Network error. Please try again.', { id: 'sending' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mass-mailer">
      <div className="container">
        <header className="header-section">
          <h1><span aria-hidden="true">📧</span> Mass Email Sender</h1>
          <p className="subtitle">Send certificates to multiple recipients via Gmail</p>
        </header>

        {!isAuthenticated ? (
          <section className="auth-section" aria-labelledby="auth-title">
            <div className="md-card md-card-elevated">
              <div className="md-card-content text-center">
                <h2 id="auth-title" className="md-card-title">
                  <span aria-hidden="true">🔐</span> Gmail Authentication Required
                </h2>
                <p className="md-card-subtitle mb-8">Connect your Gmail account to send mass emails</p>
                <div className="space-y-4">
                  <button 
                    className="btn btn-primary btn-lg md-button-raised"
                    onClick={handleGoogleAuth}
                    aria-describedby="google-auth-desc"
                  >
                    <span className="google-icon" aria-hidden="true">🔐</span>
                    Sign in with Google
                  </button>
                  <p id="google-auth-desc" className="sr-only">
                    This will redirect you to Google's authentication page to authorize Gmail access
                  </p>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsAuthenticated(true);
                      toast.success('Demo mode: Authentication simulated!');
                    }}
                    aria-describedby="demo-mode-desc"
                  >
                    <span aria-hidden="true">🧪</span> Demo Mode (Skip Auth)
                  </button>
                  <p id="demo-mode-desc" className="sr-only">
                    Skip authentication for testing purposes - emails will not actually be sent
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="email-form" aria-labelledby="email-form-title">
            <div className="md-card mb-8" role="status" aria-live="polite">
              <div className="md-card-content flex justify-between items-center">
                <div className="auth-success">
                  <span className="text-success font-semibold text-lg">
                    <span aria-hidden="true">✅</span> Gmail Connected Successfully!
                  </span>
                  <p className="text-secondary mt-2">You can now send mass emails. Fill out the form below to get started.</p>
                </div>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    try {
                      // Use same API base logic as api.js
                      const API_BASE = process.env.NODE_ENV === 'production' 
                        ? '/api'  // Vercel serverless functions
                        : process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
                      
                      const response = await fetch(`${API_BASE}/mass-mail/auth/disconnect`, {
                        method: 'POST'
                      });
                      const data = await response.json();
                      
                      if (data.success) {
                        setIsAuthenticated(false);
                        toast.success('Successfully disconnected from Gmail');
                      } else {
                        toast.error('Failed to disconnect');
                      }
                    } catch (error) {
                      console.error('Disconnect error:', error);
                      setIsAuthenticated(false);
                      toast.info('Disconnected from Gmail');
                    }
                  }}
                  aria-describedby="disconnect-desc"
                >
                  Disconnect
                </button>
                <span id="disconnect-desc" className="sr-only">
                  Disconnect from Gmail and return to authentication screen
                </span>
              </div>
            </div>
            
            <form onSubmit={handleSendEmails} className="md-card md-card-content" aria-labelledby="email-form-title">
              <h2 id="email-form-title" className="sr-only">Mass Email Configuration Form</h2>
              
              <fieldset className="file-uploads grid grid-2">
                <legend className="sr-only">File Upload Section</legend>
                
                <div className="form-group">
                  <label htmlFor="zip-file" className="form-label">
                    <span aria-hidden="true">📁</span> Certificate ZIP File
                  </label>
                  <input
                    id="zip-file"
                    type="file"
                    accept=".zip"
                    onChange={(e) => setZipFile(e.target.files[0])}
                    required
                    className="form-control"
                    aria-describedby="zip-file-help"
                  />
                  <div id="zip-file-help" className="sr-only">
                    Upload a ZIP file containing all certificate PDFs to be sent via email
                  </div>
                  {zipFile && (
                    <div className="file-success" role="status" aria-live="polite">
                      <span aria-hidden="true">✓</span> {zipFile.name}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="csv-file" className="form-label">
                    <span aria-hidden="true">📊</span> Recipient CSV File
                  </label>
                  <input
                    id="csv-file"
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={(e) => setCsvFile(e.target.files[0])}
                    required
                    className="form-control"
                    aria-describedby="csv-file-help"
                  />
                  <div id="csv-file-help" className="sr-only">
                    Upload a CSV or Excel file containing recipient information including names and email addresses
                  </div>
                  {csvFile && (
                    <div className="file-success" role="status" aria-live="polite">
                      <span aria-hidden="true">✓</span> {csvFile.name}
                    </div>
                  )}
                </div>
              </fieldset>

              <fieldset className="email-config">
                <legend className="sr-only">Email Configuration</legend>
                
                <div className="form-group">
                  <label htmlFor="sender-name" className="form-label">Sender Display Name (Optional)</label>
                  <input
                    id="sender-name"
                    type="text"
                    className="form-control"
                    value={senderDisplayName}
                    onChange={(e) => setSenderDisplayName(e.target.value)}
                    placeholder="e.g., Silver Oak University IEEE SB"
                    aria-describedby="sender-name-help"
                  />
                  <div id="sender-name-help" className="input-help-text">
                    Custom name that recipients will see as the sender (e.g., "Silver Oak University IEEE SB events.ieee@socet.edu.in"). If empty, only your Gmail address will be shown.
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="email-subject" className="form-label">Email Subject</label>
                  <input
                    id="email-subject"
                    type="text"
                    className="form-control"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    required
                    aria-describedby="subject-help"
                  />
                  <div id="subject-help" className="sr-only">
                    Enter the subject line that will appear in all sent emails
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="email-body" className="form-label">Email Body Template</label>
                  <textarea
                    id="email-body"
                    className="form-control"
                    value={bodyTemplate}
                    onChange={(e) => setBodyTemplate(e.target.value)}
                    placeholder="Enter email body template..."
                    rows="6"
                    required
                    aria-describedby="body-help"
                  />
                  <div id="body-help" className="input-help-text">
                    Use {'{Name}'} and {'{CertificateID}'} as placeholders that will be replaced with actual recipient data
                  </div>
                </div>
              </fieldset>

              <button 
                type="submit" 
                className="btn btn-primary btn-lg"
                disabled={loading}
                style={{ width: '100%' }}
                aria-describedby="send-button-help"
              >
                {loading ? (
                  <>
                    <span className="spinner" aria-hidden="true"></span>
                    <span>Sending Emails...</span>
                    <span className="sr-only">Please wait while emails are being sent</span>
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">📧</span> Send Mass Emails
                  </>
                )}
              </button>
              <div id="send-button-help" className="sr-only">
                Click to start sending emails to all recipients in the CSV file with their corresponding certificates
              </div>
            </form>
          </section>
        )}

        <div className="md-how-to-use">
          <h3 className="md-how-to-use-title">📋 How to Use</h3>
          <div className="md-how-to-use-stepper">
            <div className="md-how-to-use-step">
              <div className="md-how-to-use-step-number">1</div>
              <div className="md-how-to-use-step-content">
                <h4 className="md-how-to-use-step-title">Sign in with Gmail</h4>
                <p className="md-how-to-use-step-description">Connect your Gmail account to enable email sending. This allows the system to send emails on your behalf using Gmail's secure API.</p>
              </div>
            </div>
            <div className="md-how-to-use-step">
              <div className="md-how-to-use-step-number">2</div>
              <div className="md-how-to-use-step-content">
                <h4 className="md-how-to-use-step-title">Upload Certificate ZIP File</h4>
                <p className="md-how-to-use-step-description">Upload a ZIP file containing all certificate PDFs. Each certificate should be named to match the Certificate ID in your CSV file.</p>
              </div>
            </div>
            <div className="md-how-to-use-step">
              <div className="md-how-to-use-step-number">3</div>
              <div className="md-how-to-use-step-content">
                <h4 className="md-how-to-use-step-title">Upload Recipient CSV File</h4>
                <p className="md-how-to-use-step-description">Upload a CSV file with columns: Sr_No, Name, Mail, Certificate ID. This file contains all recipient information and certificate mappings.</p>
              </div>
            </div>
            <div className="md-how-to-use-step">
              <div className="md-how-to-use-step-number">4</div>
              <div className="md-how-to-use-step-content">
                <h4 className="md-how-to-use-step-title">Customize Email Settings</h4>
                <p className="md-how-to-use-step-description">Set a custom sender display name (optional), email subject, and body template with placeholders like {'{Name}'} and {'{CertificateID}'}. These will be automatically replaced for each recipient.</p>
              </div>
            </div>
            <div className="md-how-to-use-step">
              <div className="md-how-to-use-step-number">5</div>
              <div className="md-how-to-use-step-content">
                <h4 className="md-how-to-use-step-title">Send Mass Emails</h4>
                <p className="md-how-to-use-step-description">Click "Send Mass Emails" to start the process. A results CSV file will be automatically downloaded with delivery status for each recipient.</p>
              </div>
            </div>
          </div>
        </div>

        {results && (
          <div className="md-card">
            <div className="md-card-header">
              <h3 className="md-card-title">📊 Email Results</h3>
            </div>
            <div className="md-card-content">
              <div className="grid grid-3">
                <div className="card text-center">
                  <div className="text-3xl font-bold text-primary mb-2">{results.total}</div>
                  <div className="text-sm text-secondary font-medium">Total</div>
                </div>
                <div className="card text-center">
                  <div className="text-3xl font-bold text-success mb-2">{results.sent}</div>
                  <div className="text-sm text-secondary font-medium">Sent</div>
                </div>
                <div className="card text-center">
                  <div className="text-3xl font-bold text-danger mb-2">{results.failed}</div>
                  <div className="text-sm text-secondary font-medium">Failed</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MassMailer;