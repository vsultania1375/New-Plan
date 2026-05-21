import React from 'react';
import { ArrowRight } from 'lucide-react';
import { formatNumber } from './format.js';

export function SelectedPopInsight({ pop }) {
  if (!pop) {
    return (
      <section className="selected-pop empty">
        <span>Hover or click a Service Area marker to see details.</span>
      </section>
    );
  }

  const risk = pop.riskLevel === 'critical' ? 'Critical' : pop.riskLevel === 'warning' ? 'Warning' : 'Normal';

  return (
    <section className="selected-pop">
      <div>
        <span>Region</span>
        <strong>{pop.state || '-'}</strong>
      </div>
      <div>
        <span>Service Area</span>
        <strong>{pop.service_area_name}</strong>
      </div>
      <div>
        <span>Engineer</span>
        <strong>{pop.engineer_name || 'From ticket assignments'}</strong>
      </div>
      <div>
        <span>Risk Level</span>
        <b className={`badge ${pop.riskLevel}`}>{risk}</b>
      </div>
      <div>
        <span>Offline</span>
        <strong>{formatNumber(pop.offline_sites)}</strong>
      </div>
      <div>
        <span>{'>'}5 Days</span>
        <strong>{formatNumber(pop.offline_more_than_5_days)}</strong>
      </div>
      <div>
        <span>Avg TAT</span>
        <strong>{pop.avg_ticket_aging || '-'}</strong>
      </div>
      <div>
        <span>Visits 30d</span>
        <strong>{formatNumber(pop.total_ticket_visits)}</strong>
      </div>
      <button className="secondary-button">View Service Area Detail <ArrowRight size={15} /></button>
    </section>
  );
}
