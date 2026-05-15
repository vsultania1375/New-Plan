import React from 'react';
import { ArrowRight } from 'lucide-react';
import { formatNumber, formatPercent } from './format.js';

export function GroundLagFunnel({ overview }) {
  const total = Number(overview.total_offline_sites || 0);
  const noTicket = Number(overview.offline_without_active_engineer_ticket || 0);
  const ticketsCreated = Math.max(0, total - noTicket);
  const noVisit = Number(overview.active_ticket_without_visit || 0);
  const visitDone = Math.max(0, ticketsCreated - noVisit);
  const closedProxy = Math.max(0, visitDone - Number(overview.offline_more_than_5_days || 0));

  const steps = [
    { label: 'Offline Sites', value: total, tone: 'neutral' },
    { label: 'Tickets Created', value: ticketsCreated, tone: ticketsCreated < total * 0.6 ? 'critical' : 'good' },
    { label: 'Engineer Assigned', value: Number(overview.active_engineer_tickets || 0), tone: 'neutral' },
    { label: 'Visit Done', value: visitDone, tone: noVisit > ticketsCreated * 0.2 ? 'warning' : 'good' },
    { label: 'Closed / Cleared', value: closedProxy, tone: 'good' }
  ];

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p>Ground Lag Funnel</p>
          <h2>Where the Work Is Leaking</h2>
        </div>
      </div>
      <div className="flow-funnel">
        {steps.map((step, index) => (
          <React.Fragment key={step.label}>
            <article className={`flow-step ${step.tone}`}>
              <span>{step.label}</span>
              <strong>{formatNumber(step.value)}</strong>
              <small>{formatPercent(total ? (step.value / total) * 100 : 0)} of offline load</small>
            </article>
            {index < steps.length - 1 && <ArrowRight className="flow-arrow" size={22} />}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
