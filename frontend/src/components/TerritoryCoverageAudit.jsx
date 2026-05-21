import React, { useEffect, useState } from 'react';
import { AlertTriangle, MapPinned, ShieldCheck } from 'lucide-react';
import { getTerritoryCoverageAudit } from '../api.js';
import { formatNumber } from './format.js';

function formatValue(value, suffix = '') {
  if (value === null || value === undefined || value === '') return '—';
  return `${formatNumber(value)}${suffix}`;
}

function riskTone(risk) {
  if (risk === 'Good') return 'good';
  if (risk === 'Warning') return 'warning';
  return 'critical';
}

function AuditCard({ label, value, note, tone = 'neutral' }) {
  return (
    <article className={`territory-audit-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}

function CompactTable({ title, rows = [], columns = [], emptyText = 'No issues found.' }) {
  return (
    <section className="territory-audit-table-card">
      <div className="territory-audit-table-heading">
        <h3>{title}</h3>
        <span>{formatNumber(rows.length)} shown</span>
      </div>
      <div className="territory-audit-table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => <th key={column.key}>{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? '—'}</td>
                ))}
              </tr>
            )) : (
              <tr>
                <td className="territory-audit-empty-cell" colSpan={columns.length}>{emptyText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TerritoryCoverageAudit() {
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getTerritoryCoverageAudit()
      .then((result) => {
        if (!active) return;
        setAudit(result);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Territory audit could not load.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="panel territory-audit-panel">
        <div className="territory-audit-empty">Loading territory coverage audit…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel territory-audit-panel">
        <div className="territory-audit-empty error">{error}</div>
      </section>
    );
  }

  const score = audit?.territory_readiness_score;
  const explanation = audit?.score_explanation || {};

  return (
    <section className="panel territory-audit-panel">
      <div className="territory-audit-heading">
        <div>
          <p>Mapping Governance</p>
          <h2><MapPinned size={20} /> Territory Coverage Audit</h2>
          <span>Operational Service Area Territory will be generated from mapping data. Polygon rendering should begin only after coverage is acceptable.</span>
        </div>
        <div className="territory-audit-note">
          <ShieldCheck size={16} />
          <span>No fake centroid territories or Voronoi boundaries are used.</span>
        </div>
      </div>

      <div className="territory-audit-score-row">
        <article className="territory-audit-score-card">
          <span>Territory Readiness Score</span>
          <strong>{score === null || score === undefined ? '—' : `${score}/100`}</strong>
          <small>40% mapping coverage · 30% site pincode coverage · 20% match rate · 10% conflict-free</small>
        </article>
        <div className="territory-audit-score-breakdown">
          <span>Service Area Mapping: <b>{formatValue(explanation.service_area_mapping_coverage, '%')}</b></span>
          <span>Site Pincode Coverage: <b>{formatValue(explanation.site_pincode_coverage, '%')}</b></span>
          <span>Pincode Match Rate: <b>{formatValue(explanation.pincode_match_rate, '%')}</b></span>
          <span>Conflict-Free Score: <b>{formatValue(explanation.conflict_free_score, '%')}</b></span>
        </div>
      </div>

      <div className="territory-audit-card-grid">
        <AuditCard label="Service Areas Mapped" value={`${formatNumber(audit.service_areas_with_mapping)} / ${formatNumber(audit.distinct_site_service_areas)}`} note={`${formatNumber(audit.distinct_mapped_service_areas)} mapped in file`} tone="good" />
        <AuditCard label="Sites Without Pincode" value={formatNumber(audit.sites_without_pincode)} note={`${formatNumber(audit.sites_with_pincode)} sites ready`} tone={audit.sites_without_pincode ? 'warning' : 'good'} />
        <AuditCard label="Pincodes Not In Mapping" value={formatNumber(audit.site_pincodes_not_in_mapping)} note={`${formatNumber(audit.pincodes_with_sites)} site pincodes seen`} tone={audit.site_pincodes_not_in_mapping ? 'warning' : 'good'} />
        <AuditCard label="Conflicting Pincodes" value={formatNumber(audit.conflicting_pincode_count)} note="Active pincode conflicts" tone={audit.conflicting_pincode_count ? 'critical' : 'good'} />
        <AuditCard label="Service Areas Without Mapping" value={formatNumber(audit.service_areas_without_mapping)} note="From site master" tone={audit.service_areas_without_mapping ? 'warning' : 'good'} />
        <AuditCard label="Mapping Pincodes Without Sites" value={formatNumber(audit.mapping_pincodes_without_sites)} note="May be valid future coverage" tone="neutral" />
      </div>

      <div className="territory-audit-quality-grid">
        <CompactTable
          title="Service Areas Without Mapping"
          rows={audit.service_areas_without_mapping_list || []}
          columns={[
            { key: 'service_area_name', label: 'Service Area' },
            { key: 'state', label: 'State' },
            { key: 'site_count', label: 'Sites', render: (row) => formatNumber(row.site_count) }
          ]}
        />
        <CompactTable
          title="Sites Without Pincode"
          rows={audit.sites_without_pincode_list || []}
          columns={[
            { key: 'cs_id', label: 'CS ID' },
            { key: 'oracle_site_no', label: 'Oracle Site No' },
            { key: 'site_name', label: 'Site' },
            { key: 'state', label: 'State' },
            { key: 'service_area_name', label: 'Service Area' }
          ]}
        />
      </div>

      <div className="territory-audit-quality-grid">
        <CompactTable
          title="Site Pincodes Missing From Mapping"
          rows={audit.site_pincodes_not_in_mapping_list || []}
          columns={[
            { key: 'pincode', label: 'Pincode' },
            { key: 'state', label: 'State' },
            { key: 'site_count', label: 'Sites', render: (row) => formatNumber(row.site_count) },
            { key: 'service_areas_seen', label: 'Service Areas', render: (row) => (row.service_areas_seen || []).join(', ') || '—' }
          ]}
        />
        <CompactTable
          title="Pincode Mapping Conflicts"
          rows={audit.pincode_mapping_conflicts || []}
          columns={[
            { key: 'pincode', label: 'Pincode' },
            { key: 'service_areas', label: 'Service Areas', render: (row) => (row.service_areas || []).join(', ') || '—' },
            { key: 'states', label: 'States', render: (row) => (row.states || []).join(', ') || '—' }
          ]}
        />
      </div>

      <CompactTable
        title="State Coverage"
        rows={audit.state_coverage || []}
        columns={[
          { key: 'state', label: 'State' },
          { key: 'site_service_areas', label: 'Site Service Areas', render: (row) => formatNumber(row.site_service_areas) },
          { key: 'mapped_service_areas', label: 'Mapped Service Areas', render: (row) => formatNumber(row.mapped_service_areas) },
          { key: 'coverage_percentage', label: 'Coverage', render: (row) => formatValue(row.coverage_percentage, '%') },
          { key: 'sites_without_pincode', label: 'Sites Without Pincode', render: (row) => formatNumber(row.sites_without_pincode) },
          { key: 'risk', label: 'Risk', render: (row) => <span className={`status-badge badge-${riskTone(row.risk)}`}>{row.risk}</span> }
        ]}
      />

      {audit.limitations?.length > 0 && (
        <div className="territory-audit-limitations">
          <AlertTriangle size={16} />
          <div>
            <strong>Limitations</strong>
            <ul>
              {audit.limitations.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
