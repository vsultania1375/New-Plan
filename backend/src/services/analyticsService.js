import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query } from '../db/pool.js';

const activeStatuses = ['OPEN', 'PENDING', 'COMPLETED', 'SENTBACK', 'SENDBACK'];
const activeOwnershipStatuses = ['YES', 'ACTIVE', 'TRUE'];
const engineerActiveStatuses = ['YES'];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const opencityPincodeGeojsonPath = path.resolve(__dirname, '../../../geo-source/india-pincodes-opencity.geojson');
const serviceAreaGeometryMode = 'grouped_multipolygon';
const dissolveAvailable = false;

let opencityPincodeGeometryCache = null;

const stateKeyAliases = {
  ANDAMANANDNICOBAR: 'ANDAMANANDNICOBARISLANDS',
  ANDAMANANDNICOBARISLAND: 'ANDAMANANDNICOBARISLANDS',
  CHHATISGARH: 'CHHATTISGARH',
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
  DADRAANDNAGRAHAVELI: 'DADRAANDNAGARHAVELIANDDAMANANDDIU',
  DAMANANDDIU: 'DADRAANDNAGARHAVELIANDDAMANANDDIU'
};

const stateDisplayNames = {
  DELHI: 'Delhi',
  ANDAMANANDNICOBARISLANDS: 'Andaman and Nicobar Islands',
  JAMMUANDKASHMIR: 'Jammu and Kashmir',
  DADRAANDNAGARHAVELIANDDAMANANDDIU: 'Dadra and Nagar Haveli and Daman and Diu',
  PUDUCHERRY: 'Puducherry',
  CHHATTISGARH: 'Chhattisgarh',
  UTTARPRADESH: 'Uttar Pradesh'
};

function canonicalStateKey(value) {
  const key = String(value || 'Unknown').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return stateKeyAliases[key] || key;
}

function equivalentStateKeys(value) {
  const rawKey = String(value || 'Unknown').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const canonicalKey = canonicalStateKey(rawKey);
  const keys = new Set([canonicalKey, rawKey]);
  for (const [alias, target] of Object.entries(stateKeyAliases)) {
    if (target === canonicalKey) keys.add(alias);
  }
  return [...keys].filter(Boolean);
}

function mergeStateRows(rows) {
  const merged = new Map();

  for (const row of rows) {
    const key = canonicalStateKey(row.state_key || row.state);
    const current = merged.get(key) || {
      state: stateDisplayNames[key] || row.state,
      state_key: key,
      total_sites: 0,
      total_offline: 0,
      offline_gt_3_days: 0,
      open_tickets: 0,
      pending_tickets: 0,
      completed_tickets: 0,
      closed_tickets: 0,
      active_tickets: 0,
      active_engineers: 0,
      total_pops: 0,
      total_visits: 0,
      visiting_engineers: 0,
      avg_tat_total: 0,
      avg_tat_weight: 0
    };

    current.total_sites += Number(row.total_sites || 0);
    current.total_offline += Number(row.total_offline || 0);
    current.offline_gt_3_days += Number(row.offline_gt_3_days || 0);
    current.open_tickets += Number(row.open_tickets || 0);
    current.pending_tickets += Number(row.pending_tickets || 0);
    current.completed_tickets += Number(row.completed_tickets || 0);
    current.closed_tickets += Number(row.closed_tickets || 0);
    current.active_tickets += Number(row.active_tickets || 0);
    current.active_engineers += Number(row.active_engineers || 0);
    current.total_pops += Number(row.total_pops || 0);
    current.total_visits += Number(row.total_visits || 0);
    current.visiting_engineers += Number(row.visiting_engineers || 0);
    current.avg_tat_total += Number(row.avg_tat || 0) * Number(row.active_tickets || 0);
    current.avg_tat_weight += Number(row.active_tickets || 0);

    merged.set(key, current);
  }

  return Array.from(merged.values()).map((row) => ({
    ...row,
    visits_per_engineer: row.active_engineers ? Math.round((row.total_visits / row.active_engineers) * 10) / 10 : null,
    avg_tat: row.avg_tat_weight ? Math.round((row.avg_tat_total / row.avg_tat_weight) * 10) / 10 : null,
    riskLevel: row.offline_gt_3_days >= 100 ? 'critical' : row.offline_gt_3_days >= 25 ? 'warning' : 'normal'
  })).sort((a, b) => b.offline_gt_3_days - a.offline_gt_3_days || b.total_offline - a.total_offline || a.state.localeCompare(b.state));
}

export async function getOverview() {
  const { rows } = await query(
    `
    WITH latest_offline AS (
      SELECT *
      FROM offline_data_master
      WHERE data_date = (SELECT MAX(data_date) FROM offline_data_master)
    ),
    active_tickets AS (
      SELECT *
      FROM view_ticket
      WHERE UPPER(ticket_assigned_type) = 'ENGINEER'
        AND ticket_status = ANY($1)
    ),
    visit_counts AS (
      SELECT ticket_id, COUNT(*)::int AS visit_count
      FROM visit_master
      WHERE ticket_id IS NOT NULL
      GROUP BY ticket_id
    )
    SELECT
      -- Site denominator rule: total_sites counts all sites in scope.
      -- Do not filter by customer_site_master.active_status until business rule changes.
      (SELECT COUNT(DISTINCT oracle_site_no)::int FROM customer_site_master) AS total_sites,
      NULL::int AS total_psu_sites,
      NULL::int AS total_pvt_sites,
      (SELECT COUNT(*)::int FROM latest_offline) AS total_offline_sites,
      (SELECT COUNT(*)::int FROM latest_offline WHERE segment = 'PSU') AS psu_offline_sites,
      (SELECT COUNT(*)::int FROM latest_offline WHERE segment = 'PVT') AS pvt_offline_sites,
      (SELECT COUNT(*)::int FROM latest_offline WHERE aging_days > 5) AS offline_more_than_5_days,
      (SELECT COUNT(*)::int FROM active_tickets) AS active_engineer_tickets,
      (SELECT ROUND(AVG(aging_days)::numeric, 1) FROM active_tickets) AS avg_ticket_aging,
      (
        SELECT COUNT(DISTINCT o.cs_id)::int
        FROM latest_offline o
        LEFT JOIN active_tickets t ON t.cs_id = o.cs_id
        WHERE t.ticket_id IS NULL
      ) AS offline_without_active_engineer_ticket,
      (
        SELECT COUNT(DISTINCT o.cs_id)::int
        FROM latest_offline o
        JOIN active_tickets t ON t.cs_id = o.cs_id
        LEFT JOIN visit_counts v ON v.ticket_id = t.ticket_id
        WHERE COALESCE(v.visit_count, t.total_visits, 0) = 0
      ) AS active_ticket_without_visit,
      (
        SELECT COUNT(*)::int
        FROM engineer_master
        WHERE active_status = 'YES' AND UPPER(designation) = 'ENGINEER'
      ) AS active_engineers,
      (
        SELECT COUNT(DISTINCT NULLIF(TRIM(service_area_name), ''))::int
        FROM customer_site_master
      ) AS total_pops,
      (
        SELECT COUNT(*)::int
        FROM (
          SELECT NULLIF(TRIM(service_area_name), '') AS service_area_name
          FROM customer_site_master
          WHERE NULLIF(TRIM(service_area_name), '') IS NOT NULL
          GROUP BY NULLIF(TRIM(service_area_name), '')
          HAVING COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) = 0
        ) missing_pop_coordinates
      ) AS blank_pops
    `,
    [activeStatuses]
  );
  const overview = rows[0];
  const offlineTotal = Number(overview.total_offline_sites || 0);
  const activeTicketTotal = Number(overview.active_engineer_tickets || 0);

  return {
    ...overview,
    avg_tat: overview.avg_ticket_aging,
    avg_tat_unit: 'days',
    offline_without_ticket_percentage: offlineTotal
      ? Math.round((Number(overview.offline_without_active_engineer_ticket || 0) / offlineTotal) * 1000) / 10
      : null,
    ticket_without_visit_percentage: activeTicketTotal
      ? Math.round((Number(overview.active_ticket_without_visit || 0) / activeTicketTotal) * 1000) / 10
      : null,
    psu_offline_percentage: null,
    pvt_offline_percentage: null
  };
}

export async function getStateRisk() {
  const { rows } = await query(
    `
    WITH latest_offline AS (
      SELECT * FROM offline_data_master
      WHERE data_date = (SELECT MAX(data_date) FROM offline_data_master)
    ),
    active_tickets AS (
      SELECT DISTINCT cs_id
      FROM view_ticket
      WHERE UPPER(ticket_assigned_type) = 'ENGINEER'
        AND ticket_status = ANY($1)
    )
    SELECT
      COALESCE(o.state, 'Unknown') AS state,
      COUNT(*)::int AS offline_sites,
      COUNT(*) FILTER (WHERE o.segment = 'PSU')::int AS psu_offline_sites,
      COUNT(*) FILTER (WHERE o.aging_days > 5)::int AS offline_more_than_5_days,
      COUNT(*) FILTER (WHERE t.cs_id IS NULL)::int AS offline_without_active_ticket,
      ROUND(AVG(o.aging_days)::numeric, 1) AS avg_offline_aging
    FROM latest_offline o
    LEFT JOIN active_tickets t ON t.cs_id = o.cs_id
    GROUP BY COALESCE(o.state, 'Unknown')
    ORDER BY offline_without_active_ticket DESC, offline_sites DESC
    LIMIT 20
    `,
    [activeStatuses]
  );
  return rows;
}

export async function getServiceAreaRisk() {
  const { rows } = await query(
    `
    WITH latest_offline AS (
      SELECT * FROM offline_data_master
      WHERE data_date = (SELECT MAX(data_date) FROM offline_data_master)
    ),
    active_tickets AS (
      SELECT *
      FROM view_ticket
      WHERE UPPER(ticket_assigned_type) = 'ENGINEER'
        AND ticket_status = ANY($1)
    ),
    visit_counts AS (
      SELECT ticket_id, COUNT(*)::int AS visit_count
      FROM visit_master
      WHERE ticket_id IS NOT NULL
      GROUP BY ticket_id
    )
    SELECT
      COALESCE(s.service_area_name, t.service_area_name, 'Unmapped') AS service_area_name,
      COALESCE(s.state, o.state, t.state, 'Unknown') AS state,
      COUNT(DISTINCT o.cs_id)::int AS offline_sites,
      COUNT(DISTINCT o.cs_id) FILTER (WHERE o.aging_days > 5)::int AS offline_more_than_5_days,
      COUNT(DISTINCT s.oracle_site_no)::int AS total_mapped_sites,
      COUNT(DISTINCT t.ticket_id)::int AS active_tickets,
      COALESCE(SUM(COALESCE(v.visit_count, t.total_visits, 0)), 0)::int AS total_ticket_visits,
      ROUND(AVG(t.aging_days)::numeric, 1) AS avg_ticket_aging
    FROM latest_offline o
    LEFT JOIN customer_site_master s ON s.cs_id = o.cs_id
    LEFT JOIN active_tickets t ON t.cs_id = o.cs_id
    LEFT JOIN visit_counts v ON v.ticket_id = t.ticket_id
    GROUP BY COALESCE(s.service_area_name, t.service_area_name, 'Unmapped'), COALESCE(s.state, o.state, t.state, 'Unknown')
    ORDER BY offline_more_than_5_days DESC, offline_sites DESC
    LIMIT 30
    `,
    [activeStatuses]
  );
  return rows;
}

export async function getMapMarkers() {
  const { rows } = await query(
    `
    WITH latest_offline AS (
      SELECT * FROM offline_data_master
      WHERE data_date = (SELECT MAX(data_date) FROM offline_data_master)
    ),
    active_tickets AS (
      SELECT *
      FROM view_ticket
      WHERE UPPER(ticket_assigned_type) = 'ENGINEER'
        AND ticket_status = ANY($1)
    ),
    visit_counts AS (
      SELECT ticket_id, COUNT(*)::int AS visit_count
      FROM visit_master
      WHERE ticket_id IS NOT NULL
      GROUP BY ticket_id
    ),
    ticket_status_counts AS (
      SELECT
        COALESCE(s.service_area_name, t.service_area_name, 'Unmapped') AS service_area_name,
        jsonb_object_agg(t.ticket_status, status_count) AS status_counts
      FROM (
        SELECT service_area_name, ticket_status, COUNT(*)::int AS status_count
        FROM active_tickets
        GROUP BY service_area_name, ticket_status
      ) t
      LEFT JOIN service_area_master s ON UPPER(s.service_area_name) = UPPER(t.service_area_name)
      GROUP BY COALESCE(s.service_area_name, t.service_area_name, 'Unmapped')
    )
    SELECT
      COALESCE(s.service_area_name, t.service_area_name, 'Unmapped') AS service_area_name,
      COALESCE(MAX(s.state), MAX(o.state), MAX(t.state), 'Unknown') AS state,
      AVG(s.latitude)::float AS latitude,
      AVG(s.longitude)::float AS longitude,
      COUNT(DISTINCT o.cs_id)::int AS offline_sites,
      COUNT(DISTINCT o.cs_id) FILTER (WHERE o.aging_days > 5)::int AS offline_more_than_5_days,
      COUNT(DISTINCT s.oracle_site_no)::int AS total_mapped_sites,
      COUNT(DISTINCT t.ticket_id)::int AS active_tickets,
      COALESCE(SUM(COALESCE(v.visit_count, t.total_visits, 0)), 0)::int AS total_ticket_visits,
      ROUND(AVG(t.aging_days)::numeric, 1) AS avg_ticket_aging,
      COALESCE(tsc.status_counts, '{}'::jsonb) AS ticket_status_counts
    FROM latest_offline o
    LEFT JOIN customer_site_master s ON s.cs_id = o.cs_id
    LEFT JOIN active_tickets t ON t.cs_id = o.cs_id
    LEFT JOIN visit_counts v ON v.ticket_id = t.ticket_id
    LEFT JOIN ticket_status_counts tsc ON tsc.service_area_name = COALESCE(s.service_area_name, t.service_area_name, 'Unmapped')
    WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL
    GROUP BY COALESCE(s.service_area_name, t.service_area_name, 'Unmapped'), tsc.status_counts
    HAVING AVG(s.latitude) IS NOT NULL AND AVG(s.longitude) IS NOT NULL
    ORDER BY offline_more_than_5_days DESC, offline_sites DESC
    LIMIT 500
    `,
    [activeStatuses]
  );
  return rows.map((row) => ({
    ...row,
    riskLevel: Number(row.offline_more_than_5_days) >= 10 ? 'critical' : Number(row.offline_sites) >= 5 ? 'warning' : 'normal'
  }));
}

