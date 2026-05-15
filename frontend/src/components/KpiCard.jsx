import React from 'react';
import { formatNumber } from './format.js';

export function KpiCard({ label, value, note, icon: Icon, tone = 'neutral' }) {
  return (
    <article className={`kpi-card ${tone}`}>
      <div className="kpi-topline">
        <div className="kpi-icon">{Icon && <Icon size={19} />}</div>
        <span>{note}</span>
      </div>
      <p>{label}</p>
      <strong>{formatNumber(value)}</strong>
    </article>
  );
}
