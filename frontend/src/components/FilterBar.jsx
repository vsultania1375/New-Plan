import React from 'react';

export function FilterBar({ filters, onFilterChange, stateOptions }) {
  return (
    <section className="filter-bar">
      <label>
        <span>From</span>
        <input type="date" value={filters.fromDate} onChange={(event) => onFilterChange({ fromDate: event.target.value })} />
      </label>
      <label>
        <span>To</span>
        <input type="date" value={filters.toDate} onChange={(event) => onFilterChange({ toDate: event.target.value })} />
      </label>
      <label>
        <span>State</span>
        <select value={filters.state} onChange={(event) => onFilterChange({ state: event.target.value })}>
          <option value="PAN India">PAN India</option>
          {stateOptions.map((state) => <option key={state} value={state}>{state}</option>)}
        </select>
      </label>
      <label>
        <span>Segment</span>
        <select value={filters.segment} onChange={(event) => onFilterChange({ segment: event.target.value })}>
          <option value="PSU">PSU</option>
          <option value="PVT">PVT</option>
          <option value="All">All</option>
        </select>
      </label>
    </section>
  );
}
