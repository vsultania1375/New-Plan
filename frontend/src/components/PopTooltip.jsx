import React from 'react';

export function PopTooltip({ marker }) {
  const status = marker.ticket_status_counts || {};

  return (
    <div className="map-tooltip">
      <strong>{marker.service_area_name}</strong>
      <span>{marker.state}</span>
      <dl>
        <dt>Ticket Assignment</dt><dd>{marker.engineer_name || 'Not official owner'}</dd>
        <dt>Offline</dt><dd>{marker.offline_sites}</dd>
        <dt>{'>'}5 days</dt><dd>{marker.offline_more_than_5_days}</dd>
        <dt>Total sites</dt><dd>{marker.total_mapped_sites}</dd>
        <dt>Visited 30d</dt><dd>{marker.total_ticket_visits}</dd>
        <dt>Open</dt><dd>{status.OPEN || 0}</dd>
        <dt>Pending</dt><dd>{status.PENDING || 0}</dd>
        <dt>Completed</dt><dd>{status.COMPLETED || 0}</dd>
        <dt>Closed</dt><dd>{status.CLOSED || 0}</dd>
        <dt>Avg TAT</dt><dd>{marker.avg_ticket_aging || '-'}</dd>
      </dl>
    </div>
  );
}
