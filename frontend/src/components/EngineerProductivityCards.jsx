import React from 'react';
import { Award, BatteryWarning, Gauge, Users } from 'lucide-react';
import { formatNumber } from './format.js';

export function EngineerProductivityCards({ rows }) {
  const productive = [...rows].sort((a, b) => Number(b.total_ticket_visits || 0) - Number(a.total_ticket_visits || 0)).slice(0, 3);
  const low = rows.filter((row) => Number(row.total_ticket_visits || 0) === 0).slice(0, 3);
  const highLoad = [...rows].sort((a, b) => Number(b.active_tickets || 0) - Number(a.active_tickets || 0)).slice(0, 3);
  const totalVisits = rows.reduce((sum, row) => sum + Number(row.total_ticket_visits || 0), 0);
  const avgVisits = rows.length ? (totalVisits / rows.length).toFixed(1) : '0';

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p>Engineer Productivity</p>
          <h2>Action Signals Before the Detail Table</h2>
        </div>
      </div>
      <div className="engineer-visual-grid">
        <article className="engineer-summary-card">
          <Gauge size={20} />
          <span>Avg visits per engineer</span>
          <strong>{avgVisits}</strong>
          <small>MVP based on ticket visit counts</small>
        </article>
        <article className="engineer-list-card good">
          <h3><Award size={17} /> Top Productive</h3>
          {productive.map((row) => <p key={row.employee_id || row.employee_name}>{row.employee_name}<b>{formatNumber(row.total_ticket_visits)}</b></p>)}
        </article>
        <article className="engineer-list-card critical">
          <h3><BatteryWarning size={17} /> Zero Productivity</h3>
          {low.length ? low.map((row) => <p key={row.employee_id || row.employee_name}>{row.employee_name}<b>{formatNumber(row.active_tickets)} tickets</b></p>) : <p>No zero-visit engineer in current top list<b>0</b></p>}
        </article>
        <article className="engineer-list-card warning">
          <h3><Users size={17} /> High Load</h3>
          {highLoad.map((row) => <p key={row.employee_id || row.employee_name}>{row.employee_name}<b>{formatNumber(row.active_tickets)}</b></p>)}
        </article>
      </div>
    </section>
  );
}
