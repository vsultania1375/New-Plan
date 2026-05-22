const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch (error) {
    const nextError = new Error('Backend unreachable');
    nextError.path = path;
    nextError.kind = 'network';
    throw nextError;
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error || `Request failed: ${response.status}`);
    error.path = path;
    error.kind = 'http';
    error.status = response.status;
    throw error;
  }
  return response.json();
}

const dashboardRequests = {
  overview: '/analytics/overview',
  markers: '/analytics/map/offline',
  stateMap: '/analytics/map/states',
  stateRisk: '/analytics/risk/states',
  serviceAreaRisk: '/analytics/risk/service-areas',
  offlineWithoutTicket: '/analytics/tables/offline-without-ticket',
  ticketWithoutVisit: '/analytics/tables/ticket-without-visit',
  completedStillOffline: '/analytics/tables/completed-still-offline',
  engineerLoad: '/analytics/tables/engineer-load',
  breakdowns: '/analytics/breakdowns'
};

export async function getApiHealth() {
  return request('/health');
}

export async function getDashboardData(fallbacks) {
  const entries = Object.entries(dashboardRequests);
  const results = await Promise.allSettled(entries.map(([, path]) => request(path)));
  const data = { ...fallbacks };
  const failures = [];

  results.forEach((result, index) => {
    const [key, path] = entries[index];
    if (result.status === 'fulfilled') {
      data[key] = result.value;
      return;
    }
    failures.push({
      key,
      path,
      message: result.reason?.message || 'Request failed',
      kind: result.reason?.kind || 'unknown',
      status: result.reason?.status
    });
  });

  return { data, failures };
}

export async function getStateWiseReport() {
  return request('/analytics/state-wise');
}

export async function getEngineerWiseReport() {
  return request('/analytics/engineer-wise');
}

export async function getEngineerWiseDetail(engineerId) {
  return request(`/analytics/engineer-wise/${encodeURIComponent(engineerId)}`);
}

export async function getServiceAreaProfile({ state, serviceArea }) {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  if (serviceArea) params.set('serviceArea', serviceArea);
  return request(`/analytics/service-area-profile?${params.toString()}`);
}

export async function getTerritoryCoverageAudit() {
  return request('/analytics/territory-coverage-audit');
}

export async function getServiceAreaTerritories(state) {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  return request(`/analytics/territories/service-areas?${params.toString()}`);
}

export async function getV3CommandCenter({ state, serviceArea } = {}) {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  if (serviceArea) params.set('serviceArea', serviceArea);
  return request(`/analytics/v3/command-center?${params.toString()}`);
}

export async function getV3SiteIntelligence(siteId) {
  const params = new URLSearchParams();
  if (siteId) params.set('siteId', siteId);
  return request(`/analytics/v3/site-intelligence?${params.toString()}`);
}

export async function getV3DashboardSummary({ state, serviceArea, from, to } = {}) {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  if (serviceArea) params.set('serviceArea', serviceArea);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return request(`/v3/dashboard/summary?${params.toString()}`);
}

export async function getV3StateHealth({ from, to } = {}) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return request(`/v3/dashboard/state-health?${params.toString()}`);
}

export async function getV3ServiceAreaHealth({ state, from, to } = {}) {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return request(`/v3/dashboard/service-area-health?${params.toString()}`);
}

export async function getV3OfflineTrend({ state, serviceArea, from, to } = {}) {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  if (serviceArea) params.set('serviceArea', serviceArea);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return request(`/v3/dashboard/offline-trend?${params.toString()}`);
}

export async function getV3RepeatFailures({ state, serviceArea, from, to } = {}) {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  if (serviceArea) params.set('serviceArea', serviceArea);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return request(`/v3/dashboard/repeat-failures?${params.toString()}`);
}

export async function getV3VisitPerformance({ state, serviceArea, from, to } = {}) {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  if (serviceArea) params.set('serviceArea', serviceArea);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return request(`/v3/dashboard/visit-performance?${params.toString()}`);
}

export async function getV3UploadsHistory() {
  return request('/v3/uploads/history');
}

export async function uploadFile(file, type, adminKey, { dryRun = false } = {}) {
  const formData = new FormData();
  formData.append('file', file);
  if (type) formData.append('type', type);
  return request(`/uploads${dryRun ? '?dryRun=true' : ''}`, {
    method: 'POST',
    headers: { 'x-admin-key': adminKey },
    body: formData
  });
}

export function importSampleFolder(adminKey) {
  return request('/uploads/sample-folder', {
    method: 'POST',
    headers: { 'x-admin-key': adminKey }
  });
}
