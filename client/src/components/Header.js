import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuOpen && !event.target.closest('.header')) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [mobileMenuOpen]);

  const navigationItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/participants', label: 'Participants', icon: '👥' },
    { path: '/generate', label: 'Generate Certificates', icon: '📜' },
    { path: '/templates', label: 'Templates', icon: '🎨' },
    { path: '/mass-mailer', label: 'Mass Mailer', icon: '📮' },
    { path: '/reports', label: 'Reports', icon: '📊' }
  ];

  return (
    <header className="header" role="banner">
      <div className="header-content">
        <Link to="/" className="logo" onClick={closeMobileMenu} aria-label="Certificate Management Platform Home">
          <div className="logo-container">
            <div className="logo-icon">🐐</div>
            <h1>Certificate Management Platform</h1>
          </div>
        </Link>
        
        <button 
          className="mobile-menu-toggle"
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
        
        <nav 
          className={`nav ${mobileMenuOpen ? 'mobile-open' : ''}`}
          role="navigation"
          aria-label="Main navigation"
        >
          {navigationItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path} 
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={closeMobileMenu}
              aria-current={location.pathname === item.path ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-text">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;