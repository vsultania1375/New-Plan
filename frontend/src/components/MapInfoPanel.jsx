import React from 'react';
import { formatNumber } from './format.js';
import { calculatePercentage, formatCountWithPercentage, getOfflinePercentage, getOfflineSeverityLabelByPercentage } from './territoryUtils.js';

function formatPanelValue(label, value, model) {
  if (value === null || value === undefined || value === '') return '—';
  return label === 'Avg TAT' ? `${formatNumber(value)} days` : formatNumber(value);
}

function formatTicketCount(count, model) {
  if (count === null || count === undefined || count === '') return '—';
  const totalTickets = ['open_tickets', 'pending_tickets', 'completed_tickets', 'closed_tickets']
    .reduce((sum, key) => sum + Number(model[key] || 0), 0);
  const percent = calculatePercentage(count, totalTickets);
  return percent === null ? formatNumber(count) : `${formatNumber(count)} (${percent}%)`;
}

function getRows(model) {
  const offlinePercent = getOfflinePercentage(model);
  return [
    ['Total Sites', model.total_sites],
    ['Total Offline Sites', formatCountWithPercentage(model.total_offline, model.total_sites)],
    ['Offline > 3 Days', formatCountWithPercentage(model.offline_gt_3_days, model.total_sites)],
    ['Offline %', offlinePercent === null ? '—' : `${offlinePercent}%`],
    ['Open Tickets', formatTicketCount(model.open_tickets, model)],
    ['Pending Tickets', formatTicketCount(model.pending_tickets, model)],
    ['Completed Tickets', formatTicketCount(model.completed_tickets, model)],
    ['Closed Tickets', formatTicketCount(model.closed_tickets, model)],
    ['Active Engineers', model.active_engineers],
    ['Total Service Areas', model.total_pops],
    ['Avg TAT', model.avg_tat]
  ];
}

function getCompactRows(rows, isServiceArea) {
  const allowed = isServiceArea
    ? new Set(['Total Sites', 'Total Offline Sites', 'Offline %', 'Open Tickets', 'Pending Tickets', 'Avg TAT'])
    : new Set(['Total Sites', 'Total Offline Sites', 'Offline > 3 Days', 'Offline %', 'Open Tickets', 'Pending Tickets', 'Active Engineers', 'Avg TAT']);
  return rows.filter(([label]) => allowed.has(label));
}

function getPanelModel({ hoveredState, selectedState, selectedPop, panIndiaSummary, variant }) {
  if (selectedPop) {
    const status = selectedPop.ticket_status_counts || {};
    const popModel = {
      total_sites: selectedPop.total_mapped_sites,
      total_offline: selectedPop.offline_sites,
      offline_gt_3_days: selectedPop.offline_gt_3_days ?? null,
      open_tickets: status.OPEN || 0,
      pending_tickets: status.PENDING || 0,
      completed_tickets: status.COMPLETED || 0,
      closed_tickets: status.CLOSED || 0,
      active_engineers: null,
      total_pops: null,
      avg_tat: selectedPop.avg_ticket_aging
    };
    const rows = getRows(popModel);
    return {
      eyebrow: 'Selected Service Area',
      title: selectedPop.service_area_name,
      subtitle: selectedPop.state,
      riskLevel: selectedPop.riskLevel || 'normal',
      riskLabel: selectedPop.riskLevel
        ? `${selectedPop.riskLevel.charAt(0).toUpperCase()}${selectedPop.riskLevel.slice(1)}`
        : 'Normal',
      rows: variant === 'compact' ? getCompactRows(rows, true) : rows
    };
  }

  const state = selectedState || hoveredState || panIndiaSummary;
  if (!state) return null;
  const offlinePercent = getOfflinePercentage(state);
  const severityLabel = getOfflineSeverityLabelByPercentage(offlinePercent);
  const riskTone = severityLabel === 'Critical'
    ? 'critical'
    : severityLabel === 'High'
    ? 'high'
    : severityLabel === 'Warning'
    ? 'warning'
    : 'normal';

  const rows = getRows(state);
  return {
    eyebrow: selectedState ? 'Selected State' : hoveredState ? 'Hovered State' : 'Scope',
    title: state.state || 'Unmapped state',
    subtitle: null,
    riskLevel: riskTone,
    riskLabel: severityLabel,
    rows: variant === 'compact' ? getCompactRows(rows, false) : rows
  };
}

export function MapInfoPanel(props) {
  const model = getPanelModel(props);
  const isCompact = props.variant === 'compact';

  if (!model) {
    return (
      <section className={`map-info-panel empty${isCompact ? ' compact' : ''}`}>
        <p>State Details</p>
        <strong>Hover over a state to view details</strong>
      </section>
    );
  }

  return (
    <section className={`map-info-panel${isCompact ? ' compact' : ''}`}>
      <div className="map-info-heading">
        <div>
          <p>{model.eyebrow}</p>
          <h3>{model.title}</h3>
          {model.subtitle && <span>{model.subtitle}</span>}
        </div>
        <span className={`badge ${model.riskLevel}`}>{model.riskLabel || model.riskLevel}</span>
      </div>
      <dl>
        {model.rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <dt>{label}</dt>
            <dd>{label !== 'Avg TAT' && typeof value === 'string' ? value : formatPanelValue(label, value, model)}</dd>
          </React.Fragment>
        ))}
      </dl>
    </section>
  );
}