export async function getStateMapData() {
  const { rows } = await query(
    `
    WITH latest_offline AS (
      SELECT * FROM offline_data_master
      WHERE data_date = (SELECT MAX(data_date) FROM offline_data_master)
    ),
    offline_state AS (
      SELECT
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g')) AS state_key,
        MAX(COALESCE(NULLIF(TRIM(state), ''), 'Unknown')) AS state,
        COUNT(*) FILTER (WHERE segment = 'PSU' AND aging_days > 2)::int AS total_offline,
        COUNT(*) FILTER (WHERE segment = 'PSU' AND aging_days > 3)::int AS offline_gt_3_days
      FROM latest_offline
      GROUP BY
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g'))
    ),
    site_state AS (
      -- Site denominator rule: total_sites counts all sites in selected state.
      -- Do not filter by customer_site_master.active_status until business rule changes.
      SELECT
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g')) AS state_key,
        MAX(COALESCE(NULLIF(TRIM(state), ''), 'Unknown')) AS state,
        COUNT(DISTINCT oracle_site_no)::int AS total_sites,
        COUNT(DISTINCT NULLIF(TRIM(service_area_name), ''))::int AS total_pops
      FROM customer_site_master
      GROUP BY
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g'))
    ),
    ticket_state AS (
      SELECT
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g')) AS state_key,
        MAX(COALESCE(NULLIF(TRIM(state), ''), 'Unknown')) AS state,
        COUNT(*) FILTER (WHERE ticket_status = 'OPEN')::int AS open_tickets,
        COUNT(*) FILTER (WHERE ticket_status = 'PENDING')::int AS pending_tickets,
        COUNT(*) FILTER (WHERE ticket_status = 'COMPLETED')::int AS completed_tickets,
        COUNT(*) FILTER (WHERE ticket_status = 'CLOSED')::int AS closed_tickets,
        COUNT(*) FILTER (WHERE ticket_status = ANY($1))::int AS active_tickets,
        ROUND(AVG(aging_days) FILTER (WHERE ticket_status = ANY($1))::numeric, 1) AS avg_tat
      FROM view_ticket
      WHERE UPPER(ticket_assigned_type) = 'ENGINEER'
      GROUP BY
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g'))
    ),
    engineer_state AS (
      SELECT
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(service_state), ''), NULLIF(TRIM(state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g')) AS state_key,
        MAX(COALESCE(NULLIF(TRIM(service_state), ''), NULLIF(TRIM(state), ''), 'Unknown')) AS state,
        COUNT(*)::int AS active_engineers
      FROM engineer_master
      WHERE active_status = 'YES'
        AND UPPER(designation) = 'ENGINEER'
      GROUP BY
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(service_state), ''), NULLIF(TRIM(state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g'))
    ),
    visit_state AS (
      SELECT
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(e.service_state), ''), NULLIF(TRIM(e.state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g')) AS state_key,
        COUNT(*)::int AS total_visits,
        COUNT(DISTINCT v.employee_id)::int AS visiting_engineers
      FROM visit_master v
      LEFT JOIN engineer_master e ON e.employee_id = v.employee_id
      WHERE v.employee_id IS NOT NULL
      GROUP BY
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(e.service_state), ''), NULLIF(TRIM(e.state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g'))
    ),
    all_states AS (
      SELECT state_key, MAX(state) AS state FROM (
        SELECT state_key, state FROM offline_state
        UNION ALL SELECT state_key, state FROM site_state
        UNION ALL SELECT state_key, state FROM ticket_state
        UNION ALL SELECT state_key, state FROM engineer_state
      ) states
      GROUP BY state_key
    )
    SELECT
      a.state,
      a.state_key,
      COALESCE(ss.total_sites, 0)::int AS total_sites,
      COALESCE(os.total_offline, 0)::int AS total_offline,
      COALESCE(os.offline_gt_3_days, 0)::int AS offline_gt_3_days,
      COALESCE(ts.open_tickets, 0)::int AS open_tickets,
      COALESCE(ts.pending_tickets, 0)::int AS pending_tickets,
      COALESCE(ts.completed_tickets, 0)::int AS completed_tickets,
      COALESCE(ts.closed_tickets, 0)::int AS closed_tickets,
      COALESCE(ts.active_tickets, 0)::int AS active_tickets,
      COALESCE(es.active_engineers, 0)::int AS active_engineers,
      COALESCE(ss.total_pops, 0)::int AS total_pops,
      COALESCE(vs.total_visits, 0)::int AS total_visits,
      COALESCE(vs.visiting_engineers, 0)::int AS visiting_engineers,
      ROUND((COALESCE(vs.total_visits, 0)::numeric / NULLIF(es.active_engineers, 0)), 1) AS visits_per_engineer,
      ts.avg_tat
    FROM all_states a
    LEFT JOIN offline_state os ON os.state_key = a.state_key
    LEFT JOIN site_state ss ON ss.state_key = a.state_key
    LEFT JOIN ticket_state ts ON ts.state_key = a.state_key
    LEFT JOIN engineer_state es ON es.state_key = a.state_key
    LEFT JOIN visit_state vs ON vs.state_key = a.state_key
    ORDER BY COALESCE(os.offline_gt_3_days, 0) DESC, COALESCE(os.total_offline, 0) DESC, a.state
    `,
    [activeStatuses]
  );

  return mergeStateRows(rows);
}

function percentage(numerator, denominator) {
  const den = Number(denominator || 0);
  if (!den) return null;
  return Math.round((Number(numerator || 0) / den) * 1000) / 10;
}

function stateRiskFromPercentage(percent) {
  if (percent === null || percent === undefined) return 'Mapping Pending';
  if (percent > 10) return 'Critical';
  if (percent > 5) return 'High';
  if (percent > 2) return 'Warning';
  return 'Normal';
}

function serviceAreaRiskFromPercentage(percent) {
  if (percent === null || percent === undefined) return 'Mapping Pending';
  if (percent > 10) return 'Critical';
  if (percent > 5) return 'High';
  if (percent > 2) return 'Warning';
  return 'Normal';
}

function riskToneFromPercentage(percent) {
  if (percent === null || percent === undefined || !Number.isFinite(Number(percent))) return 'normal';
  if (percent > 10) return 'critical';
  if (percent > 5) return 'high';
  if (percent > 2) return 'warning';
  return 'normal';
}

function normalizePincode(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 6 ? digits : null;
}

async function loadOpenCityPincodeGeometry() {
  if (opencityPincodeGeometryCache) return opencityPincodeGeometryCache;

  const raw = await fs.readFile(opencityPincodeGeojsonPath, 'utf8');
  const geojson = JSON.parse(raw);
  const byPincode = new Map();

  for (const feature of geojson.features || []) {
    const pincode = normalizePincode(feature?.properties?.Pincode);
    if (!pincode || !feature?.geometry) continue;
    byPincode.set(pincode, feature.geometry);
  }

  opencityPincodeGeometryCache = {
    path: opencityPincodeGeojsonPath,
    feature_count: Number(geojson.features?.length || 0),
    pincode_count: byPincode.size,
    byPincode
  };
  return opencityPincodeGeometryCache;
}

function appendGeometryToMultiPolygon(polygons, geometry) {
  if (!geometry?.coordinates) return;
  if (geometry.type === 'Polygon') {
    polygons.push(geometry.coordinates);
    return;
  }
  if (geometry.type === 'MultiPolygon') {
    polygons.push(...geometry.coordinates);
  }
}

function readinessRisk(percent) {
  if (percent === null || percent === undefined) return 'Critical';
  if (percent >= 95) return 'Good';
  if (percent >= 80) return 'Warning';
  return 'Critical';
}

function weightedReadinessScore(parts) {
  const entries = [
    ['service_area_mapping_coverage', 0.4],
    ['site_pincode_coverage', 0.3],
    ['pincode_match_rate', 0.2],
    ['conflict_free_score', 0.1]
  ];
  let weightedTotal = 0;
  let weightTotal = 0;
  for (const [key, weight] of entries) {
    if (parts[key] === null || parts[key] === undefined || !Number.isFinite(Number(parts[key]))) continue;
    weightedTotal += Number(parts[key]) * weight;
    weightTotal += weight;
  }
  return weightTotal ? Math.round(weightedTotal / weightTotal) : null;
}

function cleanManagerName(valueToClean) {
  const cleaned = String(valueToClean || '').trim();
  if (!cleaned) return null;
  return cleaned.split('(')[0].trim() || cleaned;
}

function roundNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function riskFromEngineerScore(score) {
  if (score === null || score === undefined) return 'Unknown';
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Warning';
  return 'Critical';
}

function engineerScoreBreakdown(row) {
  const offlinePercentage = Number(row.offline_percentage || 0);
  const openTickets = Number(row.open_tickets_in_service_area || 0);
  const pendingTickets = Number(row.pending_tickets_in_service_area || 0);
  const zeroProductiveDays = Number(row.zero_productive_days || 0);
  const lateAttendanceDays = Number(row.late_attendance_days || 0);
  const offlinePenalty = Math.min(30, offlinePercentage * 2);
  const openTicketPenalty = Math.min(20, openTickets / 5);
  const pendingTicketPenalty = Math.min(15, pendingTickets / 3);
  const zeroProductivePenalty = Math.min(20, zeroProductiveDays * 2);
  const lateAttendancePenalty = Math.min(15, lateAttendanceDays);
  const totalPenalty = offlinePenalty + openTicketPenalty + pendingTicketPenalty + zeroProductivePenalty + lateAttendancePenalty;
  const score = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));

  return {
    score,
    offline_penalty: roundNumber(offlinePenalty, 1),
    open_ticket_penalty: roundNumber(openTicketPenalty, 1),
    pending_ticket_penalty: roundNumber(pendingTicketPenalty, 1),
    zero_productive_penalty: roundNumber(zeroProductivePenalty, 1),
    late_attendance_penalty: roundNumber(lateAttendancePenalty, 1)
  };
}

function normalizeEngineerRow(row) {
  const attendanceDays = Number(row.attendance_days || 0);
  const productiveDays = Number(row.productive_days || 0);
  const totalSites = Number(row.total_sites_in_service_area || 0);
  const offlineSites = Number(row.offline_sites_in_service_area || 0);
  const totalVisits = Number(row.total_visits_last_30_days || 0);
  const zeroProductiveDays = Math.max(0, attendanceDays - productiveDays);
  const model = {
    engineer_id: row.engineer_id,
    engineer_name: row.engineer_name,
    phone: row.phone,
    email: row.email,
    state: row.state,
    service_area_code: row.service_area_code,
    service_area_name: row.service_area_name,
    manager_name: cleanManagerName(row.manager_name),
    manager_source: row.manager_name ? 'Reporting Manager 2' : null,
    attendance_days: attendanceDays,
    on_time_attendance_days: Number(row.on_time_attendance_days || 0),
    late_attendance_days: Number(row.late_attendance_days || 0),
    productive_days: productiveDays,
    zero_productive_days: zeroProductiveDays,
    total_visits_last_30_days: totalVisits,
    avg_visits_per_productive_day: productiveDays ? roundNumber(totalVisits / productiveDays, 1) : null,
    repeat_visit_rate_days: row.repeat_visit_rate_days === null || row.repeat_visit_rate_days === undefined ? null : Number(row.repeat_visit_rate_days),
    total_sites_in_service_area: totalSites,
    offline_sites_in_service_area: offlineSites,
    offline_percentage: totalSites ? roundNumber((offlineSites / totalSites) * 100, 1) : null,
    open_tickets_in_service_area: Number(row.open_tickets_in_service_area || 0),
    pending_tickets_in_service_area: Number(row.pending_tickets_in_service_area || 0),
    ownership_source: row.ownership_source || null
  };
  const breakdown = engineerScoreBreakdown(model);
  return {
    ...model,
    engineer_score: breakdown.score,
    risk: riskFromEngineerScore(breakdown.score),
    score_breakdown: breakdown
  };
}

