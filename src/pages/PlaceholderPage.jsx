import React from 'react';
import Button from '../components/Button';

/**
 * Generic "coming soon" page. Reused for every nav section that doesn't
 * have a real screen built yet (Students, Teachers, Classes, Attendance,
 * Announcements) so links never dead-end into a blank page.
 */
function PlaceholderPage({ title, description }) {
  return (
    <main className="placeholder-page">
      <div className="wrap">
        <div className="placeholder-card">
          <span className="placeholder-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 8v5m0 3h.01M3 12a9 9 0 1 1 18 0 9 9 0 0 1-18 0Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h1>{title}</h1>
          <p>{description || `The ${title} page is still being built. Check back soon.`}</p>
          <Button variant="outline" size="md" onClick={() => window.history.back()}>
            Go back
          </Button>
        </div>
      </div>
    </main>
  );
}

export default PlaceholderPage;