import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import Header from './components/Header';
import Breadcrumb from './components/Breadcrumb';

import Home from './pages/Home';
import CertificateGenerator from './pages/CertificateGenerator';
import ParticipantManagement from './pages/ParticipantManagement';
import TemplateManagement from './pages/TemplateManagement';

import MassMailer from './pages/MassMailer';
import Reports from './pages/Reports';
import PerformanceTest from './pages/PerformanceTest';
import './App.css';

// Performance optimization utilities (loaded conditionally)
let PerformanceOptimizer, OptimizationTestRunner, CSSPurger;

if (process.env.NODE_ENV === 'development') {
  // Load performance optimization utilities
  import('./utils/performanceOptimizer.js').then(module => {
    PerformanceOptimizer = module.default;
    window.PerformanceOptimizer = PerformanceOptimizer;
  }).catch(console.warn);
  
  import('./utils/runOptimizationTests.js').then(module => {
    OptimizationTestRunner = module.default;
    window.OptimizationTestRunner = OptimizationTestRunner;
    
    // Add global test functions for development
    window.runPerformanceTests = async () => {
      const runner = new OptimizationTestRunner();
      return await runner.runAllTests();
    };
    
    window.runQuickPerformanceTest = async () => {
      const runner = new OptimizationTestRunner();
      return await runner.quickTest();
    };
  }).catch(console.warn);
  
  import('./utils/cssPurger.js').then(module => {
    CSSPurger = module.default;
    window.CSSPurger = CSSPurger;
    
    // Add global CSS optimization functions
    window.optimizeCSS = () => {
      const purger = new CSSPurger();
      return purger.purgeAllStylesheets();
    };
    
    window.downloadOptimizedCSS = () => {
      const purger = new CSSPurger();
      return purger.downloadOptimizedBundle();
    };
  }).catch(console.warn);
  
  // Load test utilities
  import('./utils/testPerformanceUtilities.js').then(() => {
    console.log('🧪 Performance test utilities loaded!');
    console.log('💡 Try: runAllUtilityTests() to test all utilities');
  }).catch(console.warn);
}

function App() {
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);

  useEffect(() => {
    // Performance monitoring setup
    const setupPerformanceMonitoring = () => {
      // Monitor Core Web Vitals
      if ('PerformanceObserver' in window) {
        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.log('LCP:', lastEntry.startTime);
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach(entry => {
            console.log('FID:', entry.processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ type: 'first-input', buffered: true });

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              console.log('CLS:', clsValue);
            }
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      }

      // Monitor resource loading performance
      if ('performance' in window && 'getEntriesByType' in performance) {
        window.addEventListener('load', () => {
          setTimeout(() => {
            const resources = performance.getEntriesByType('resource');
            const cssResources = resources.filter(r => r.name.includes('.css'));
            const jsResources = resources.filter(r => r.name.includes('.js'));
            
            console.log('CSS Resources:', cssResources.length, 'Total size:', 
              cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0));
            console.log('JS Resources:', jsResources.length, 'Total size:', 
              jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0));
          }, 1000);
        });
      }
    };

    // Set up responsive viewport meta tag if not already present
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
      document.head.appendChild(meta);
    }

    // Add touch-action CSS for better touch handling
    document.body.style.touchAction = 'manipulation';
    
    // Set up performance monitoring in development
    if (process.env.NODE_ENV === 'development') {
      setupPerformanceMonitoring();
    }
    
    // Keyboard navigation detection
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        setIsKeyboardNavigation(true);
        document.body.classList.add('keyboard-navigation');
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardNavigation(false);
      document.body.classList.remove('keyboard-navigation');
    };

    // Focus management for skip links
    const handleSkipLinkClick = (e) => {
      e.preventDefault();
      const target = document.querySelector(e.target.getAttribute('href'));
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    
    // Add skip link functionality
    const skipLinks = document.querySelectorAll('.skip-link');
    skipLinks.forEach(link => {
      link.addEventListener('click', handleSkipLinkClick);
    });
    
    // Prevent zoom on double tap for iOS
    let lastTouchEnd = 0;
    const preventZoom = (e) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };
    
    document.addEventListener('touchend', preventZoom, { passive: false });

    // Announce page changes to screen readers
    const announcePageChange = () => {
      const pageTitle = document.title;
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = `Navigated to ${pageTitle}`;
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    };

    // Listen for route changes
    const observer = new MutationObserver(() => {
      announcePageChange();
    });

    observer.observe(document.querySelector('title'), {
      childList: true,
      subtree: true
    });
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('touchend', preventZoom);
      skipLinks.forEach(link => {
        link.removeEventListener('click', handleSkipLinkClick);
      });
      observer.disconnect();
    };
  }, []);

  return (
    <Router>
      <div className="App">
        {/* Skip Links */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <a href="#navigation" className="skip-link">
          Skip to navigation
        </a>
        
        {/* Live region for announcements */}
        <div 
          id="live-region" 
          aria-live="polite" 
          aria-atomic="true" 
          className="sr-only"
        ></div>
        
        <Header />
        <Breadcrumb />
        
        <main 
          className="main-content" 
          role="main" 
          id="main-content" 
          tabIndex="-1"
          aria-label="Main content"
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/participants" element={<ParticipantManagement />} />
            <Route path="/generate" element={<CertificateGenerator />} />
            <Route path="/templates" element={<TemplateManagement />} />
            <Route path="/mass-mailer" element={<MassMailer />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/performance-test" element={<PerformanceTest />} />
            {/* Catch-all route for 404 */}
            <Route path="*" element={
              <div className="container text-center" role="alert" style={{ padding: '4rem 2rem' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>404 - Page Not Found</h1>
                <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>The page you're looking for doesn't exist in the Certificate Management Platform.</p>
                <a href="/" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
                  Return to Home
                </a>
              </div>
            } />
          </Routes>
        </main>
        
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--gray-800)',
              color: 'white',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
            },
          }}
          containerStyle={{
            zIndex: 9999,
          }}
          ariaProps={{
            role: 'status',
            'aria-live': 'polite',
          }}
        />

      </div>
    </Router>
  );
}

export default App;