async function engineerActivityAnchorDate() {
  const { rows } = await query(
    `SELECT GREATEST(
       COALESCE((SELECT MAX(visit_in_datetime)::date FROM visit_master), CURRENT_DATE),
       COALESCE((SELECT MAX(attendance_date)::date FROM attendance_data), CURRENT_DATE)
     ) AS anchor_date`
  );
  return rows[0]?.anchor_date;
}

async function loadEngineerWiseRows() {
  const anchorDate = await engineerActivityAnchorDate();
  const { rows } = await query(
    `
    WITH params AS (
      SELECT $1::date AS anchor_date
    ),
    active_engineers AS (
      SELECT
        e.employee_id AS engineer_id,
        e.employee_name AS engineer_name,
        e.phone_no AS phone,
        e.email_id AS email,
        e.state AS engineer_state,
        e.service_state,
        e.reporting_manager_2 AS manager_name
      FROM engineer_master e
      WHERE UPPER(TRIM(e.designation)) = 'ENGINEER'
        AND UPPER(TRIM(e.active_status)) = ANY($2)
    ),
    ownership AS (
      SELECT DISTINCT ON (m.engineer_id)
        m.engineer_id,
        m.service_area_code,
        m.service_area_name,
        m.state,
        'ServiceAreaEngineerMapping'::text AS ownership_source
      FROM service_area_engineer_mapping m
      WHERE UPPER(TRIM(m.active_status)) = ANY($3)
        AND (m.effective_from IS NULL OR m.effective_from <= CURRENT_DATE)
        AND (m.effective_to IS NULL OR m.effective_to >= CURRENT_DATE)
      ORDER BY m.engineer_id, m.assignment_start_date DESC NULLS LAST, m.updated_at DESC NULLS LAST
    ),
    attendance_30 AS (
      SELECT
        a.employee_id,
        COUNT(DISTINCT a.attendance_date::date) FILTER (
          WHERE a.in_datetime IS NOT NULL OR UPPER(COALESCE(a.attendance_status_derived, '')) IN ('ONTIME', 'LATE')
        )::int AS attendance_days,
        COUNT(DISTINCT a.attendance_date::date) FILTER (
          WHERE UPPER(COALESCE(a.attendance_status_derived, '')) = 'ONTIME'
            OR (a.in_datetime IS NOT NULL AND a.in_datetime::time <= TIME '10:00')
        )::int AS on_time_attendance_days,
        COUNT(DISTINCT a.attendance_date::date) FILTER (
          WHERE UPPER(COALESCE(a.attendance_status_derived, '')) = 'LATE'
            OR (a.in_datetime IS NOT NULL AND a.in_datetime::time > TIME '10:00')
        )::int AS late_attendance_days
      FROM attendance_data a
      CROSS JOIN params p
      WHERE a.attendance_date::date BETWEEN p.anchor_date - INTERVAL '29 days' AND p.anchor_date
      GROUP BY a.employee_id
    ),
    visits_30 AS (
      SELECT
        v.employee_id,
        v.visit_in_datetime,
        v.visit_in_datetime::date AS visit_date,
        COALESCE(NULLIF(v.oracle_site_no, ''), NULLIF(v.cs_id, '')) AS site_key
      FROM visit_master v
      CROSS JOIN params p
      WHERE v.visit_in_datetime IS NOT NULL
        AND v.visit_in_datetime::date BETWEEN p.anchor_date - INTERVAL '29 days' AND p.anchor_date
    ),
    visit_metrics AS (
      SELECT
        employee_id,
        COUNT(*)::int AS total_visits_last_30_days,
        COUNT(DISTINCT visit_date)::int AS productive_days
      FROM visits_30
      GROUP BY employee_id
    ),
    repeat_gaps AS (
      SELECT
        employee_id,
        EXTRACT(EPOCH FROM (visit_in_datetime - LAG(visit_in_datetime) OVER (
          PARTITION BY employee_id, site_key
          ORDER BY visit_in_datetime
        ))) / 86400 AS gap_days
      FROM visits_30
      WHERE site_key IS NOT NULL
    ),
    repeat_metrics AS (
      SELECT employee_id, ROUND(AVG(gap_days)::numeric, 1) AS repeat_visit_rate_days
      FROM repeat_gaps
      WHERE gap_days IS NOT NULL AND gap_days >= 0
      GROUP BY employee_id
    ),
    site_metrics AS (
      SELECT
        UPPER(REGEXP_REPLACE(TRIM(service_area_name), '[^A-Za-z0-9]', '', 'g')) AS service_area_key,
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g')) AS state_key,
        COUNT(DISTINCT oracle_site_no)::int AS total_sites_in_service_area
      FROM customer_site_master
      WHERE NULLIF(TRIM(service_area_name), '') IS NOT NULL
      GROUP BY
        UPPER(REGEXP_REPLACE(TRIM(service_area_name), '[^A-Za-z0-9]', '', 'g')),
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g'))
    ),
    latest_offline AS (
      SELECT * FROM offline_data_master
      WHERE data_date = (SELECT MAX(data_date) FROM offline_data_master)
    ),
    offline_metrics AS (
      SELECT
        UPPER(REGEXP_REPLACE(TRIM(s.service_area_name), '[^A-Za-z0-9]', '', 'g')) AS service_area_key,
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(s.state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g')) AS state_key,
        COUNT(DISTINCT o.cs_id) FILTER (WHERE o.segment = 'PSU' AND o.aging_days > 2)::int AS offline_sites_in_service_area
      FROM latest_offline o
      JOIN customer_site_master s ON s.cs_id = o.cs_id
      WHERE NULLIF(TRIM(s.service_area_name), '') IS NOT NULL
      GROUP BY
        UPPER(REGEXP_REPLACE(TRIM(s.service_area_name), '[^A-Za-z0-9]', '', 'g')),
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(s.state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g'))
    ),
    ticket_metrics AS (
      SELECT
        UPPER(REGEXP_REPLACE(TRIM(service_area_name), '[^A-Za-z0-9]', '', 'g')) AS service_area_key,
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g')) AS state_key,
        COUNT(*) FILTER (WHERE ticket_status = 'OPEN')::int AS open_tickets_in_service_area,
        COUNT(*) FILTER (WHERE ticket_status = 'PENDING')::int AS pending_tickets_in_service_area
      FROM view_ticket
      WHERE ticket_status IN ('OPEN', 'PENDING')
        AND NULLIF(TRIM(service_area_name), '') IS NOT NULL
      GROUP BY
        UPPER(REGEXP_REPLACE(TRIM(service_area_name), '[^A-Za-z0-9]', '', 'g')),
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g'))
    )
    SELECT
      ae.engineer_id,
      ae.engineer_name,
      ae.phone,
      ae.email,
      COALESCE(o.state, ae.service_state, ae.engineer_state) AS state,
      o.service_area_code,
      o.service_area_name,
      ae.manager_name,
      o.ownership_source,
      COALESCE(a.attendance_days, 0)::int AS attendance_days,
      COALESCE(a.on_time_attendance_days, 0)::int AS on_time_attendance_days,
      COALESCE(a.late_attendance_days, 0)::int AS late_attendance_days,
      COALESCE(vm.productive_days, 0)::int AS productive_days,
      COALESCE(vm.total_visits_last_30_days, 0)::int AS total_visits_last_30_days,
      rm.repeat_visit_rate_days,
      COALESCE(sm.total_sites_in_service_area, 0)::int AS total_sites_in_service_area,
      COALESCE(om.offline_sites_in_service_area, 0)::int AS offline_sites_in_service_area,
      COALESCE(tm.open_tickets_in_service_area, 0)::int AS open_tickets_in_service_area,
      COALESCE(tm.pending_tickets_in_service_area, 0)::int AS pending_tickets_in_service_area
    FROM active_engineers ae
    LEFT JOIN ownership o ON o.engineer_id = ae.engineer_id
    LEFT JOIN attendance_30 a ON a.employee_id = ae.engineer_id
    LEFT JOIN visit_metrics vm ON vm.employee_id = ae.engineer_id
    LEFT JOIN repeat_metrics rm ON rm.employee_id = ae.engineer_id
    LEFT JOIN site_metrics sm
      ON sm.service_area_key = UPPER(REGEXP_REPLACE(COALESCE(o.service_area_name, ''), '[^A-Za-z0-9]', '', 'g'))
     AND sm.state_key = UPPER(REGEXP_REPLACE(COALESCE(o.state, ''), '[^A-Za-z0-9]', '', 'g'))
    LEFT JOIN offline_metrics om
      ON om.service_area_key = UPPER(REGEXP_REPLACE(COALESCE(o.service_area_name, ''), '[^A-Za-z0-9]', '', 'g'))
     AND om.state_key = UPPER(REGEXP_REPLACE(COALESCE(o.state, ''), '[^A-Za-z0-9]', '', 'g'))
    LEFT JOIN ticket_metrics tm
      ON tm.service_area_key = UPPER(REGEXP_REPLACE(COALESCE(o.service_area_name, ''), '[^A-Za-z0-9]', '', 'g'))
     AND tm.state_key = UPPER(REGEXP_REPLACE(COALESCE(o.state, ''), '[^A-Za-z0-9]', '', 'g'))
    ORDER BY ae.engineer_name
    `,
    [anchorDate, engineerActiveStatuses, activeOwnershipStatuses]
  );

  return rows.map(normalizeEngineerRow);
}

