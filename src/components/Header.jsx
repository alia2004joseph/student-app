import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import Button from './Button';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { label: 'Dashboard', to: '/' },
  { label: 'Students', to: '/students' },
  { label: 'Teachers', to: '/teachers' },
  { label: 'Classes', to: '/classes' },
  { label: 'Attendance', to: '/attendance' },
  { label: 'Messages', to: '/messages' },
];

function initials(name) {
  if (!name) return '?';
  return name.slice(0, 2).toUpperCase();
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="site-header">
      <div className="wrap">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3 2 8l10 5 8-4.2V16h2V8L12 3Z"
                fill="currentColor"
              />
              <path
                d="M6 12.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5l-6 3-6-3Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="brand-name">Brightpath School</span>
        </Link>

        <nav className="main-nav" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <Button variant="accent" size="sm">
            + New
          </Button>
          <button className="icon-btn" aria-label="Notifications">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6v-5a7 7 0 0 0-5.5-6.84V3a1.5 1.5 0 0 0-3 0v1.16A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"
                fill="currentColor"
              />
            </svg>
          </button>

          <div style={{ position: 'relative' }}>
            <button
              className="avatar"
              style={{ border: 'none' }}
              title={username || 'Account'}
              onClick={() => setProfileOpen((o) => !o)}
            >
              {initials(username)}
            </button>

            {profileOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '46px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-md)',
                  minWidth: 160,
                  overflow: 'hidden',
                  zIndex: 30,
                }}
              >
                <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                  Signed in as <strong style={{ color: 'var(--color-text)' }}>{username}</strong>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13.5,
                    color: 'var(--color-danger)',
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

          <button
            className="menu-toggle"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <nav className={`mobile-nav ${menuOpen ? 'open' : ''}`} aria-label="Mobile">
        {NAV_LINKS.map((link) => (
          <NavLink key={link.label} to={link.to} end={link.to === '/'} onClick={() => setMenuOpen(false)}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

export default Header;