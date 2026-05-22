export const MAP_LAYERS = [
  { key: 'serviceHealth', label: 'Service Health', metric: 'health_score', tone: 'green' },
  { key: 'openSiteIssues', label: 'Open Site Issues', metric: 'active_tickets', tone: 'red' },
  { key: 'offlineFrequency', label: 'Offline Frequency', metric: 'offline_gt_3_days', tone: 'red' },
  { key: 'repeatFailures', label: 'Repeat Failures', metric: 'offline_gt_3_days', tone: 'orange' },
  { key: 'slaBreach', label: 'SLA Breach', metric: 'avg_tat', tone: 'red' },
  { key: 'visitDelay', label: 'Visit Delay', metric: 'active_tickets', tone: 'orange' },
  { key: 'vendorDelay', label: 'Vendor Delay', metric: 'active_tickets', tone: 'orange' },
  { key: 'engineerActivity', label: 'Engineer Activity', metric: 'visits_per_engineer', tone: 'green' }
];

export const SERVICE_HEALTH_COLORS = {
  good: '#2E7D32',
  warning: '#D6A100',
  high: '#E67E22',
  critical: '#C0392B',
  noData: '#CBD5E1'
};

export const SERVICE_HEALTH_LEGEND = [
  { key: 'good', label: 'Good', range: '0–2%' },
  { key: 'warning', label: 'Warning', range: '>2–5%' },
  { key: 'high', label: 'High', range: '>5–10%' },
  { key: 'critical', label: 'Critical', range: '>10%' }
];

const STATE_ALIASES = {
  ANDAMANANDNICOBAR: 'ANDAMANANDNICOBARISLANDS',
  ANDAMANANDNICOBARISLAND: 'ANDAMANANDNICOBARISLANDS',
  DELHI: 'DELHI',
  NCTOFDELHI: 'DELHI',
  NCTDELHI: 'DELHI',
  NATIONALCAPITALTERRITORYOFDELHI: 'DELHI',
  NEWDELHI: 'DELHI',
  ORISSA: 'ODISHA',
  ODISA: 'ODISHA',
  PONDICHERRY: 'PUDUCHERRY',
  KERLA: 'KERALA',
  JAMMUKASHMIR: 'JAMMUANDKASHMIR',
  UTTARPARDESH: 'UTTARPRADESH',
  DADRAANDNAGRAHAVELIANDDAMANANDDIU: 'DADRAANDNAGARHAVELIANDDAMANANDDIU',
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

export function calculatePercentage(numerator, denominator) {
  const total = Number(denominator);
  const value = Number(numerator);
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(value)) return null;
  return Math.round((value / total) * 1000) / 10;
}

export function formatCountWithPercentage(count, total) {
  if (count === null || count === undefined || count === '') return '—';
  const numericCount = Number(count);
  if (!Number.isFinite(numericCount)) return '—';
  const formattedCount = numericCount.toLocaleString('en-IN');
  const percent = calculatePercentage(numericCount, total);
  if (percent === null) return formattedCount;
  return `${formattedCount} / ${Number(total).toLocaleString('en-IN')} (${percent}%)`;
}

export function getOfflinePercentage(row) {
  if (!row) return null;
  const numerator = row.offline_gt_3_days ?? row.total_offline;
  return calculatePercentage(numerator, row.total_sites);
}

export function getServiceHealthSeverity(percent) {
  if (percent === null || percent === undefined || !Number.isFinite(Number(percent))) return 'noData';
  if (percent > 10) return 'critical';
  if (percent > 5) return 'high';
  if (percent > 2) return 'warning';
  return 'good';
}

export function getOfflineSeverityColorByPercentage(percent) {
  const severity = getServiceHealthSeverity(percent);
  return SERVICE_HEALTH_COLORS[severity] || SERVICE_HEALTH_COLORS.noData;
}

export function getOfflineSeverityLabelByPercentage(percent) {
  const severity = getServiceHealthSeverity(percent);
  if (severity === 'critical') return 'Critical';
  if (severity === 'high') return 'High';
  if (severity === 'warning') return 'Warning';
  if (severity === 'good') return 'Normal';
  return 'No data';
}

export function getMetricValue(row, layerKey) {
  if (!row) return null;
  if (layerKey === 'serviceHealth') {
    return getOfflinePercentage(row);
  }
  if (layerKey === 'openSiteIssues') return Number(row.active_tickets || 0);
  if (layerKey === 'offlineFrequency') return getOfflinePercentage(row) ?? 0;
  if (layerKey === 'repeatFailures') return Number(row.offline_gt_3_days || row.total_offline || 0);
  if (layerKey === 'slaBreach') return Number(row.avg_tat || 0);
  if (layerKey === 'visitDelay') return Number(row.active_tickets || 0);
  if (layerKey === 'vendorDelay') return Number(row.pending_tickets || row.active_tickets || 0);
  if (layerKey === 'engineerActivity') return Number(row.visits_per_engineer || 0);
  return 0;
}

export function getTerritoryFill(value, max, layerKey) {
  if (layerKey === 'serviceHealth' || layerKey === 'offlineFrequency') {
    return getOfflineSeverityColorByPercentage(value);
  }
  if (!value || !max) return '#eef2f7';
  const ratio = Math.min(1, Math.max(0.12, value / max));
  if (['openSiteIssues', 'repeatFailures', 'slaBreach', 'visitDelay', 'vendorDelay'].includes(layerKey)) {
    if (ratio > 0.72) return '#c2410c';
    if (ratio > 0.4) return '#f97316';
    return '#fed7aa';
  }
  if (layerKey === 'engineerActivity') {
    if (ratio > 0.72) return '#16a34a';
    if (ratio > 0.4) return '#22c55e';
    return '#bbf7d0';
  }
  if (ratio > 0.72) return '#1d4ed8';
  if (ratio > 0.4) return '#3b82f6';
  return '#bfdbfe';
}
