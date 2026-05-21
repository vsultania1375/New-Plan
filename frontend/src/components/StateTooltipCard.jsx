import React from 'react';
import { formatNumber } from './format.js';

export function StateTooltipCard({ state, layerLabel }) {
  return (
    <div className="territory-tooltip">
      <div className="territory-tooltip-title">
        <strong>{state?.state || 'Unmapped state'}</strong>
        <span className={`badge ${state?.riskLevel || 'normal'}`}>{state?.riskLevel || 'normal'}</span>
      </div>
      <p>{layerLabel}</p>
      <dl>
        <dt>Total Sites</dt><dd>{formatNumber(state?.total_sites)}</dd>
        <dt>Total Offline</dt><dd>{formatNumber(state?.total_offline)}</dd>
        <dt>Offline {`>`} 3 Days</dt><dd>{formatNumber(state?.offline_gt_3_days)}</dd>
        <dt>Open Tickets</dt><dd>{formatNumber(state?.open_tickets)}</dd>
        <dt>Pending Tickets</dt><dd>{formatNumber(state?.pending_tickets)}</dd>
        <dt>Completed Tickets</dt><dd>{formatNumber(state?.completed_tickets)}</dd>
        <dt>Closed Tickets</dt><dd>{formatNumber(state?.closed_tickets)}</dd>
        <dt>Active Engineers</dt><dd>{formatNumber(state?.active_engineers)}</dd>
        <dt>Total Service Areas</dt><dd>{formatNumber(state?.total_pops)}</dd>
        <dt>Avg TAT</dt><dd>{state?.avg_tat ?? '-'}</dd>
      </dl>
    </div>
  );
}