export async function getTerritoryCoverageAudit() {
  const baseCtes = `
    WITH active_mapping AS (
      SELECT *
      FROM service_area_pincode_mapping
      WHERE UPPER(TRIM(active_status)) IN ('YES', 'ACTIVE', 'TRUE')
    ),
    all_mapping AS (
      SELECT *
      FROM service_area_pincode_mapping
    ),
    site_rows AS (
      SELECT
        cs_id,
        oracle_site_no,
        oracle_site_name,
        COALESCE(NULLIF(TRIM(state), ''), 'Unknown') AS state,
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g')) AS state_key,
        NULLIF(TRIM(service_area_name), '') AS service_area_name,
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(service_area_name), ''), 'UNMAPPED'), '[^A-Za-z0-9]', '', 'g')) AS service_area_key,
        NULLIF(REGEXP_REPLACE(COALESCE(pin_code, ''), '[^0-9]', '', 'g'), '') AS pincode
      FROM customer_site_master
    ),
    site_service_areas AS (
      SELECT
        service_area_key,
        MAX(state_key) AS state_key,
        MAX(state) AS state,
        MAX(service_area_name) AS service_area_name,
        COUNT(DISTINCT oracle_site_no)::int AS site_count
      FROM site_rows
      WHERE service_area_name IS NOT NULL
      GROUP BY service_area_key
    ),
    state_site_service_areas AS (
      SELECT
        state_key,
        MAX(state) AS state,
        service_area_key,
        MAX(service_area_name) AS service_area_name,
        COUNT(DISTINCT oracle_site_no)::int AS site_count
      FROM site_rows
      WHERE service_area_name IS NOT NULL
      GROUP BY state_key, service_area_key
    ),
    mapped_service_areas AS (
      SELECT DISTINCT service_area_key, MAX(state_key) AS state_key, MAX(state) AS state, MAX(service_area_name) AS service_area_name
      FROM active_mapping
      GROUP BY service_area_key
    ),
    site_pincodes AS (
      SELECT DISTINCT pincode
      FROM site_rows
      WHERE LENGTH(pincode) = 6
    ),
    duplicate_active_pincodes AS (
      SELECT pincode
      FROM active_mapping
      GROUP BY pincode
      HAVING COUNT(*) > 1
    ),
    conflicting_active_pincodes AS (
      SELECT pincode
      FROM active_mapping
      GROUP BY pincode
      HAVING COUNT(DISTINCT service_area_key || '|' || state_key) > 1
    )
  `;

  const [
    metricResult,
    serviceAreasWithoutMappingResult,
    sitesWithoutPincodeResult,
    sitePincodesNotInMappingResult,
    conflictsResult,
    stateCoverageResult
  ] = await Promise.all([
    query(
      `
      ${baseCtes}
      SELECT
        (SELECT COUNT(*)::int FROM all_mapping) AS mapping_rows,
        (SELECT COUNT(*)::int FROM active_mapping) AS active_mapping_rows,
        (SELECT COUNT(DISTINCT pincode)::int FROM active_mapping) AS distinct_mapped_pincodes,
        (SELECT COUNT(*)::int FROM mapped_service_areas) AS distinct_mapped_service_areas,
        (SELECT COUNT(*)::int FROM site_service_areas) AS distinct_site_service_areas,
        (SELECT COUNT(*)::int FROM site_service_areas s JOIN mapped_service_areas m ON m.service_area_key = s.service_area_key) AS service_areas_with_mapping,
        (SELECT COUNT(*)::int FROM site_service_areas s LEFT JOIN mapped_service_areas m ON m.service_area_key = s.service_area_key WHERE m.service_area_key IS NULL) AS service_areas_without_mapping,
        (SELECT COUNT(DISTINCT oracle_site_no)::int FROM site_rows) AS sites_total,
        (SELECT COUNT(DISTINCT oracle_site_no)::int FROM site_rows WHERE LENGTH(pincode) = 6) AS sites_with_pincode,
        (SELECT COUNT(DISTINCT oracle_site_no)::int FROM site_rows WHERE pincode IS NULL OR LENGTH(pincode) <> 6) AS sites_without_pincode,
        (SELECT COUNT(DISTINCT oracle_site_no)::int FROM site_rows WHERE service_area_name IS NOT NULL) AS sites_with_service_area,
        (SELECT COUNT(DISTINCT oracle_site_no)::int FROM site_rows WHERE service_area_name IS NULL) AS sites_without_service_area,
        (SELECT COUNT(*)::int FROM site_pincodes) AS pincodes_with_sites,
        (SELECT COUNT(*)::int FROM site_pincodes sp LEFT JOIN active_mapping am ON am.pincode = sp.pincode WHERE am.pincode IS NULL) AS site_pincodes_not_in_mapping,
        (SELECT COUNT(DISTINCT am.pincode)::int FROM active_mapping am LEFT JOIN site_pincodes sp ON sp.pincode = am.pincode WHERE sp.pincode IS NULL) AS mapping_pincodes_without_sites,
        (SELECT COUNT(*)::int FROM duplicate_active_pincodes) AS duplicate_pincode_count,
        (SELECT COUNT(*)::int FROM conflicting_active_pincodes) AS conflicting_pincode_count,
        (
          SELECT COUNT(*)::int
          FROM (
            SELECT service_area_key
            FROM active_mapping
            GROUP BY service_area_key
            HAVING COUNT(DISTINCT state_key) > 1
          ) multi_state
        ) AS multi_state_service_area_count
      `
    ),
    query(
      `
      ${baseCtes}
      SELECT
        s.service_area_name,
        s.state,
        s.site_count
      FROM site_service_areas s
      LEFT JOIN mapped_service_areas m ON m.service_area_key = s.service_area_key
      WHERE m.service_area_key IS NULL
      ORDER BY s.site_count DESC, s.state, s.service_area_name
      LIMIT 100
      `
    ),
    query(
      `
      ${baseCtes}
      SELECT
        cs_id,
        oracle_site_no,
        oracle_site_name AS site_name,
        state,
        service_area_name,
        NULLIF(pincode, '') AS pincode
      FROM site_rows
      WHERE pincode IS NULL OR LENGTH(pincode) <> 6
      ORDER BY state, service_area_name NULLS LAST, oracle_site_name NULLS LAST
      LIMIT 100
      `
    ),
    query(
      `
      ${baseCtes}
      SELECT
        sr.pincode,
        sr.state,
        COUNT(DISTINCT sr.oracle_site_no)::int AS site_count,
        COALESCE(json_agg(DISTINCT sr.service_area_name) FILTER (WHERE sr.service_area_name IS NOT NULL), '[]'::json) AS service_areas_seen
      FROM site_rows sr
      LEFT JOIN active_mapping am ON am.pincode = sr.pincode
      WHERE LENGTH(sr.pincode) = 6
        AND am.pincode IS NULL
      GROUP BY sr.pincode, sr.state
      ORDER BY site_count DESC, sr.state, sr.pincode
      LIMIT 100
      `
    ),
    query(
      `
      ${baseCtes}
      SELECT
        pincode,
        json_agg(DISTINCT service_area_name) AS service_areas,
        json_agg(DISTINCT state) AS states
      FROM active_mapping
      GROUP BY pincode
      HAVING COUNT(DISTINCT service_area_key || '|' || state_key) > 1
      ORDER BY pincode
      LIMIT 100
      `
    ),
    query(
      `
      ${baseCtes}
      SELECT
        MAX(s.state) AS state,
        COUNT(*)::int AS site_service_areas,
        COUNT(*) FILTER (WHERE m.service_area_key IS NOT NULL)::int AS mapped_service_areas,
        ROUND((COUNT(*) FILTER (WHERE m.service_area_key IS NOT NULL)::numeric / NULLIF(COUNT(*), 0)) * 100, 1)::float AS coverage_percentage,
        (
          SELECT COUNT(DISTINCT sr.oracle_site_no)::int
          FROM site_rows sr
          WHERE sr.state_key = s.state_key
            AND (sr.pincode IS NULL OR LENGTH(sr.pincode) <> 6)
        ) AS sites_without_pincode
      FROM state_site_service_areas s
      LEFT JOIN mapped_service_areas m ON m.service_area_key = s.service_area_key
      GROUP BY s.state_key
      ORDER BY coverage_percentage ASC NULLS FIRST, sites_without_pincode DESC, MAX(s.state)
      `
    )
  ]);

  const metrics = metricResult.rows[0] || {};
  const serviceAreaMappingCoverage = percentage(metrics.service_areas_with_mapping, metrics.distinct_site_service_areas);
  const sitePincodeCoverage = percentage(metrics.sites_with_pincode, metrics.sites_total);
  const matchedSitePincodes = Number(metrics.pincodes_with_sites || 0) - Number(metrics.site_pincodes_not_in_mapping || 0);
  const pincodeMatchRate = percentage(matchedSitePincodes, metrics.pincodes_with_sites);
  const conflictFreeScore = Number(metrics.distinct_mapped_pincodes || 0)
    ? Math.round(((Number(metrics.distinct_mapped_pincodes || 0) - Number(metrics.conflicting_pincode_count || 0)) / Number(metrics.distinct_mapped_pincodes || 1)) * 1000) / 10
    : null;
  const scoreExplanation = {
    service_area_mapping_coverage: serviceAreaMappingCoverage,
    site_pincode_coverage: sitePincodeCoverage,
    pincode_match_rate: pincodeMatchRate,
    conflict_free_score: conflictFreeScore
  };

  return {
    mapping_rows: Number(metrics.mapping_rows || 0),
    active_mapping_rows: Number(metrics.active_mapping_rows || 0),
    distinct_mapped_pincodes: Number(metrics.distinct_mapped_pincodes || 0),
    distinct_mapped_service_areas: Number(metrics.distinct_mapped_service_areas || 0),
    distinct_site_service_areas: Number(metrics.distinct_site_service_areas || 0),
    service_areas_with_mapping: Number(metrics.service_areas_with_mapping || 0),
    service_areas_without_mapping: Number(metrics.service_areas_without_mapping || 0),
    sites_total: Number(metrics.sites_total || 0),
    sites_with_pincode: Number(metrics.sites_with_pincode || 0),
    sites_without_pincode: Number(metrics.sites_without_pincode || 0),
    sites_with_service_area: Number(metrics.sites_with_service_area || 0),
    sites_without_service_area: Number(metrics.sites_without_service_area || 0),
    pincodes_with_sites: Number(metrics.pincodes_with_sites || 0),
    site_pincodes_not_in_mapping: Number(metrics.site_pincodes_not_in_mapping || 0),
    mapping_pincodes_without_sites: Number(metrics.mapping_pincodes_without_sites || 0),
    duplicate_pincode_count: Number(metrics.duplicate_pincode_count || 0),
    conflicting_pincode_count: Number(metrics.conflicting_pincode_count || 0),
    multi_state_service_area_count: Number(metrics.multi_state_service_area_count || 0),
    multi_district_service_area_count: null,
    territory_readiness_score: weightedReadinessScore(scoreExplanation),
    score_explanation: scoreExplanation,
    service_areas_without_mapping_list: serviceAreasWithoutMappingResult.rows,
    sites_without_pincode_list: sitesWithoutPincodeResult.rows,
    site_pincodes_not_in_mapping_list: sitePincodesNotInMappingResult.rows,
    pincode_mapping_conflicts: conflictsResult.rows,
    state_coverage: stateCoverageResult.rows.map((row) => ({
      ...row,
      risk: readinessRisk(row.coverage_percentage)
    })),
    limitations: [
      'District mapping is not available yet; multi_district_service_area_count is returned as null.',
      'No district or pincode GeoJSON is loaded in this audit.',
      'No Service Area polygons are rendered by this endpoint.',
      'Operational Service Area Territory should be generated only after mapping coverage is acceptable.'
    ]
  };
}

export async function getEngineerWiseReport() {
  return loadEngineerWiseRows();
}

export async function getEngineerWiseDetail(engineerId) {
  const cleanedEngineerId = String(engineerId || '').trim();
  if (!cleanedEngineerId) {
    const error = new Error('engineerId path parameter is required');
    error.status = 400;
    throw error;
  }

  const [engineers, anchorDate] = await Promise.all([
    loadEngineerWiseRows(),
    engineerActivityAnchorDate()
  ]);
  const engineer = engineers.find((row) => row.engineer_id === cleanedEngineerId);
  if (!engineer) {
    const error = new Error('Engineer not found');
    error.status = 404;
    throw error;
  }

  const [calendarResult, histogramResult, recentVisitsResult, ticketStatusResult] = await Promise.all([
    query(
      `
      WITH params AS (
        SELECT $2::date AS anchor_date
      ),
      days AS (
        SELECT generate_series((SELECT anchor_date FROM params) - INTERVAL '29 days', (SELECT anchor_date FROM params), INTERVAL '1 day')::date AS activity_date
      ),
      attendance AS (
        SELECT
          attendance_date::date AS activity_date,
          MAX(attendance_status_raw) AS attendance_status_raw,
          MAX(attendance_status_derived) AS attendance_status_derived,
          MIN(in_datetime) AS first_punch_time
        FROM attendance_data
        WHERE employee_id = $1
          AND attendance_date::date BETWEEN (SELECT anchor_date FROM params) - INTERVAL '29 days' AND (SELECT anchor_date FROM params)
        GROUP BY attendance_date::date
      ),
      visits AS (
        SELECT
          visit_in_datetime::date AS activity_date,
          COUNT(*)::int AS visit_count,
          MIN(visit_in_datetime) AS first_visit_time,
          MAX(visit_in_datetime) AS last_visit_time,
          COUNT(DISTINCT ticket_id)::int AS tickets_touched
        FROM visit_master
        WHERE employee_id = $1
          AND visit_in_datetime IS NOT NULL
          AND visit_in_datetime::date BETWEEN (SELECT anchor_date FROM params) - INTERVAL '29 days' AND (SELECT anchor_date FROM params)
        GROUP BY visit_in_datetime::date
      )
      SELECT
        d.activity_date AS date,
        CASE
          WHEN a.activity_date IS NOT NULL AND (a.first_punch_time IS NOT NULL OR UPPER(COALESCE(a.attendance_status_derived, '')) IN ('ONTIME', 'LATE')) THEN 'Present'
          WHEN a.activity_date IS NOT NULL THEN COALESCE(a.attendance_status_raw, a.attendance_status_derived, 'Attendance logged')
          ELSE 'No attendance'
        END AS attendance_status,
        CASE
          WHEN UPPER(COALESCE(a.attendance_status_derived, '')) = 'ONTIME' OR (a.first_punch_time IS NOT NULL AND a.first_punch_time::time <= TIME '10:00') THEN 'On Time'
          WHEN UPPER(COALESCE(a.attendance_status_derived, '')) = 'LATE' OR (a.first_punch_time IS NOT NULL AND a.first_punch_time::time > TIME '10:00') THEN 'Late'
          WHEN a.activity_date IS NULL THEN 'No attendance'
          ELSE NULL
        END AS on_time_status,
        COALESCE(v.visit_count, 0)::int AS visit_count,
        COALESCE(v.visit_count, 0) > 0 AS productive,
        TO_CHAR(v.first_visit_time, 'HH24:MI') AS first_visit_time,
        TO_CHAR(v.last_visit_time, 'HH24:MI') AS last_visit_time,
        COALESCE(v.tickets_touched, 0)::int AS tickets_touched
      FROM days d
      LEFT JOIN attendance a ON a.activity_date = d.activity_date
      LEFT JOIN visits v ON v.activity_date = d.activity_date
      ORDER BY d.activity_date
      `,
      [cleanedEngineerId, anchorDate]
    ),
    query(
      `
      WITH hours AS (
        SELECT generate_series(0, 23) AS hour
      ),
      visits AS (
        SELECT EXTRACT(HOUR FROM visit_in_datetime)::int AS hour, COUNT(*)::int AS visits
        FROM visit_master
        WHERE employee_id = $1
          AND visit_in_datetime IS NOT NULL
          AND visit_in_datetime::date BETWEEN $2::date - INTERVAL '29 days' AND $2::date
        GROUP BY EXTRACT(HOUR FROM visit_in_datetime)::int
      )
      SELECT LPAD(h.hour::text, 2, '0') AS hour, COALESCE(v.visits, 0)::int AS visits
      FROM hours h
      LEFT JOIN visits v ON v.hour = h.hour
      ORDER BY h.hour
      `,
      [cleanedEngineerId, anchorDate]
    ),
    query(
      `
      SELECT
        v.visit_in_datetime::date AS visit_date,
        TO_CHAR(v.visit_in_datetime, 'HH24:MI') AS time_in,
        TO_CHAR(v.visit_out_datetime, 'HH24:MI') AS time_out,
        v.ticket_id,
        v.cs_id,
        COALESCE(s.oracle_site_name, t.oracle_site_name) AS site_name,
        COALESCE(s.service_area_name, t.service_area_name) AS service_area_name
      FROM visit_master v
      LEFT JOIN customer_site_master s
        ON (v.oracle_site_no IS NOT NULL AND v.oracle_site_no = s.oracle_site_no)
        OR (v.cs_id IS NOT NULL AND v.cs_id = s.cs_id)
      LEFT JOIN view_ticket t ON t.ticket_id = v.ticket_id
      WHERE v.employee_id = $1
      ORDER BY v.visit_in_datetime DESC NULLS LAST
      LIMIT 30
      `,
      [cleanedEngineerId]
    ),
    query(
      `
      SELECT
        COALESCE(ticket_status, 'Unknown') AS status,
        COUNT(*)::int AS count
      FROM view_ticket
      WHERE UPPER(REGEXP_REPLACE(TRIM(COALESCE(service_area_name, '')), '[^A-Za-z0-9]', '', 'g')) =
            UPPER(REGEXP_REPLACE(TRIM(COALESCE($1::text, '')), '[^A-Za-z0-9]', '', 'g'))
        AND UPPER(REGEXP_REPLACE(TRIM(COALESCE(state, '')), '[^A-Za-z0-9]', '', 'g')) =
            UPPER(REGEXP_REPLACE(TRIM(COALESCE($2::text, '')), '[^A-Za-z0-9]', '', 'g'))
      GROUP BY COALESCE(ticket_status, 'Unknown')
      ORDER BY count DESC
      `,
      [engineer.service_area_name || '', engineer.state || '']
    )
  ]);

  return {
    engineer,
    last_30_days_calendar: calendarResult.rows,
    visit_hour_histogram: histogramResult.rows,
    recent_visits: recentVisitsResult.rows,
    service_area_ticket_status: ticketStatusResult.rows.reduce((acc, row) => {
      acc[row.status] = Number(row.count || 0);
      return acc;
    }, {}),
    score_breakdown: engineer.score_breakdown,
    anchor_date: anchorDate
  };
}

