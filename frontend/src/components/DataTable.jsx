import React, { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export function DataTable({ title, rows, columns, exportName }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(q)));
  }, [rows, search]);

  function handleExport() {
    if (!exportName) return;
    window.open(`${API_BASE}/analytics/export/${exportName}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <section className="table-card">
      <div className="table-toolbar">
        <h2>{title}</h2>
        <div>
          <label className="search-box">
            <Search size={15} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search table" />
          </label>
          <button className="icon-button" title="Export" onClick={handleExport} disabled={!exportName}><Download size={16} /></button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.slice(0, 12).map((row, index) => (
              <tr key={row.ticket_id || row.cs_id || row.employee_id || `${title}-${index}`}>
                {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? '-'}</td>)}
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={columns.length}>No matching data.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
