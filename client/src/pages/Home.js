import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home">
      <div className="container">
        <section className="hero-section" aria-labelledby="hero-title">
          <h1 id="hero-title" className="hero-title">Certificate Generator</h1>
          <p className="hero-subtitle">
            Generate professional certificates with comprehensive reporting and mass email distribution
          </p>
        </section>

        <section className="features-section" aria-labelledby="features-title">
          <h2 id="features-title" className="sr-only">Main Features</h2>
          <div className="features-grid" role="list">
            <article className="feature-card" role="listitem">
              <div className="feature-icon" aria-hidden="true">📜</div>
              <h3>Certificate Generation</h3>
              <p>
                Upload your template and customize text positioning, fonts, colors, and styles. 
                Generate single certificates or process bulk data from Excel files with category support.
              </p>
              <Link to="/generate" className="btn btn-primary" aria-describedby="cert-gen-desc">
                Start Generating
              </Link>
              <span id="cert-gen-desc" className="sr-only">Navigate to certificate generation page</span>
            </article>

            <article className="feature-card" role="listitem">
              <div className="feature-icon" aria-hidden="true">📊</div>
              <h3>Generation Reports</h3>
              <p>
                Track certificate generation with detailed reports. View statistics by category 
                (Technical, Non-Technical, Administrative, Spiritual) and export data.
              </p>
              <Link to="/reports" className="btn btn-primary" aria-describedby="reports-desc">
                View Reports
              </Link>
              <span id="reports-desc" className="sr-only">Navigate to reports and analytics page</span>
            </article>

            <article className="feature-card" role="listitem">
              <div className="feature-icon" aria-hidden="true">📧</div>
              <h3>Mass Email Distribution</h3>
              <p>
                Send certificates to multiple recipients via Gmail integration. Upload recipient lists 
                and certificates, then distribute with personalized email templates.
              </p>
              <Link to="/mass-mailer" className="btn btn-primary" aria-describedby="mass-mailer-desc">
                Send Emails
              </Link>
              <span id="mass-mailer-desc" className="sr-only">Navigate to mass email distribution page</span>
            </article>
          </div>
        </section>

        <section className="how-it-works-section" aria-labelledby="how-it-works-title">
          <h2 id="how-it-works-title">How It Works</h2>
          <ol className="material-steps-container" role="list" aria-label="Certificate generation process steps">
            <li className="material-step-card" role="listitem" tabindex="0">
              <div className="material-step-header">
                <div className="material-step-number" aria-label="Step 1">1</div>
                <div className="material-step-connector" aria-hidden="true"></div>
              </div>
              <div className="material-step-content">
                <div className="material-step-icon" aria-hidden="true">📁</div>
                <h3>Upload Template</h3>
                <p>Upload your certificate template (PDF, PNG, JPG) and customize the design with our intuitive editor</p>
              </div>
            </li>
            
            <li className="material-step-card" role="listitem" tabindex="0">
              <div className="material-step-header">
                <div className="material-step-number" aria-label="Step 2">2</div>
                <div className="material-step-connector" aria-hidden="true"></div>
              </div>
              <div className="material-step-content">
                <div className="material-step-icon" aria-hidden="true">✏️</div>
                <h3>Customize Text</h3>
                <p>Position and style the name and certificate ID fields with fonts, colors, and precise positioning</p>
              </div>
            </li>
            
            <li className="material-step-card" role="listitem" tabindex="0">
              <div className="material-step-header">
                <div className="material-step-number" aria-label="Step 3">3</div>
                <div className="material-step-connector" aria-hidden="true"></div>
              </div>
              <div className="material-step-content">
                <div className="material-step-icon" aria-hidden="true">📊</div>
                <h3>Process Data</h3>
                <p>Upload Excel/CSV file with recipient information and event categories for bulk processing</p>
              </div>
            </li>
            
            <li className="material-step-card" role="listitem" tabindex="0">
              <div className="material-step-header">
                <div className="material-step-number" aria-label="Step 4">4</div>
              </div>
              <div className="material-step-content">
                <div className="material-step-icon" aria-hidden="true">🎓</div>
                <h3>Generate & Send</h3>
                <p>Generate certificates automatically and distribute via mass mailer with Gmail integration</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="categories-section" aria-labelledby="categories-title">
          <h2 id="categories-title">Certificate Categories</h2>
          <div className="categories-grid" role="list" aria-label="Available certificate categories">
            <article className="category-item technical" role="listitem" tabindex="0">
              <div className="category-icon" aria-hidden="true">💻</div>
              <h3>Technical</h3>
              <p>Programming, IT, Software Development</p>
            </article>
            <article className="category-item non-technical" role="listitem" tabindex="0">
              <div className="category-icon" aria-hidden="true">🎨</div>
              <h3>Non-Technical</h3>
              <p>Arts, Design, Creative Skills</p>
            </article>
            <article className="category-item administrative" role="listitem" tabindex="0">
              <div className="category-icon" aria-hidden="true">📋</div>
              <h3>Administrative</h3>
              <p>Management, Office, Business</p>
            </article>
            <article className="category-item spiritual" role="listitem" tabindex="0">
              <div className="category-icon" aria-hidden="true">🕉️</div>
              <h3>Spiritual</h3>
              <p>Religious, Meditation, Wellness</p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;