export async function getServiceAreaTerritories({ state }) {
  const requestedState = String(state || '').trim();
  if (!requestedState) {
    const error = new Error('state query parameter is required');
    error.status = 400;
    throw error;
  }

  const selectedStateKeys = equivalentStateKeys(requestedState);
  const geometryCache = await loadOpenCityPincodeGeometry();

  const [mappingResult, metricsResult] = await Promise.all([
    query(
      `
      SELECT
        MAX(state) AS state,
        service_area_key,
        MAX(service_area_name) AS service_area_name,
        COALESCE(
          MAX(NULLIF(TRIM(service_area_code), '')),
          (
            SELECT MAX(NULLIF(TRIM(sam.service_area_code), ''))
            FROM service_area_master sam
            WHERE UPPER(REGEXP_REPLACE(TRIM(sam.service_area_name), '[^A-Za-z0-9]', '', 'g')) = m.service_area_key
          )
        ) AS service_area_code,
        ARRAY_AGG(DISTINCT pincode ORDER BY pincode) FILTER (WHERE pincode IS NOT NULL) AS pincodes,
        COUNT(DISTINCT pincode)::int AS mapped_pincode_count
      FROM service_area_pincode_mapping m
      WHERE UPPER(TRIM(active_status)) IN ('YES', 'ACTIVE', 'TRUE')
        AND UPPER(REGEXP_REPLACE(TRIM(state), '[^A-Za-z0-9]', '', 'g')) = ANY($1)
      GROUP BY service_area_key
      ORDER BY MAX(service_area_name)
      `,
      [selectedStateKeys]
    ),
    query(
      `
      WITH latest_offline AS (
        SELECT *
        FROM offline_data_master
        WHERE data_date = (SELECT MAX(data_date) FROM offline_data_master)
      ),
      active_tickets AS (
        SELECT *
        FROM view_ticket
        WHERE UPPER(ticket_assigned_type) = 'ENGINEER'
          AND ticket_status = ANY($2)
      ),
      visit_counts AS (
        SELECT ticket_id, COUNT(*)::int AS visit_count
        FROM visit_master
        WHERE ticket_id IS NOT NULL
        GROUP BY ticket_id
      ),
      site_metrics AS (
        SELECT
          UPPER(REGEXP_REPLACE(TRIM(service_area_name), '[^A-Za-z0-9]', '', 'g')) AS service_area_key,
          COUNT(DISTINCT oracle_site_no)::int AS total_sites
        FROM customer_site_master
        WHERE UPPER(REGEXP_REPLACE(TRIM(state), '[^A-Za-z0-9]', '', 'g')) = ANY($1)
          AND NULLIF(TRIM(service_area_name), '') IS NOT NULL
        GROUP BY UPPER(REGEXP_REPLACE(TRIM(service_area_name), '[^A-Za-z0-9]', '', 'g'))
      ),
      offline_metrics AS (
        SELECT
          UPPER(REGEXP_REPLACE(TRIM(s.service_area_name), '[^A-Za-z0-9]', '', 'g')) AS service_area_key,
          COUNT(DISTINCT o.cs_id) FILTER (WHERE o.segment = 'PSU' AND o.aging_days > 2)::int AS offline_sites,
          COUNT(DISTINCT o.cs_id) FILTER (WHERE o.segment = 'PSU' AND o.aging_days > 3)::int AS offline_gt_3_days
        FROM latest_offline o
        JOIN customer_site_master s ON s.cs_id = o.cs_id
        WHERE UPPER(REGEXP_REPLACE(TRIM(s.state), '[^A-Za-z0-9]', '', 'g')) = ANY($1)
          AND NULLIF(TRIM(s.service_area_name), '') IS NOT NULL
        GROUP BY UPPER(REGEXP_REPLACE(TRIM(s.service_area_name), '[^A-Za-z0-9]', '', 'g'))
      ),
      ticket_metrics AS (
        SELECT
          UPPER(REGEXP_REPLACE(TRIM(service_area_name), '[^A-Za-z0-9]', '', 'g')) AS service_area_key,
          COUNT(*)::int AS active_tickets,
          COUNT(*) FILTER (WHERE COALESCE(vc.visit_count, total_visits, 0) = 0)::int AS tickets_without_visit,
          ROUND(AVG(aging_days)::numeric, 1) AS avg_tat,
          COALESCE(jsonb_object_agg(ticket_status, status_count), '{}'::jsonb) AS ticket_status_counts
        FROM (
          SELECT
            t.*,
            COUNT(*) OVER (PARTITION BY UPPER(REGEXP_REPLACE(TRIM(t.service_area_name), '[^A-Za-z0-9]', '', 'g')), t.ticket_status)::int AS status_count
          FROM active_tickets t
          WHERE UPPER(REGEXP_REPLACE(TRIM(t.state), '[^A-Za-z0-9]', '', 'g')) = ANY($1)
            AND NULLIF(TRIM(t.service_area_name), '') IS NOT NULL
        ) t
        LEFT JOIN visit_counts vc ON vc.ticket_id = t.ticket_id
        GROUP BY UPPER(REGEXP_REPLACE(TRIM(service_area_name), '[^A-Za-z0-9]', '', 'g'))
      )
      SELECT
        COALESCE(sm.service_area_key, om.service_area_key, tm.service_area_key) AS service_area_key,
        COALESCE(sm.total_sites, 0)::int AS total_sites,
        COALESCE(om.offline_sites, 0)::int AS offline_sites,
        COALESCE(om.offline_gt_3_days, 0)::int AS offline_gt_3_days,
        COALESCE(tm.active_tickets, 0)::int AS active_tickets,
        COALESCE(tm.tickets_without_visit, 0)::int AS tickets_without_visit,
        tm.avg_tat,
        COALESCE(tm.ticket_status_counts, '{}'::jsonb) AS ticket_status_counts
      FROM site_metrics sm
      FULL OUTER JOIN offline_metrics om ON om.service_area_key = sm.service_area_key
      FULL OUTER JOIN ticket_metrics tm ON tm.service_area_key = COALESCE(sm.service_area_key, om.service_area_key)
      `,
      [selectedStateKeys, activeStatuses]
    )
  ]);

  const metricsByKey = new Map(metricsResult.rows.map((row) => [row.service_area_key, row]));
  const features = [];
  const allUnmatchedPincodes = [];
  let mappedPincodes = 0;
  let matchedPincodes = 0;

  for (const row of mappingResult.rows) {
    const pincodes = (row.pincodes || []).map(normalizePincode).filter(Boolean);
    mappedPincodes += pincodes.length;

    const polygons = [];
    const unmatchedPincodes = [];
    for (const pincode of pincodes) {
      const geometry = geometryCache.byPincode.get(pincode);
      if (!geometry) {
        unmatchedPincodes.push(pincode);
        allUnmatchedPincodes.push(pincode);
        continue;
      }
      matchedPincodes += 1;
      appendGeometryToMultiPolygon(polygons, geometry);
    }

    if (!polygons.length) continue;

    const metrics = metricsByKey.get(row.service_area_key) || {};
    const totalSites = Number(metrics.total_sites || 0);
    const offlineSites = Number(metrics.offline_sites || 0);
    const offlinePercentage = percentage(offlineSites, totalSites);
    const riskLevel = riskToneFromPercentage(offlinePercentage);

    features.push({
      type: 'Feature',
      properties: {
        service_area_name: row.service_area_name,
        service_area_code: row.service_area_code || null,
        state: row.state || requestedState,
        pincode_count: pincodes.length,
        matched_pincode_count: pincodes.length - unmatchedPincodes.length,
        unmatched_pincode_count: unmatchedPincodes.length,
        unmatched_pincodes: unmatchedPincodes,
        geometry_status: 'pincode_grouped',
        geometry_mode: serviceAreaGeometryMode,
        dissolve_available: dissolveAvailable,
        total_sites: totalSites || null,
        offline_sites: offlineSites,
        offline_gt_3_days: Number(metrics.offline_gt_3_days || 0),
        offline_percentage: offlinePercentage,
        active_tickets: Number(metrics.active_tickets || 0),
        tickets_without_visit: Number(metrics.tickets_without_visit || 0),
        avg_tat: metrics.avg_tat === null || metrics.avg_tat === undefined ? null : Number(metrics.avg_tat),
        ticket_status_counts: metrics.ticket_status_counts || {},
        risk: riskLevel === 'critical' ? 'Critical' : riskLevel === 'high' ? 'High' : riskLevel === 'warning' ? 'Warning' : 'Normal',
        riskLevel,
        geometry_note: 'Pincode polygons grouped by Service Area; internal pincode boundaries are visually softened but not dissolved.'
      },
      geometry: {
        type: 'MultiPolygon',
        coordinates: polygons
      }
    });
  }

  const matchRate = mappedPincodes ? Math.round((matchedPincodes / mappedPincodes) * 10000) / 100 : null;

  return {
    state: mappingResult.rows[0]?.state || requestedState,
    geometry_source: 'opencity_pincode',
    territory_type: 'operational_service_area',
    label: 'Operational Service Area Territory — generated from pincode mapping',
    summary: {
      mapped_pincodes: mappedPincodes,
      matched_pincodes: matchedPincodes,
      unmatched_pincodes: allUnmatchedPincodes.length,
      match_rate: matchRate,
      service_areas: mappingResult.rows.length,
      rendered_service_areas: features.length,
      source_feature_count: geometryCache.feature_count,
      source_pincode_count: geometryCache.pincode_count,
      geometry_mode: serviceAreaGeometryMode,
      dissolve_available: dissolveAvailable
    },
    features,
    unmatched_pincodes: allUnmatchedPincodes.sort(),
    fallback_markers: mappingResult.rows
      .filter((row) => (row.pincodes || []).some((pincode) => !geometryCache.byPincode.has(normalizePincode(pincode))))
      .map((row) => ({
        service_area_name: row.service_area_name,
        service_area_code: row.service_area_code || null,
        state: row.state || requestedState,
        unmatched_pincodes: (row.pincodes || [])
          .map(normalizePincode)
          .filter((pincode) => pincode && !geometryCache.byPincode.has(pincode))
          .sort()
      })),
    limitations: [
      'OpenCity geometry has pincode polygons but no direct state or district property.',
      'Selected-state filtering uses service_area_pincode_mapping.state, not OpenCity Circle.',
      'Pincode polygons are grouped into MultiPolygons; true GIS dissolve is not available in the current dependency stack.',
      'Unmatched pincode geometry is not filled; those areas remain transparent and rely on centroid marker fallback.',
      'These are operational Service Area territories generated from mapping data, not legal GIS boundaries.'
    ]
  };
}

