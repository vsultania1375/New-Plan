import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Clock, Search, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { getEngineerWiseDetail, getEngineerWiseReport } from '../api.js';
import { EngineerProfileModal } from './EngineerProfileModal.jsx';
import { formatNumber } from './format.js';

function valueOrDash(value, suffix = '') {
  if (value === null || value === undefined || value === '') return '—';
  return `${formatNumber(value)}${suffix}`;
}

function RiskBadge({ risk }) {
  const normalized = String(risk || 'Unknown');
  const tone = normalized === 'Critical' ? 'critical' : normalized === 'Warning' ? 'warning' : normalized === 'Good' ? 'normal' : 'neutral';
  return <span className={`badge ${tone}`}>{normalized}</span>;
}

function SummaryCard({ label, value, icon: Icon, tone = 'neutral' }) {
  return (
    <article className={`engineer-summary-card ${tone}`}>
      <span>{Icon && <Icon size={16} />} {label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function EngineerWiseReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [selectedEngineer, setSelectedEngineer] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    state: '',
    serviceArea: '',
    manager: '',
    risk: '',
    zeroProductiveOnly: false
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getEngineerWiseReport()
      .then((result) => {
        if (!active) return;
        const nextRows = Array.isArray(result) ? result : [];
        setRows(nextRows);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Engineer Wise Report could not load');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let active = true;
    setDetailLoading(true);
    setDetailError('');
    getEngineerWiseDetail(selectedId)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch((err) => {
        if (active) setDetailError(err.message || 'Engineer detail could not load');
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  const options = useMemo(() => ({
    states: [...new Set(rows.map((row) => row.state).filter(Boolean))].sort(),
    serviceAreas: [...new Set(rows.map((row) => row.service_area_name).filter(Boolean))].sort(),
    managers: [...new Set(rows.map((row) => row.manager_name).filter(Boolean))].sort()
  }), [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (filters.state && row.state !== filters.state) return false;
        if (filters.serviceArea && row.service_area_name !== filters.serviceArea) return false;
        if (filters.manager && row.manager_name !== filters.manager) return false;
        if (filters.risk && row.risk !== filters.risk) return false;
        if (filters.zeroProductiveOnly && Number(row.zero_productive_days || 0) <= 0) return false;
        if (!query) return true;
        return [row.engineer_name, row.engineer_id, row.service_area_name, row.manager_name]
          .some((value) => String(value || '').toLowerCase().includes(query));
      })
      .sort((a, b) => Number(a.engineer_score ?? -1) - Number(b.engineer_score ?? -1) || String(a.engineer_name || '').localeCompare(String(b.engineer_name || '')));
  }, [rows, search, filters]);

  const summary = useMemo(() => {
    const totalVisits = rows.reduce((sum, row) => sum + Number(row.total_visits_last_30_days || 0), 0);
    const scoredRows = rows.filter((row) => row.engineer_score !== null && row.engineer_score !== undefined);
    const avgScore = scoredRows.length
      ? Math.round(scoredRows.reduce((sum, row) => sum + Number(row.engineer_score || 0), 0) / scoredRows.length)
      : null;
    return {
      totalEngineers: rows.length,
      activeEngineers: rows.length,
      avgScore,
      critical: rows.filter((row) => row.risk === 'Critical').length,
      zeroProductive: rows.filter((row) => Number(row.zero_productive_days || 0) > 0).length,
      totalVisits
    };
  }, [rows]);

  function handleSelectEngineer(engineer) {
    setSelectedEngineer(engineer);
    setSelectedId(engineer.engineer_id);
  }

  function handleCloseModal() {
    setSelectedEngineer(null);
    setSelectedId('');
    setDetail(null);
  }

  return (
    <section className="engineer-wise-report">
      <div className="panel engineer-wise-hero">
        <div>
          <p>Engineer Wise Report</p>
          <h2>Engineer activity and Service Area risk</h2>
          <span>Operational Risk Score is for service management, not HR performance evaluation. Manager uses Reporting Manager 2.</span>
        </div>
        <span className="engineer-wise-note">Last 30 activity days · POP = Service Area</span>
      </div>

      <div className="engineer-summary-grid">
        <SummaryCard label="Total Engineers" value={formatNumber(summary.totalEngineers)} icon={Users} />
        <SummaryCard label="Active Engineers" value={formatNumber(summary.activeEngineers)} icon={UserCheck} tone="good" />
        <SummaryCard label="Avg Operational Score" value={valueOrDash(summary.avgScore)} icon={ShieldCheck} />
        <SummaryCard label="Critical Engineers" value={formatNumber(summary.critical)} icon={AlertTriangle} tone="critical" />
        <SummaryCard label="Zero Productive Days" value={formatNumber(summary.zeroProductive)} icon={Clock} tone="warning" />
        <SummaryCard label="Visits Last 30 Days" value={formatNumber(summary.totalVisits)} icon={Activity} />
      </div>

      <div className="panel engineer-table-panel">
        <div className="engineer-toolbar">
          <div>
            <p>Engineer Metrics</p>
            <h2>Attendance, productivity, visits, and owned Service Area load</h2>
          </div>
          <label className="engineer-search">
            <Search size={15} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search engineer, ID, Service Area" />
          </label>
        </div>
        <div className="engineer-filter-row">
          <select value={filters.state} onChange={(event) => setFilters((current) => ({ ...current, state: event.target.value }))}>
            <option value="">All states</option>
            {options.states.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
          <select value={filters.serviceArea} onChange={(event) => setFilters((current) => ({ ...current, serviceArea: event.target.value }))}>
            <option value="">All Service Areas</option>
            {options.serviceAreas.map((area) => <option key={area} value={area}>{area}</option>)}
          </select>
          <select value={filters.manager} onChange={(event) => setFilters((current) => ({ ...current, manager: event.target.value }))}>
            <option value="">All managers</option>
            {options.managers.map((manager) => <option key={manager} value={manager}>{manager}</option>)}
          </select>
          <select value={filters.risk} onChange={(event) => setFilters((current) => ({ ...current, risk: event.target.value }))}>
            <option value="">All risk</option>
            <option value="Good">Good</option>
            <option value="Warning">Warning</option>
            <option value="Critical">Critical</option>
          </select>
          <label className="engineer-checkbox">
            <input
              type="checkbox"
              checked={filters.zeroProductiveOnly}
              onChange={(event) => setFilters((current) => ({ ...current, zeroProductiveOnly: event.target.checked }))}
            />
            Zero productive days only
          </label>
        </div>

        {loading && <div className="engineer-empty">Loading Engineer Wise Report…</div>}
        {error && <div className="engineer-empty error">{error}</div>}
        {!loading && !error && (
          <div className="engineer-table-wrap">
            <table className="engineer-wise-table">
              <thead>
                <tr>
                  <th>Engineer</th>
                  <th>Engineer ID</th>
                  <th>State</th>
                  <th>Service Area</th>
                  <th>Manager</th>
                  <th>Attendance</th>
                  <th>On-time</th>
                  <th>Late</th>
                  <th>Productive</th>
                  <th>Visits 30D</th>
                  <th>Avg Repeat Visit Gap</th>
                  <th>Offline %</th>
                  <th>Open / Pending</th>
                  <th>Score</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.engineer_id}
                    className="engineer-table-row"
                    onClick={() => handleSelectEngineer(row)}
                  >
                    <td><strong>{row.engineer_name || '—'}</strong></td>
                    <td>{row.engineer_id}</td>
                    <td>{row.state || '—'}</td>
                    <td>{row.service_area_name || '—'}</td>
                    <td>{row.manager_name || '—'}</td>
                    <td>{formatNumber(row.attendance_days || 0)}</td>
                    <td>{formatNumber(row.on_time_attendance_days || 0)}</td>
                    <td>{formatNumber(row.late_attendance_days || 0)}</td>
                    <td>{formatNumber(row.productive_days || 0)}</td>
                    <td>{formatNumber(row.total_visits_last_30_days || 0)}</td>
                    <td>{valueOrDash(row.repeat_visit_rate_days, ' days')}</td>
                    <td>{valueOrDash(row.offline_percentage, '%')}</td>
                    <td>{formatNumber(row.open_tickets_in_service_area || 0)} / {formatNumber(row.pending_tickets_in_service_area || 0)}</td>
                    <td><strong>{valueOrDash(row.engineer_score)}</strong></td>
                    <td><RiskBadge risk={row.risk} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedEngineer && (
        <EngineerProfileModal
          engineer={selectedEngineer}
          detail={detail}
          detailLoading={detailLoading}
          detailError={detailError}
          onClose={handleCloseModal}
        />
      )}
    </section>
  );
}
