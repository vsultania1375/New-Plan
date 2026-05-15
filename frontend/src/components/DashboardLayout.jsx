import React from 'react';
import { FilterBar } from './FilterBar.jsx';

export function DashboardLayout({ children, adminSlot, statusSlot, filters, onFilterChange, stateOptions }) {
  return (
    <main className="app-shell">
      <header className="command-header">
        <div className="brand-block">
          <p>Ground operations intelligence</p>
          <h1>PAN India Operations Command Center</h1>
        </div>
        <div className="header-actions">
          {statusSlot}
          {adminSlot}
        </div>
      </header>

      <FilterBar filters={filters} onFilterChange={onFilterChange} stateOptions={stateOptions} />

      {children}
    </main>
  );
}