export async function getStateWiseReport() {
  const [stateRows, gapResult, serviceAreaResult, stateHeadResult] = await Promise.all([
    getStateMapData(),
    query(
      `
      WITH latest_offline AS (
        SELECT * FROM offline_data_master
        WHERE data_date = (SELECT MAX(data_date) FROM offline_data_master)
      ),
      active_tickets AS (
        SELECT *
        FROM view_ticket
        WHERE UPPER(ticket_assigned_type) = 'ENGINEER'
          AND ticket_status = ANY($1)
      ),
      visit_counts AS (
        SELECT ticket_id, COUNT(*)::int AS visit_count
        FROM visit_master
        WHERE ticket_id IS NOT NULL
        GROUP BY ticket_id
      )
      SELECT
        UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(o.state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g')) AS state_key,
        COUNT(DISTINCT o.cs_id) FILTER (WHERE t.ticket_id IS NULL)::int AS offline_without_ticket,
        COUNT(DISTINCT o.cs_id) FILTER (
          WHERE t.ticket_id IS NOT NULL
            AND COALESCE(v.visit_count, t.total_visits, 0) = 0
        )::int AS ticket_without_visit
      FROM latest_offline o
      LEFT JOIN active_tickets t ON t.cs_id = o.cs_id
      LEFT JOIN visit_counts v ON v.ticket_id = t.ticket_id
      GROUP BY UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(o.state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g'))
      `,
      [activeStatuses]
    ),
    query(
      `
      WITH latest_offline AS (
        SELECT * FROM offline_data_master
        WHERE data_date = (SELECT MAX(data_date) FROM offline_data_master)
      ),
      service_area_sites AS (
        SELECT
          UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g')) AS state_key,
          MAX(COALESCE(NULLIF(TRIM(state), ''), 'Unknown')) AS state,
          COALESCE(NULLIF(TRIM(service_area_name), ''), 'Unmapped') AS service_area_name,
          COUNT(DISTINCT oracle_site_no)::int AS total_sites
        FROM customer_site_master
        GROUP BY
          UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(state), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g')),
          COALESCE(NULLIF(TRIM(service_area_name), ''), 'Unmapped')
      ),
      service_area_offline AS (
        SELECT
          UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(COALESCE(s.state, o.state)), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g')) AS state_key,
          COALESCE(NULLIF(TRIM(s.service_area_name), ''), 'Unmapped') AS service_area_name,
          COUNT(DISTINCT o.cs_id) FILTER (WHERE o.segment = 'PSU' AND o.aging_days > 2)::int AS offline_sites
        FROM latest_offline o
        LEFT JOIN customer_site_master s ON s.cs_id = o.cs_id
        GROUP BY
          UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(COALESCE(s.state, o.state)), ''), 'UNKNOWN'), '[^A-Za-z0-9]', '', 'g')),
          COALESCE(NULLIF(TRIM(s.service_area_name), ''), 'Unmapped')
      )
      SELECT
        sas.state_key,
        sas.state,
        sas.service_area_name,
        sas.total_sites,
        COALESCE(sao.offline_sites, 0)::int AS offline_sites,
        ROUND((COALESCE(sao.offline_sites, 0)::numeric / NULLIF(sas.total_sites, 0)) * 100, 1) AS offline_percentage
      FROM service_area_sites sas
      LEFT JOIN service_area_offline sao
        ON sao.state_key = sas.state_key
       AND sao.service_area_name = sas.service_area_name
      WHERE sas.service_area_name <> 'Unmapped'
      ORDER BY sas.state_key, offline_percentage DESC NULLS LAST, offline_sites DESC, sas.service_area_name
      `
    ),
    query(
      `
      SELECT
        state_key,
        state_head_name,
        state_head_employee_id,
        phone,
        email
      FROM state_head_mapping
      WHERE UPPER(TRIM(active_status)) = ANY($1)
        AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
        AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
      `,
      [activeOwnershipStatuses]
    )
  ]);

  const gapsByState = new Map(
    gapResult.rows.map((row) => [canonicalStateKey(row.state_key), row])
  );
  const stateHeadByState = new Map(
    stateHeadResult.rows.map((row) => [canonicalStateKey(row.state_key), row])
  );

  const serviceAreasByState = new Map();
  for (const row of serviceAreaResult.rows) {
    const key = canonicalStateKey(row.state_key);
    const percent = row.offline_percentage === null ? null : Number(row.offline_percentage);
    const model = {
      service_area_name: row.service_area_name,
      offline_percentage: percent,
      offline_sites: Number(row.offline_sites || 0),
      risk: serviceAreaRiskFromPercentage(percent)
    };
    const list = serviceAreasByState.get(key) || [];
    list.push(model);
    serviceAreasByState.set(key, list);
  }

  return stateRows.map((state) => {
    const stateKey = canonicalStateKey(state.state_key || state.state);
    const gap = gapsByState.get(stateKey) || {};
    const stateHead = stateHeadByState.get(stateKey);
    const serviceAreas = serviceAreasByState.get(stateKey) || [];
    const worst = [...serviceAreas]
      .sort((a, b) => Number(b.offline_percentage ?? -1) - Number(a.offline_percentage ?? -1) || Number(b.offline_sites || 0) - Number(a.offline_sites || 0))
      .slice(0, 3);
    const best = [...serviceAreas]
      .filter((area) => area.offline_percentage !== null)
      .sort((a, b) => Number(a.offline_percentage) - Number(b.offline_percentage) || Number(a.offline_sites || 0) - Number(b.offline_sites || 0))
      .slice(0, 3);

    const offlinePercentage = percentage(state.total_offline, state.total_sites);
    const offlineGt3Percentage = percentage(state.offline_gt_3_days, state.total_sites);
    const offlineWithoutTicketPercentage = percentage(gap.offline_without_ticket, state.total_offline);
    const ticketWithoutVisitPercentage = percentage(gap.ticket_without_visit, state.active_tickets);

    return {
      state: state.state,
      state_head_name: stateHead?.state_head_name || null,
      state_head_employee_id: stateHead?.state_head_employee_id || null,
      state_head_phone: stateHead?.phone || null,
      state_head_email: stateHead?.email || null,
      state_head_status: stateHead?.state_head_name ? 'Mapped' : 'Mapping Pending',
      total_sites: state.total_sites,
      total_offline: state.total_offline,
      offline_gt_3_days: state.offline_gt_3_days,
      offline_percentage: offlinePercentage,
      offline_gt_3_percentage: offlineGt3Percentage,
      offline_without_ticket: Number(gap.offline_without_ticket || 0),
      offline_without_ticket_percentage: offlineWithoutTicketPercentage,
      ticket_without_visit: Number(gap.ticket_without_visit || 0),
      ticket_without_visit_percentage: ticketWithoutVisitPercentage,
      active_engineers: state.active_engineers,
      total_service_areas: state.total_pops,
      worst_service_areas: worst,
      best_service_areas: best,
      avg_tat: state.avg_tat,
      trend_1m: null,
      trend_3m: null,
      trend_6m: null,
      risk: stateRiskFromPercentage(offlineGt3Percentage)
    };
  });
}

function compactSiteRow(row) {
  return {
    cs_id: row.cs_id,
    oracle_site_no: row.oracle_site_no,
    site_name: row.site_name || row.oracle_site_name,
    state: row.state,
    last_visit_date: row.last_visit_date,
    offline_aging: row.offline_aging,
    ticket_status: row.ticket_status
  };
}

export async function getServiceAreaProfile({ state, serviceArea }) {
  const serviceAreaName = String(serviceArea || '').trim();
  const stateName = String(state || '').trim();
  if (!serviceAreaName) {
    const error = new Error('serviceArea query parameter is required');
    error.status = 400;
    throw error;
  }

  const params = [serviceAreaName, stateName || null, activeStatuses];
  const { rows } = await query(
    `
    WITH selected_sites AS (
      SELECT
        s.cs_id,
        s.oracle_site_no,
        s.oracle_site_name,
        s.service_area_name,
        s.state
      FROM customer_site_master s
      WHERE UPPER(TRIM(s.service_area_name)) = UPPER(TRIM($1))
        AND ($2::text IS NULL OR UPPER(TRIM(s.state)) = UPPER(TRIM($2)))
    ),
    selected_identity AS (
      SELECT
        COALESCE((SELECT service_area_name FROM selected_sites WHERE service_area_name IS NOT NULL LIMIT 1), $1) AS service_area_name,
        COALESCE((SELECT state FROM selected_sites WHERE state IS NOT NULL LIMIT 1), $2) AS state,
        (
          SELECT service_area_code
          FROM service_area_master sam
          WHERE UPPER(TRIM(sam.service_area_name)) = UPPER(TRIM(COALESCE((SELECT service_area_name FROM selected_sites WHERE service_area_name IS NOT NULL LIMIT 1), $1)))
          LIMIT 1
        ) AS service_area_code
    ),
    latest_offline AS (
      SELECT *
      FROM offline_data_master
      WHERE data_date = (SELECT MAX(data_date) FROM offline_data_master)
    ),
    selected_offline AS (
      SELECT
        o.cs_id,
        COALESCE(ss.oracle_site_no, NULL) AS oracle_site_no,
        COALESCE(ss.oracle_site_name, o.site_name) AS site_name,
        COALESCE(ss.state, o.state) AS state,
        o.aging_days,
        o.offline_date_time
      FROM latest_offline o
      LEFT JOIN selected_sites ss ON ss.cs_id = o.cs_id
      WHERE ss.cs_id IS NOT NULL
         OR (
          UPPER(TRIM(COALESCE(o.state, ''))) = UPPER(TRIM(COALESCE($2::text, o.state, '')))
          AND UPPER(TRIM(COALESCE(o.descr, ''))) = UPPER(TRIM($1))
         )
    ),
    active_tickets AS (
      SELECT t.*
      FROM view_ticket t
      WHERE UPPER(t.ticket_assigned_type) = 'ENGINEER'
        AND t.ticket_status = ANY($3)
        AND UPPER(TRIM(t.service_area_name)) = UPPER(TRIM($1))
        AND ($2::text IS NULL OR UPPER(TRIM(t.state)) = UPPER(TRIM($2)))
    ),
    visit_counts AS (
      SELECT ticket_id, COUNT(*)::int AS visit_count
      FROM visit_master
      WHERE ticket_id IS NOT NULL
      GROUP BY ticket_id
    ),
    site_last_visits AS (
      SELECT
        ss.cs_id,
        ss.oracle_site_no,
        MAX(v.visit_in_datetime)::date AS last_visit_date
      FROM selected_sites ss
      LEFT JOIN visit_master v
        ON (v.oracle_site_no IS NOT NULL AND v.oracle_site_no = ss.oracle_site_no)
        OR (v.cs_id IS NOT NULL AND v.cs_id = ss.cs_id)
      GROUP BY ss.cs_id, ss.oracle_site_no
    ),
    site_ticket_status AS (
      SELECT
        ss.oracle_site_no,
        ss.cs_id,
        MAX(t.ticket_status) AS ticket_status
      FROM selected_sites ss
      LEFT JOIN view_ticket t ON t.oracle_site_no = ss.oracle_site_no OR t.cs_id = ss.cs_id
      GROUP BY ss.oracle_site_no, ss.cs_id
    ),
    visits_this_month AS (
      SELECT
        COUNT(*)::int AS visits,
        COUNT(DISTINCT v.visit_in_datetime::date)::int AS productive_days
      FROM visit_master v
      JOIN selected_sites ss
        ON (v.oracle_site_no IS NOT NULL AND v.oracle_site_no = ss.oracle_site_no)
        OR (v.cs_id IS NOT NULL AND v.cs_id = ss.cs_id)
      WHERE v.visit_in_datetime >= date_trunc('month', CURRENT_DATE)
    ),
    list_rows AS (
      SELECT
        ss.cs_id,
        ss.oracle_site_no,
        ss.oracle_site_name,
        ss.state,
        slv.last_visit_date,
        so.aging_days AS offline_aging,
        sts.ticket_status
      FROM selected_sites ss
      LEFT JOIN site_last_visits slv ON slv.oracle_site_no = ss.oracle_site_no OR slv.cs_id = ss.cs_id
      LEFT JOIN selected_offline so ON so.cs_id = ss.cs_id
      LEFT JOIN site_ticket_status sts ON sts.oracle_site_no = ss.oracle_site_no OR sts.cs_id = ss.cs_id
    )
    SELECT
      (SELECT row_to_json(selected_identity) FROM selected_identity) AS identity,
      (
        SELECT json_build_object(
          'total_sites', (SELECT COUNT(DISTINCT oracle_site_no)::int FROM selected_sites),
          'offline_sites', (SELECT COUNT(DISTINCT cs_id)::int FROM selected_offline),
          'offline_gt_3_days', (SELECT COUNT(DISTINCT cs_id)::int FROM selected_offline WHERE aging_days > 3),
          'active_tickets', (SELECT COUNT(*)::int FROM active_tickets),
          'tickets_without_visit', (
            SELECT COUNT(*)::int
            FROM active_tickets t
            LEFT JOIN visit_counts vc ON vc.ticket_id = t.ticket_id
            WHERE COALESCE(vc.visit_count, t.total_visits, 0) = 0
          ),
          'offline_without_ticket', (
            SELECT COUNT(DISTINCT so.cs_id)::int
            FROM selected_offline so
            LEFT JOIN active_tickets t ON t.cs_id = so.cs_id
            WHERE t.ticket_id IS NULL
          ),
          'avg_tat', (SELECT ROUND(AVG(aging_days)::numeric, 1) FROM active_tickets)
        )
      ) AS current_health,
      (
        SELECT json_build_object(
          'visits_this_month', COALESCE((SELECT visits FROM visits_this_month), 0),
          'productive_days', COALESCE((SELECT productive_days FROM visits_this_month), 0),
          'avg_visits_per_day', ROUND((COALESCE((SELECT visits FROM visits_this_month), 0)::numeric / NULLIF((SELECT productive_days FROM visits_this_month), 0)), 1),
          'active_tickets', (SELECT COUNT(*)::int FROM active_tickets),
          'zero_visit_tickets', (
            SELECT COUNT(*)::int
            FROM active_tickets t
            LEFT JOIN visit_counts vc ON vc.ticket_id = t.ticket_id
            WHERE COALESCE(vc.visit_count, t.total_visits, 0) = 0
          ),
          'repeat_visit_rate', NULL,
          'avg_tat', (SELECT ROUND(AVG(aging_days)::numeric, 1) FROM active_tickets)
        )
      ) AS engineer_quality,
      (
        SELECT json_build_object(
          'total_sites', (SELECT COUNT(DISTINCT oracle_site_no)::int FROM selected_sites),
          'never_visited_count', (SELECT COUNT(*)::int FROM site_last_visits WHERE last_visit_date IS NULL),
          'not_visited_30_count', (SELECT COUNT(*)::int FROM site_last_visits WHERE last_visit_date IS NULL OR last_visit_date < CURRENT_DATE - INTERVAL '30 days'),
          'not_visited_60_count', (SELECT COUNT(*)::int FROM site_last_visits WHERE last_visit_date IS NULL OR last_visit_date < CURRENT_DATE - INTERVAL '60 days'),
          'not_visited_90_count', (SELECT COUNT(*)::int FROM site_last_visits WHERE last_visit_date IS NULL OR last_visit_date < CURRENT_DATE - INTERVAL '90 days')
        )
      ) AS site_coverage,
      (
        SELECT json_build_object(
          'current_offline_sites', COALESCE((
            SELECT json_agg(row_to_json(x))
            FROM (
              SELECT * FROM list_rows WHERE offline_aging IS NOT NULL ORDER BY offline_aging DESC NULLS LAST LIMIT 20
            ) x
          ), '[]'::json),
          'never_visited_sites', COALESCE((
            SELECT json_agg(row_to_json(x))
            FROM (
              SELECT * FROM list_rows WHERE last_visit_date IS NULL ORDER BY oracle_site_name NULLS LAST LIMIT 20
            ) x
          ), '[]'::json),
          'not_visited_30_sites', COALESCE((
            SELECT json_agg(row_to_json(x))
            FROM (
              SELECT * FROM list_rows WHERE last_visit_date IS NULL OR last_visit_date < CURRENT_DATE - INTERVAL '30 days' ORDER BY last_visit_date NULLS FIRST, oracle_site_name NULLS LAST LIMIT 20
            ) x
          ), '[]'::json)
        )
      ) AS lists
    `,
    params
  );

  const result = rows[0] || {};
  const identity = result.identity || {};
  const currentHealth = result.current_health || {};
  const siteCoverage = result.site_coverage || {};
  const engineerQuality = result.engineer_quality || {};
  const lists = result.lists || {};
  const ownershipResult = await query(
    `
    SELECT
      m.engineer_id,
      m.engineer_name,
      m.assignment_start_date,
      m.backup_engineer_id,
      m.backup_engineer_name,
      m.manager_employee_id,
      m.manager_name,
      e.phone_no AS engineer_phone
    FROM service_area_engineer_mapping m
    LEFT JOIN engineer_master e ON e.employee_id = m.engineer_id
    WHERE UPPER(TRIM(m.active_status)) = ANY($1)
      AND (m.effective_from IS NULL OR m.effective_from <= CURRENT_DATE)
      AND (m.effective_to IS NULL OR m.effective_to >= CURRENT_DATE)
      AND (
        (m.service_area_code IS NOT NULL AND $2::text IS NOT NULL AND UPPER(TRIM(m.service_area_code)) = UPPER(TRIM($2::text)))
        OR (
          m.service_area_key = UPPER(REGEXP_REPLACE(TRIM($3::text), '[^A-Za-z0-9]', '', 'g'))
          AND m.state_key = UPPER(REGEXP_REPLACE(TRIM(COALESCE($4::text, m.state)), '[^A-Za-z0-9]', '', 'g'))
        )
      )
    ORDER BY CASE WHEN m.service_area_code IS NOT NULL AND $2::text IS NOT NULL AND UPPER(TRIM(m.service_area_code)) = UPPER(TRIM($2::text)) THEN 0 ELSE 1 END
    LIMIT 1
    `,
    [activeOwnershipStatuses, identity.service_area_code || null, identity.service_area_name || serviceAreaName, identity.state || stateName || null]
  );
  const owner = ownershipResult.rows[0] || null;
  const totalSites = Number(currentHealth.total_sites || siteCoverage.total_sites || 0);
  const offlineSites = Number(currentHealth.offline_sites || 0);

  return {
    service_area_name: identity.service_area_name || serviceAreaName,
    service_area_code: identity.service_area_code || null,
    state: identity.state || stateName || null,
    ownership: {
      state_head_name: null,
      state_head_status: 'Mapping Pending',
      active_engineer_name: owner?.engineer_name || null,
      active_engineer_id: owner?.engineer_id || null,
      active_engineer_status: owner?.engineer_name ? 'Mapped' : 'Mapping Pending',
      engineer_manager: owner?.manager_name || null,
      engineer_manager_id: owner?.manager_employee_id || null,
      engineer_phone: owner?.engineer_phone || null,
      backup_engineer_name: owner?.backup_engineer_name || null,
      backup_engineer_id: owner?.backup_engineer_id || null,
      assignment_start_date: owner?.assignment_start_date || null
    },
    current_health: {
      ...currentHealth,
      total_sites: totalSites,
      offline_sites: offlineSites,
      offline_percentage: percentage(offlineSites, totalSites),
      offline_gt_3_days: Number(currentHealth.offline_gt_3_days || 0),
      active_tickets: Number(currentHealth.active_tickets || 0),
      tickets_without_visit: Number(currentHealth.tickets_without_visit || 0),
      offline_without_ticket: Number(currentHealth.offline_without_ticket || 0),
      avg_tat: currentHealth.avg_tat === null || currentHealth.avg_tat === undefined ? null : Number(currentHealth.avg_tat)
    },
    engineer_quality: {
      visits_this_month: Number(engineerQuality.visits_this_month || 0),
      productive_days: Number(engineerQuality.productive_days || 0),
      avg_visits_per_day: engineerQuality.avg_visits_per_day === null || engineerQuality.avg_visits_per_day === undefined ? null : Number(engineerQuality.avg_visits_per_day),
      active_tickets: Number(engineerQuality.active_tickets || 0),
      zero_visit_tickets: Number(engineerQuality.zero_visit_tickets || 0),
      repeat_visit_rate: null,
      avg_tat: engineerQuality.avg_tat === null || engineerQuality.avg_tat === undefined ? null : Number(engineerQuality.avg_tat)
    },
    site_coverage: {
      total_sites: Number(siteCoverage.total_sites || totalSites || 0),
      never_visited_count: Number(siteCoverage.never_visited_count || 0),
      not_visited_30_count: Number(siteCoverage.not_visited_30_count || 0),
      not_visited_60_count: Number(siteCoverage.not_visited_60_count || 0),
      not_visited_90_count: Number(siteCoverage.not_visited_90_count || 0)
    },
    lists: {
      current_offline_sites: (lists.current_offline_sites || []).map(compactSiteRow),
      never_visited_sites: (lists.never_visited_sites || []).map(compactSiteRow),
      not_visited_30_sites: (lists.not_visited_30_sites || []).map(compactSiteRow)
    }
  };
}

