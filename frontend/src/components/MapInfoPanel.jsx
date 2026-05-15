import React from 'react';
import { formatNumber } from './format.js';

function formatPanelValue(label, value) {
  if (value === null || value === undefined || value === '') return '—';
  return label === 'Avg TAT' ? `${formatNumber(value)} days` : formatNumber(value);
}

function getPanelModel({ hoveredState, selectedState, selectedPop }) {
  if (selectedPop) {
    const status = selectedPop.ticket_status_counts || {};
    return {
      eyebrow: 'Selected POP',
      title: selectedPop.service_area_name,
      subtitle: selectedPop.state,
      riskLevel: selectedPop.riskLevel || 'normal',
      rows: [
        ['Total Sites', selectedPop.total_mapped_sites],
        ['Total Offline Sites', selectedPop.offline_sites],
        ['Offline > 3 Days', null],
        ['Open Tickets', status.OPEN || 0],
        ['Pending Tickets', status.PENDING || 0],
        ['Completed Tickets', status.COMPLETED || 0],
        ['Closed Tickets', status.CLOSED || 0],
        ['Active Engineers', null],
        ['Total POPs', null],
        ['Avg TAT', selectedPop.avg_ticket_aging]
      ]
    };
  }

  const state = selectedState || hoveredState;
  if (!state) return null;

  return {
    eyebrow: selectedState ? 'Selected State' : 'Hovered State',
    title: state.state || 'Unmapped state',
    subtitle: null,
    riskLevel: state.riskLevel || 'normal',
    rows: [
      ['Total Sites', state.total_sites],
      ['Total Offline Sites', state.total_offline],
      ['Offline > 3 Days', state.offline_gt_3_days],
      ['Open Tickets', state.open_tickets],
      ['Pending Tickets', state.pending_tickets],
      ['Completed Tickets', state.completed_tickets],
      ['Closed Tickets', state.closed_tickets],
      ['Active Engineers', state.active_engineers],
      ['Total POPs', state.total_pops],
      ['Avg TAT', state.avg_tat]
    ]
  };
}

export function MapInfoPanel(props) {
  const model = getPanelModel(props);

  if (!model) {
    return (
      <section className="map-info-panel empty">
        <p>State Details</p>
        <strong>Hover over a state to view details</strong>
      </section>
    );
  }

  return (
    <section className="map-info-panel">
      <div className="map-info-heading">
        <div>
          <p>{model.eyebrow}</p>
          <h3>{model.title}</h3>
          {model.subtitle && <span>{model.subtitle}</span>}
        </div>
        <span className={`badge ${model.riskLevel}`}>{model.riskLevel}</span>
      </div>
      <dl>
        {model.rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <dt>{label}</dt>
            <dd>{formatPanelValue(label, value)}</dd>
          </React.Fragment>
        ))}
      </dl>
    </section>
  );
}
