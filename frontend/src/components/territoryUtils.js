export const MAP_LAYERS = [
  { key: 'coverage', label: 'Coverage', metric: 'total_sites', tone: 'blue' },
  { key: 'offline', label: 'Offline Severity', metric: 'offline_gt_3_days', tone: 'red' },
  { key: 'tickets', label: 'Ticket Load', metric: 'active_tickets', tone: 'orange' },
  { key: 'productivity', label: 'Engineer Productivity', metric: 'visits_per_engineer', tone: 'green' }
];

const STATE_ALIASES = {
  ANDAMANANDNICOBAR: 'ANDAMANANDNICOBARISLANDS',
  ANDAMANANDNICOBARISLAND: 'ANDAMANANDNICOBARISLANDS',
  DELHI: 'NCTOFDELHI',
  NATIONALCAPITALTERRITORYOFDELHI: 'NCTOFDELHI',
  ORISSA: 'ODISHA',
  PONDICHERRY: 'PUDUCHERRY',
  JAMMUKASHMIR: 'JAMMUANDKASHMIR',
  DADRAANDNAGARHAVELI: 'DADRAANDNAGARHAVELIANDDAMANANDDIU',
  DAMANANDDIU: 'DADRAANDNAGARHAVELIANDDAMANANDDIU'
};

export function normalizeStateName(value) {
  const cleaned = String(value || 'Unknown').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return STATE_ALIASES[cleaned] || cleaned;
}

export function getFeatureStateName(feature) {
  const properties = feature?.properties || {};
  return properties.state || properties.name || properties.ST_NM || properties.st_nm || properties.NAME_1 || 'Unknown';
}

export function sumStateRows(rows = []) {
  return rows.reduce((summary, row) => {
    summary.total_sites += Number(row.total_sites || 0);
    summary.total_offline += Number(row.total_offline || 0);
    summary.offline_gt_3_days += Number(row.offline_gt_3_days || 0);
    summary.open_tickets += Number(row.open_tickets || 0);
    summary.pending_tickets += Number(row.pending_tickets || 0);
    summary.completed_tickets += Number(row.completed_tickets || 0);
    summary.closed_tickets += Number(row.closed_tickets || 0);
    summary.active_engineers += Number(row.active_engineers || 0);
    summary.total_pops += Number(row.total_pops || 0);
    summary.total_visits += Number(row.total_visits || 0);
    summary.avg_tat_total += Number(row.avg_tat || 0) * Number(row.active_tickets || 0);
    summary.avg_tat_weight += Number(row.active_tickets || 0);
    return summary;
  }, {
    state: 'PAN India',
    total_sites: 0,
    total_offline: 0,
    offline_gt_3_days: 0,
    open_tickets: 0,
    pending_tickets: 0,
    completed_tickets: 0,
    closed_tickets: 0,
    active_engineers: 0,
    total_pops: 0,
    total_visits: 0,
    avg_tat_total: 0,
    avg_tat_weight: 0
  });
}

export function finalizeSummary(summary) {
  if (!summary) return null;
  return {
    ...summary,
    avg_tat: summary.avg_tat_weight ? Math.round((summary.avg_tat_total / summary.avg_tat_weight) * 10) / 10 : null
  };
}

export function getMetricValue(row, layerKey) {
  if (!row) return 0;
  if (layerKey === 'coverage') return Number(row.total_sites || 0);
  if (layerKey === 'offline') return Number(row.offline_gt_3_days || row.total_offline || 0);
  if (layerKey === 'tickets') return Number(row.active_tickets || 0);
  if (layerKey === 'productivity') return Number(row.visits_per_engineer || 0);
  return 0;
}

export function getTerritoryFill(value, max, layerKey) {
  if (!value || !max) return '#eef2f7';
  const ratio = Math.min(1, Math.max(0.12, value / max));
  if (layerKey === 'offline') {
    if (ratio > 0.72) return '#dc2626';
    if (ratio > 0.4) return '#f97316';
    return '#fcd34d';
  }
  if (layerKey === 'tickets') {
    if (ratio > 0.72) return '#c2410c';
    if (ratio > 0.4) return '#f97316';
    return '#fed7aa';
  }
  if (layerKey === 'productivity') {
    if (ratio > 0.72) return '#16a34a';
    if (ratio > 0.4) return '#22c55e';
    return '#bbf7d0';
  }
  if (ratio > 0.72) return '#1d4ed8';
  if (ratio > 0.4) return '#3b82f6';
  return '#bfdbfe';
}
