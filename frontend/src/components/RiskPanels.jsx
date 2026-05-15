import React from 'react';
import { formatNumber, riskClass } from './format.js';

export function RiskStatesPanel({ rows }) {
  const max = Math.max(...rows.slice(0, 6).map((row) => Number(row.offline_without_active_ticket || 0)), 1);
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p>Top Risk States</p>
          <h2>State Lag Concentration</h2>
        </div>
      </div>
      <div className="risk-list">
        {rows.slice(0, 6).map((row) => {
          const score = Math.min(100, Math.round(Number(row.offline_without_active_ticket || 0) * 0.8 + Number(row.offline_more_than_5_days || 0) * 0.4));
          return (
            <article key={row.state} className="risk-row">
              <div>
                <strong>{row.state}</strong>
                <span>{formatNumber(row.offline_more_than_5_days)} older than 5 days</span>
              </div>
              <div className="risk-bar"><i style={{ width: `${(Number(row.offline_without_active_ticket || 0) / max) * 100}%` }} /></div>
              <b className={`badge ${riskClass(score)}`}>{score >= 75 ? 'Critical' : score >= 45 ? 'Watch' : 'Stable'}</b>
              <small>No ticket {formatNumber(row.offline_without_active_ticket)}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function RiskPopsPanel({ rows, engineers }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p>Top Risk POPs</p>
          <h2>Service Areas Needing Action</h2>
        </div>
      </div>
      <div className="pop-risk-grid">
        {rows.slice(0, 6).map((row, index) => {
          const score = Math.min(100, Math.round(Number(row.offline_more_than_5_days || 0) * 7 + Number(row.offline_sites || 0) * 1.2));
          return (
            <article key={`${row.service_area_name}-${row.state}`} className="pop-risk-card">
              <div className="pop-risk-title">
                <div>
                  <strong>{row.service_area_name}</strong>
                  <span>{row.state}</span>
                </div>
                <b className={`badge ${riskClass(score)}`}>{score >= 75 ? 'Critical' : score >= 45 ? 'Watch' : 'Stable'}</b>
              </div>
              <dl>
                <dt>Engineer</dt><dd>{engineers[index]?.employee_name || 'Ticket mapped'}</dd>
                <dt>{'>'}5 days</dt><dd>{formatNumber(row.offline_more_than_5_days)}</dd>
                <dt>Avg TAT</dt><dd>{row.avg_ticket_aging || '-'}</dd>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}
