import React from 'react';

const YEAR = new Date().getFullYear();

function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-bottom">
        <span>© {YEAR} Brightpath School Management System</span>
        <span className="ruled-mark" aria-hidden="true" />
      </div>
    </footer>
  );
}

export default Footer;