export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '0';
  return Number(value).toLocaleString('en-IN');
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}

export function markerColor(risk) {
  if (risk === 'critical') return '#dc2626';
  if (risk === 'warning') return '#f97316';
  return '#2563eb';
}

export function riskLabel(score) {
  if (score >= 75) return 'Critical';
  if (score >= 45) return 'Watch';
  return 'Stable';
}

export function riskClass(score) {
  if (score >= 75) return 'critical';
  if (score >= 45) return 'warning';
  return 'good';
}
