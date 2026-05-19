import React from 'react';

export function DashboardLayout({ children, adminSlot, statusSlot }) {
  return (
    <main className="app-shell">
      <header className="command-header">
        <div className="brand-shell">
          <img className="brand-logo" src="/image.png" alt="Protect logo" />
          <div className="brand-block">
            <p>Service intelligence</p>
            <h1>Dashboard</h1>
          </div>
        </div>
        <div className="header-actions">
          {statusSlot}
          {adminSlot}
        </div>
      </header>

      {children}
    </main>
  );
}
