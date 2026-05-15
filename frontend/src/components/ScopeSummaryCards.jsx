import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, MapPinned, Ticket, Users, Wrench } from 'lucide-react';
import { formatNumber } from './format.js';

const cards = [
  { key: 'total_sites', label: 'Total Sites', icon: MapPinned, tone: 'neutral' },
  { key: 'total_offline', label: 'Total Offline', icon: Activity, tone: 'warning' },
  { key: 'offline_gt_3_days', label: 'Offline > 3 Days', icon: AlertTriangle, tone: 'critical' },
  { key: 'open_tickets', label: 'Open Tickets', icon: Ticket, tone: 'neutral' },
  { key: 'pending_tickets', label: 'Pending Tickets', icon: Clock, tone: 'warning' },
  { key: 'completed_tickets', label: 'Completed Tickets', icon: CheckCircle2, tone: 'good' },
  { key: 'closed_tickets', label: 'Closed Tickets', icon: Wrench, tone: 'neutral' },
  { key: 'active_engineers', label: 'Active Engineers', icon: Users, tone: 'good' },
  { key: 'total_pops', label: 'Total POP Locations', icon: MapPinned, tone: 'neutral' },
  { key: 'avg_tat', label: 'Avg TAT', icon: Clock, tone: 'warning', suffix: ' days' }
];

export function ScopeSummaryCards({ scopeLabel, summary }) {
  return (
    <section className="scope-summary-section">
      <div className="section-title compact-title">
        <p>Selected Scope</p>
        <h2>{scopeLabel}</h2>
      </div>
      <div className="scope-summary-grid">
        {cards.map(({ key, label, icon: Icon, tone, suffix }) => (
          <article key={key} className={`scope-card ${tone}`}>
            <span><Icon size={16} /> {label}</span>
            <strong>{key === 'avg_tat' && summary?.[key] == null ? '-' : `${formatNumber(summary?.[key])}${suffix || ''}`}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