export async function getOfflineWithoutTicket() {
  const { rows } = await query(
    `
    WITH latest_offline AS (
      SELECT * FROM offline_data_master
      WHERE data_date = (SELECT MAX(data_date) FROM offline_data_master)
    ),
    active_tickets AS (
      SELECT DISTINCT cs_id
      FROM view_ticket
      WHERE UPPER(ticket_assigned_type) = 'ENGINEER'
        AND ticket_status = ANY($1)
    )
    SELECT
      o.cs_id,
      o.site_name,
      o.b2b_code,
      o.state,
      o.zone,
      o.aging_days,
      o.bucket,
      o.segment,
      s.service_area_name,
      s.latitude,
      s.longitude
    FROM latest_offline o
    LEFT JOIN active_tickets t ON t.cs_id = o.cs_id
    LEFT JOIN customer_site_master s ON s.cs_id = o.cs_id
    WHERE t.cs_id IS NULL
    ORDER BY o.aging_days DESC NULLS LAST
    LIMIT 100
    `,
    [activeStatuses]
  );
  return rows;
}

export async function getTicketWithoutVisit() {
  const { rows } = await query(
    `
    SELECT
      t.ticket_id,
      t.cs_id,
      t.oracle_site_name,
      t.primary_customer_name,
      t.state,
      t.service_area_name,
      t.ticket_status,
      t.aging_days,
      t.ticket_type,
      t.assigned_employee_name,
      t.assigned_employee_id,
      COALESCE(v.visit_count, t.total_visits, 0)::int AS visit_count
    FROM view_ticket t
    LEFT JOIN (
      SELECT ticket_id, COUNT(*)::int AS visit_count
      FROM visit_master
      WHERE ticket_id IS NOT NULL
      GROUP BY ticket_id
    ) v ON v.ticket_id = t.ticket_id
    WHERE UPPER(t.ticket_assigned_type) = 'ENGINEER'
      AND t.ticket_status = ANY($1)
      AND COALESCE(v.visit_count, t.total_visits, 0) = 0
    ORDER BY t.aging_days DESC NULLS LAST
    LIMIT 100
    `,
    [activeStatuses]
  );
  return rows;
}

export async function getCompletedStillOffline() {
  const { rows } = await query(
    `
    WITH latest_offline AS (
      SELECT * FROM offline_data_master
      WHERE data_date = (SELECT MAX(data_date) FROM offline_data_master)
    )
    SELECT
      t.ticket_id,
      t.cs_id,
      t.oracle_site_name,
      t.ticket_status,
      t.aging_days AS ticket_aging_days,
      o.aging_days AS offline_aging_days,
      t.assigned_employee_name,
      t.assigned_employee_id,
      t.service_area_name,
      o.state
    FROM view_ticket t
    JOIN latest_offline o ON o.cs_id = t.cs_id
    WHERE UPPER(t.ticket_assigned_type) = 'ENGINEER'
      AND t.ticket_status IN ('COMPLETED', 'SENTBACK', 'SENDBACK')
    ORDER BY o.aging_days DESC NULLS LAST
    LIMIT 100
    `
  );
  return rows;
}

export async function getEngineerLoad() {
  const { rows } = await query(
    `
    SELECT
      t.assigned_employee_id AS employee_id,
      COALESCE(e.employee_name, t.assigned_employee_name, 'Unassigned') AS employee_name,
      e.phone_no,
      COALESCE(e.service_state, t.state, 'Unknown') AS state,
      COUNT(*)::int AS active_tickets,
      COUNT(*) FILTER (WHERE t.ticket_status = 'OPEN')::int AS open_tickets,
      COUNT(*) FILTER (WHERE t.ticket_status = 'PENDING')::int AS pending_tickets,
      COUNT(*) FILTER (WHERE t.ticket_status = 'COMPLETED')::int AS completed_tickets,
      COUNT(*) FILTER (WHERE t.ticket_status IN ('SENTBACK','SENDBACK'))::int AS sendback_tickets,
      COALESCE(SUM(COALESCE(vc.visit_count, t.total_visits, 0)), 0)::int AS total_ticket_visits,
      COALESCE(MAX(ev.productive_days), 0)::int AS productive_days,
      ROUND(AVG(t.aging_days)::numeric, 1) AS avg_ticket_aging
    FROM view_ticket t
    LEFT JOIN engineer_master e ON e.employee_id = t.assigned_employee_id
    LEFT JOIN (
      SELECT ticket_id, COUNT(*)::int AS visit_count
      FROM visit_master
      WHERE ticket_id IS NOT NULL
      GROUP BY ticket_id
    ) vc ON vc.ticket_id = t.ticket_id
    LEFT JOIN (
      SELECT employee_id, COUNT(DISTINCT visit_in_datetime::date)::int AS productive_days
      FROM visit_master
      WHERE employee_id IS NOT NULL AND visit_in_datetime IS NOT NULL
      GROUP BY employee_id
    ) ev ON ev.employee_id = t.assigned_employee_id
    WHERE UPPER(t.ticket_assigned_type) = 'ENGINEER'
      AND t.ticket_status = ANY($1)
    GROUP BY t.assigned_employee_id, COALESCE(e.employee_name, t.assigned_employee_name, 'Unassigned'), e.phone_no, COALESCE(e.service_state, t.state, 'Unknown')
    ORDER BY active_tickets DESC, avg_ticket_aging DESC NULLS LAST
    LIMIT 100
    `,
    [activeStatuses]
  );
  return rows;
}

export async function getBreakdowns() {
  const [bucket, bank] = await Promise.all([
    query(
      `SELECT COALESCE(bucket, 'Unknown') AS name, COUNT(*)::int AS value
       FROM offline_data_master
       WHERE data_date = (SELECT MAX(data_date) FROM offline_data_master)
       GROUP BY COALESCE(bucket, 'Unknown')
       ORDER BY value DESC`
    ),
    query(
      `SELECT COALESCE(bank_name_standard, b2b_code, 'Unknown') AS name, COUNT(*)::int AS value
       FROM offline_data_master
       WHERE data_date = (SELECT MAX(data_date) FROM offline_data_master)
       GROUP BY COALESCE(bank_name_standard, b2b_code, 'Unknown')
       ORDER BY value DESC`
    )
  ]);
  return { bucket: bucket.rows, bank: bank.rows };
}

