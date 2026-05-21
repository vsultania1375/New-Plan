import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, MapPinned, Search, ShieldCheck, Users } from 'lucide-react';
import { getStateWiseReport } from '../api.js';
import { formatNumber } from './format.js';

const riskOrder = {
  Critical: 4,
  High: 3,
  Warning: 2,
  Normal: 1,
  'Mapping Pending': 0
};

function formatPercent(value) {
  if (value === null || value === undefined || value === '') return '—';
  return `${value}%`;
}

function formatCountWithPercent(count, percent) {
  const safeCount = count === null || count === undefined ? '—' : formatNumber(count);
  const safePercent = formatPercent(percent);
  return safePercent === '—' ? safeCount : `${safeCount} (${safePercent})`;
}

function RiskBadge({ risk }) {
  const normalized = String(risk || 'Normal');
  const tone = normalized === 'Critical'
    ? 'critical'
    : normalized === 'High'
    ? 'high'
    : normalized === 'Warning'
    ? 'warning'
    : 'normal';
  return <span className={`badge ${tone}`}>{normalized}</span>;
}

function SummaryCard({ label, value, icon: Icon, tone = 'neutral' }) {
  return (
    <article className={`state-wise-summary-card ${tone}`}>
      <span>{Icon && <Icon size={16} />} {label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function StateWiseReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('risk');
  const [selectedState, setSelectedState] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getStateWiseReport()
      .then((result) => {
        if (!active) return;
        setRows(Array.isArray(result) ? result : []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'State Wise Report could not load');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const criticalStates = rows.filter((row) => row.risk === 'Critical' || row.risk === 'High').length;
    return {
      states: rows.length,
      totalSites: rows.reduce((sum, row) => sum + Number(row.total_sites || 0), 0),
      totalOffline: rows.reduce((sum, row) => sum + Number(row.total_offline || 0), 0),
      criticalStates,
      activeEngineers: rows.reduce((sum, row) => sum + Number(row.active_engineers || 0), 0),
      serviceAreas: rows.reduce((sum, row) => sum + Number(row.total_service_areas || 0), 0)
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? rows.filter((row) => String(row.state || '').toLowerCase().includes(query))
      : rows;
    return [...filtered].sort((a, b) => {
      if (sortBy === 'offline') {
        return Number(b.offline_gt_3_percentage ?? -1) - Number(a.offline_gt_3_percentage ?? -1);
      }
      if (sortBy === 'state') {
        return String(a.state || '').localeCompare(String(b.state || ''));
      }
      return (riskOrder[b.risk] || 0) - (riskOrder[a.risk] || 0)
        || Number(b.offline_gt_3_percentage ?? -1) - Number(a.offline_gt_3_percentage ?? -1);
    });
  }, [rows, search, sortBy]);

  const selectedRow = rows.find((row) => row.state === selectedState);

  return (
    <section className="state-wise-report">
      <div className="panel state-wise-hero">
        <div>
          <p>State Wise Report</p>
          <h2>State accountability view</h2>
          <span>
            Operational metrics are live. Official State Head ownership remains Mapping Pending until an approved mapping file is provided.
          </span>
        </div>
        <span className="state-wise-note">Trends pending: 1M / 3M / 6M</span>
      </div>

      <div className="state-wise-summary-grid">
        <SummaryCard label="States Covered" value={formatNumber(summary.states)} icon={MapPinned} />
        <SummaryCard label="Total Sites" value={formatNumber(summary.totalSites)} icon={ShieldCheck} />
        <SummaryCard label="Total Offline" value={formatNumber(summary.totalOffline)} icon={AlertTriangle} tone="warning" />
        <SummaryCard label="Critical States" value={formatNumber(summary.criticalStates)} icon={AlertTriangle} tone="critical" />
        <SummaryCard label="Active Engineers" value={formatNumber(summary.activeEngineers)} icon={Users} tone="good" />
        <SummaryCard label="Total Service Areas" value={formatNumber(summary.serviceAreas)} icon={MapPinned} />
      </div>

      <div className="panel state-wise-table-panel">
        <div className="state-wise-toolbar">
          <div>
            <p>State Metrics</p>
            <h2>Live operational state table</h2>
          </div>
          <div className="state-wise-controls">
            <label className="state-wise-search">
              <Search size={15} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search state"
              />
            </label>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="risk">Sort by risk</option>
              <option value="offline">Sort by offline %</option>
              <option value="state">Sort by state</option>
            </select>
          </div>
        </div>

        {loading && <div className="state-wise-empty">Loading State Wise Report…</div>}
        {error && <div className="state-wise-empty error">{error}</div>}
        {!loading && !error && (
          <div className="state-wise-table-wrap">
            <table className="state-wise-table">
              <thead>
                <tr>
                  <th>State</th>
                  <th>State Head</th>
                  <th>Sites</th>
                  <th>Offline %</th>
                  <th>Offline &gt;3 Days</th>
                  <th>No Ticket %</th>
                  <th>No Visit %</th>
                  <th>Active Engineers</th>
                  <th>Service Areas</th>
                  <th>Worst Service Area</th>
                  <th>Avg TAT</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const worst = row.worst_service_areas?.[0];
                  const isSelected = selectedState === row.state;
                  return (
                    <tr
                      key={row.state}
                      className={isSelected ? 'selected' : ''}
                      onClick={() => setSelectedState(row.state)}
                    >
                      <td><strong>{row.state || 'Unknown'}</strong></td>
                      <td>
                        {row.state_head_name ? (
                          <span className="state-head-cell">
                            <strong>{row.state_head_name}</strong>
                            <small>{row.state_head_phone || row.state_head_email || row.state_head_employee_id || ''}</small>
                          </span>
                        ) : (
                          <span className="mapping-pending">{row.state_head_status || 'Mapping Pending'}</span>
                        )}
                      </td>
                      <td>{formatNumber(row.total_sites)}</td>
                      <td>{formatCountWithPercent(row.total_offline, row.offline_percentage)}</td>
                      <td>{formatCountWithPercent(row.offline_gt_3_days, row.offline_gt_3_percentage)}</td>
                      <td>{formatCountWithPercent(row.offline_without_ticket, row.offline_without_ticket_percentage)}</td>
                      <td>{formatCountWithPercent(row.ticket_without_visit, row.ticket_without_visit_percentage)}</td>
                      <td>{formatNumber(row.active_engineers)}</td>
                      <td>{formatNumber(row.total_service_areas)}</td>
                      <td>
                        {worst ? (
                          <span className="worst-service-area">
                            <strong>{worst.service_area_name}</strong>
                            <small>{formatCountWithPercent(worst.offline_sites, worst.offline_percentage)}</small>
                          </span>
                        ) : '—'}
                      </td>
                      <td>{row.avg_tat === null || row.avg_tat === undefined ? '—' : `${row.avg_tat} days`}</td>
                      <td><RiskBadge risk={row.risk} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRow && (
        <div className="panel state-wise-selected">
          <div>
            <p>Selected State</p>
            <h2>{selectedRow.state}</h2>
            <span>State Head: {selectedRow.state_head_name || selectedRow.state_head_status}</span>
          </div>
          <div className="state-wise-selected-metrics">
            <span>Worst Service Area: <strong>{selectedRow.worst_service_areas?.[0]?.service_area_name || '—'}</strong></span>
            <span>Best Service Area: <strong>{selectedRow.best_service_areas?.[0]?.service_area_name || '—'}</strong></span>
            <span>Trend: <strong>Trend pending</strong></span>
          </div>
        </div>
      )}
    </section>
  );
}
