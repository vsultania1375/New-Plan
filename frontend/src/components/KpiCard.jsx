import React from 'react';
import { formatNumber } from './format.js';

function displayValue(value, suffix = '') {
  if (value === null || value === undefined || value === '') return '—';
  return `${formatNumber(value)}${suffix}`;
}

export function KpiCard({ label, value, note, icon: Icon, tone = 'neutral', valueSuffix = '', rows = [], helperText = '' }) {
  return (
    <article className={`kpi-card ${tone}`}>
      <div className="kpi-topline">
        <div className="kpi-icon">{Icon && <Icon size={19} />}</div>
        <span>{note}</span>
      </div>
      <p>{label}</p>
      <strong>{displayValue(value, valueSuffix)}</strong>
      {rows.length > 0 && (
        <dl className="kpi-detail-list">
          {rows.map(({ label: rowLabel, value: rowValue }) => (
            <React.Fragment key={rowLabel}>
              <dt>{rowLabel}</dt>
              <dd>{rowValue ?? '—'}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}
      {helperText && <small className="kpi-helper-text">{helperText}</small>}
    </article>
  );
}