function scopeWhere(alias, filters = {}, startIndex = 1) {
  const clauses = [];
  const values = [];
  if (filters.state) {
    values.push(filters.state);
    clauses.push(`LOWER(TRIM(${alias}.state)) = LOWER(TRIM($${startIndex + values.length - 1}))`);
  }
  if (filters.serviceArea) {
    values.push(filters.serviceArea);
    clauses.push(`LOWER(TRIM(${alias}.service_area_name)) = LOWER(TRIM($${startIndex + values.length - 1}))`);
  }
  return { clause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', values };
}

async function serviceRequestSource() {
  const snapshot = await query('SELECT MAX(snapshot_date) AS snapshot_date, COUNT(*)::int AS rows FROM service_request_snapshot');
  if (Number(snapshot.rows[0]?.rows || 0) > 0) {
    return {
      table: 'service_request_snapshot',
      dateColumn: 'snapshot_date',
      latestDate: snapshot.rows[0].snapshot_date,
      sourceMode: 'historical_snapshot'
    };
  }
  return {
    table: 'view_ticket',
    dateColumn: 'CURRENT_DATE',
    latestDate: null,
    sourceMode: 'current_view_ticket'
  };
}

export async function getV3CommandCenter(filters = {}) {
  const source = await serviceRequestSource();
  const scoped = scopeWhere('sr', filters, source.table === 'service_request_snapshot' ? 2 : 1);
  const dateFilter = source.table === 'service_request_snapshot' ? 'sr.snapshot_date = $1' : 'TRUE';
  const params = source.table === 'service_request_snapshot'
    ? [source.latestDate, ...scoped.values]
    : scoped.values;
  const scopeClause = scoped.clause
    ? `${source.table === 'service_request_snapshot' ? 'AND' : 'WHERE'} ${scoped.clause.replace(/^WHERE\s+/i, '')}`
    : '';

  const [
    uploadResult,
    metricResult,
    statusResult,
    offlineTrendResult,
    srTrendResult,
    serviceAreaResult,
    totalSitesResult
  ] = await Promise.all([
    query(
      `SELECT id, upload_date, source_file_name, uploaded_at, record_count, data_type, target_table
       FROM upload_history
       ORDER BY uploaded_at DESC
       LIMIT 12`
    ),
    query(
      `
      WITH sr AS (
        SELECT *
        FROM ${source.table} sr
        WHERE ${dateFilter}
        ${scopeClause}
      ),
      latest_offline AS (
        SELECT o.*
        FROM offline_data_master o
        WHERE o.data_date = (SELECT MAX(data_date) FROM offline_data_master)
      ),
      scoped_offline AS (
        SELECT o.*
        FROM latest_offline o
        LEFT JOIN customer_site_master s ON s.cs_id = o.cs_id
        WHERE ($${params.length + 1}::text IS NULL OR LOWER(TRIM(COALESCE(s.state, o.state))) = LOWER(TRIM($${params.length + 1})))
          AND ($${params.length + 2}::text IS NULL OR LOWER(TRIM(s.service_area_name)) = LOWER(TRIM($${params.length + 2})))
      ),
      repeat_sites AS (
        SELECT COALESCE(NULLIF(oracle_site_no, ''), NULLIF(cs_id, '')) AS site_id
        FROM ${source.table}
        WHERE COALESCE(NULLIF(oracle_site_no, ''), NULLIF(cs_id, '')) IS NOT NULL
        GROUP BY COALESCE(NULLIF(oracle_site_no, ''), NULLIF(cs_id, ''))
        HAVING COUNT(DISTINCT ticket_id) > 1
      ),
      offline_30 AS (
        SELECT data_date, COUNT(DISTINCT cs_id)::int AS offline_sites
        FROM offline_data_master
        WHERE data_date >= CURRENT_DATE - INTERVAL '29 days'
        GROUP BY data_date
      )
      SELECT
        (SELECT COUNT(*)::int FROM sr) AS total_sr,
        (SELECT COUNT(*)::int FROM sr WHERE ticket_status = ANY($${params.length + 3})) AS open_sr,
        (SELECT COUNT(*)::int FROM sr WHERE ticket_status IN ('PENDING', 'SENTBACK', 'SENDBACK')) AS pending_sr,
        (SELECT COUNT(*)::int FROM sr WHERE ticket_status = 'COMPLETED') AS complete_sr,
        (
          SELECT COUNT(DISTINCT COALESCE(NULLIF(oracle_site_no, ''), NULLIF(cs_id, '')))::int
          FROM sr
          WHERE ticket_status = ANY($${params.length + 3})
        ) AS sites_with_open_sr,
        (
          SELECT ROUND(AVG(EXTRACT(EPOCH FROM (last_visit_in_datetime - create_date)) / 3600)::numeric, 1)
          FROM sr
          WHERE create_date IS NOT NULL AND last_visit_in_datetime IS NOT NULL
        ) AS avg_first_visit_hours,
        (
          SELECT ROUND(AVG(EXTRACT(EPOCH FROM (ticket_closed_datetime - create_date)) / 3600)::numeric, 1)
          FROM sr
          WHERE create_date IS NOT NULL AND ticket_closed_datetime IS NOT NULL
        ) AS avg_closure_hours,
        (SELECT COUNT(*)::int FROM repeat_sites) AS repeat_failure_sites,
        (SELECT COUNT(DISTINCT cs_id)::int FROM scoped_offline WHERE segment = 'PSU' AND aging_days > 2) AS current_offline_sites,
        (SELECT ROUND(AVG(offline_sites)::numeric, 1) FROM offline_30) AS offline_sites_avg_30_days
      `,
      [...params, filters.state || null, filters.serviceArea || null, activeStatuses]
    ),
    query(
      `
      SELECT COALESCE(ticket_status, 'Unknown') AS name, COUNT(*)::int AS value
      FROM ${source.table} sr
      WHERE ${dateFilter}
      ${scopeClause}
      GROUP BY COALESCE(ticket_status, 'Unknown')
      ORDER BY value DESC
      `,
      params
    ),
    query(
      `
      WITH daily AS (
        SELECT data_date, COUNT(DISTINCT cs_id)::int AS offline_sites
        FROM offline_data_master
        WHERE data_date >= CURRENT_DATE - INTERVAL '59 days'
        GROUP BY data_date
      )
      SELECT
        data_date,
        offline_sites,
        ROUND(AVG(offline_sites) OVER (ORDER BY data_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)::numeric, 1) AS avg_7_day,
        ROUND(AVG(offline_sites) OVER (ORDER BY data_date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW)::numeric, 1) AS avg_30_day
      FROM daily
      ORDER BY data_date
      `
    ),
    query(
      `
      WITH daily AS (
        SELECT
          ${source.table === 'service_request_snapshot' ? 'snapshot_date' : 'CURRENT_DATE'}::date AS metric_date,
          COUNT(*)::int AS total_sr,
          COUNT(*) FILTER (WHERE ticket_status = ANY($1))::int AS open_sr,
          COUNT(DISTINCT COALESCE(NULLIF(oracle_site_no, ''), NULLIF(cs_id, ''))) FILTER (WHERE ticket_status = ANY($1))::int AS sites_with_open_sr,
          ROUND(AVG(EXTRACT(EPOCH FROM (last_visit_in_datetime - create_date)) / 3600)::numeric, 1) AS avg_first_visit_hours,
          ROUND(AVG(EXTRACT(EPOCH FROM (ticket_closed_datetime - create_date)) / 3600)::numeric, 1) AS avg_closure_hours
        FROM ${source.table}
        GROUP BY ${source.table === 'service_request_snapshot' ? 'snapshot_date' : 'CURRENT_DATE'}
      )
      SELECT *
      FROM daily
      ORDER BY metric_date
      LIMIT 60
      `,
      [activeStatuses]
    ),
    query(
      `
      SELECT
        COALESCE(NULLIF(TRIM(state), ''), 'Unknown') AS state,
        COALESCE(NULLIF(TRIM(service_area_name), ''), 'Unmapped') AS service_area_name,
        COUNT(*)::int AS total_sr,
        COUNT(*) FILTER (WHERE ticket_status = ANY($${params.length + 1}))::int AS open_sr,
        COUNT(DISTINCT COALESCE(NULLIF(oracle_site_no, ''), NULLIF(cs_id, ''))) FILTER (WHERE ticket_status = ANY($${params.length + 1}))::int AS sites_with_open_sr,
        ROUND(AVG(EXTRACT(EPOCH FROM (last_visit_in_datetime - create_date)) / 3600)::numeric, 1) AS avg_first_visit_hours,
        ROUND(AVG(EXTRACT(EPOCH FROM (ticket_closed_datetime - create_date)) / 3600)::numeric, 1) AS avg_closure_hours
      FROM ${source.table} sr
      WHERE ${dateFilter}
      ${scopeClause}
      GROUP BY COALESCE(NULLIF(TRIM(state), ''), 'Unknown'), COALESCE(NULLIF(TRIM(service_area_name), ''), 'Unmapped')
      ORDER BY open_sr DESC, total_sr DESC
      LIMIT 20
      `,
      [...params, activeStatuses]
    ),
    query(
      `-- Site denominator rule: total_sites counts all sites in scope.
       -- Any active_sites API naming is compatibility-only and must not imply filtering active_status.
       SELECT COUNT(DISTINCT oracle_site_no)::int AS total_sites FROM customer_site_master`
    )
  ]);

  const metrics = metricResult.rows[0] || {};
  const totalSites = Number(totalSitesResult.rows[0]?.total_sites || 0);
  const sitesWithOpenSr = Number(metrics.sites_with_open_sr || 0);

  return {
    source_mode: source.sourceMode,
    latest_service_request_snapshot: source.latestDate,
    upload_history: uploadResult.rows,
    metrics: {
      ...metrics,
      total_sites: totalSites,
      // active_sites is kept for API compatibility.
      // It currently means all sites in selected scope.
      // Do not filter by customer_site_master.active_status until business rule changes.
      active_sites: totalSites,
      open_site_issue_percentage: totalSites ? Math.round((sitesWithOpenSr / totalSites) * 1000) / 10 : null
    },
    sr_status_split: statusResult.rows,
    daily_offline_trend: offlineTrendResult.rows,
    service_request_trend: srTrendResult.rows,
    service_area_summary: serviceAreaResult.rows
  };
}

export async function getV3SiteIntelligence({ siteId }) {
  const cleanedSiteId = String(siteId || '').trim();
  if (!cleanedSiteId) {
    const error = new Error('siteId query parameter is required');
    error.status = 400;
    throw error;
  }

  const source = await serviceRequestSource();
  const [siteResult, ticketResult, visitResult, offlineResult] = await Promise.all([
    query(
      `SELECT *
       FROM customer_site_master
       WHERE oracle_site_no = $1 OR cs_id = $1
       LIMIT 1`,
      [cleanedSiteId]
    ),
    query(
      `SELECT
         ${source.table === 'service_request_snapshot' ? 'snapshot_date' : 'CURRENT_DATE'}::date AS snapshot_date,
         *
       FROM ${source.table}
       WHERE oracle_site_no = $1 OR cs_id = $1
       ORDER BY ${source.table === 'service_request_snapshot' ? 'snapshot_date' : 'CURRENT_DATE'} DESC, create_date DESC NULLS LAST
       LIMIT 200`,
      [cleanedSiteId]
    ),
    query(
      `SELECT *
       FROM visit_master
       WHERE oracle_site_no = $1 OR cs_id = $1
       ORDER BY visit_in_datetime DESC NULLS LAST
       LIMIT 200`,
      [cleanedSiteId]
    ),
    query(
      `SELECT data_date, offline_date_time, aging_days, segment, source_file
       FROM offline_data_master
       WHERE cs_id = $1
       ORDER BY data_date DESC, offline_date_time DESC NULLS LAST
       LIMIT 200`,
      [cleanedSiteId]
    )
  ]);

  const tickets = ticketResult.rows;
  const visits = visitResult.rows;
  const offlineRows = offlineResult.rows;
  const timeline = [
    ...offlineRows.map((row) => ({
      type: 'offline',
      date: row.offline_date_time || row.data_date,
      label: 'Site appeared offline',
      detail: `Aging ${row.aging_days ?? '—'} days`
    })),
    ...tickets.map((row) => ({
      type: 'service_request',
      date: row.create_date || row.snapshot_date,
      label: `SR ${row.ticket_id} ${row.ticket_status || ''}`.trim(),
      detail: row.assigned_employee_name || row.ticket_status_reason || null
    })),
    ...visits.map((row) => ({
      type: 'visit',
      date: row.visit_in_datetime,
      label: `Visit ${row.visit_id || row.ticket_id || ''}`.trim(),
      detail: row.employee_id || null
    }))
  ].filter((item) => item.date).sort((a, b) => new Date(a.date) - new Date(b.date));

  const openTickets = tickets.filter((row) => activeStatuses.includes(row.ticket_status));
  return {
    site: siteResult.rows[0] || null,
    current_open_sr_count: openTickets.length,
    total_sr_till_date: new Set(tickets.map((row) => row.ticket_id)).size,
    total_visits_till_date: visits.length,
    offline_dates: [...new Set(offlineRows.map((row) => row.data_date).filter(Boolean))],
    repeat_failure_count: Math.max(0, new Set(tickets.map((row) => row.ticket_id)).size - 1),
    service_requests: tickets,
    visits,
    timeline
  };
}
