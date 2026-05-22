import { query } from '../db/pool.js';

const openStatuses = ['OPEN'];
const pendingStatuses = ['PENDING'];
const completeStatuses = ['COMPLETE', 'COMPLETED'];
const siteOpenStatuses = ['OPEN', 'PENDING'];

function dateRangeFromQuery(params = {}) {
  return {
    from: params.from || params.startDate || null,
    to: params.to || params.endDate || null
  };
}

function buildScopeWhere(alias, { state, serviceArea, dateRange, dateColumn = 'open_date' } = {}, startIndex = 1) {
  const clauses = [];
  const values = [];
  if (dateRange?.from) {
    values.push(dateRange.from);
    clauses.push(`${alias}.${dateColumn}::date >= $${startIndex + values.length - 1}`);
  }
  if (dateRange?.to) {
    values.push(dateRange.to);
    clauses.push(`${alias}.${dateColumn}::date <= $${startIndex + values.length - 1}`);
  }
  if (state) {
    values.push(state);
    clauses.push(`LOWER(TRIM(${alias}.state)) = LOWER(TRIM($${startIndex + values.length - 1}))`);
  }
  if (serviceArea) {
    values.push(serviceArea);
    clauses.push(`LOWER(TRIM(${alias}.service_area_name)) = LOWER(TRIM($${startIndex + values.length - 1}))`);
  }
  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values
  };
}

async function serviceRequestSourceSql() {
  const result = await query('SELECT COUNT(*)::int AS count FROM service_requests');
  if (Number(result.rows[0]?.count || 0) > 0) {
    return `
      SELECT
        ticket_id,
        site_id,
        cs_id,
        atm_id,
        state,
        service_area_name,
        issue_type,
        priority,
        status,
        open_date,
        pending_date,
        complete_date,
        assigned_to_type,
        engineer_name,
        vendor_name,
        state_manager,
        sla_due_date,
        last_remark,
        last_updated_at
      FROM service_requests
    `;
  }

  return `
    SELECT
      ticket_id,
      COALESCE(NULLIF(oracle_site_no, ''), NULLIF(cs_id, '')) AS site_id,
      cs_id,
      atm_id,
      state,
      service_area_name,
      COALESCE(ticket_type, ticket_sub_type) AS issue_type,
      CASE WHEN aging_days > 7 THEN 'HIGH' ELSE NULL END AS priority,
      ticket_status AS status,
      create_date AS open_date,
      CASE WHEN ticket_status IN ('PENDING', 'SENTBACK', 'SENDBACK') THEN COALESCE(last_submission_datetime, create_date) ELSE NULL END AS pending_date,
      ticket_closed_datetime AS complete_date,
      ticket_assigned_type AS assigned_to_type,
      CASE WHEN UPPER(COALESCE(ticket_assigned_type, '')) = 'ENGINEER' THEN assigned_employee_name ELSE NULL END AS engineer_name,
      CASE WHEN UPPER(COALESCE(ticket_assigned_type, '')) = 'VENDOR' THEN ticket_assigned_to ELSE NULL END AS vendor_name,
      current_approver_name AS state_manager,
      planned_date AS sla_due_date,
      ticket_status_reason AS last_remark,
      refreshed_at AS last_updated_at
    FROM view_ticket
  `;
}

async function totalSitesInScope({ state, serviceArea } = {}) {
  const scoped = buildScopeWhere('s', { state, serviceArea }, 1);
  const result = await query(
    // Site denominator rule: count all sites in selected scope.
    // Do not filter by customer_site_master.active_status until business rule changes.
    `SELECT COUNT(DISTINCT oracle_site_no)::int AS total_sites
     FROM customer_site_master s
     ${scoped.where}`,
    scoped.values
  );
  return Number(result.rows[0]?.total_sites || 0);
}

export async function getDashboardSummary(params = {}) {
  const sourceSql = await serviceRequestSourceSql();
  const dateRange = dateRangeFromQuery(params);
  const scoped = buildScopeWhere('sr', { state: params.state, serviceArea: params.serviceArea, dateRange }, 1);
  const sitesInScope = await totalSitesInScope(params);
  const result = await query(
    `
    WITH sr AS (${sourceSql})
    SELECT
      COUNT(*)::int AS total_sr,
      COUNT(*) FILTER (WHERE status = ANY($${scoped.values.length + 1}))::int AS open_sr,
      COUNT(*) FILTER (WHERE status = ANY($${scoped.values.length + 2}))::int AS pending_sr,
      COUNT(*) FILTER (WHERE status = ANY($${scoped.values.length + 3}))::int AS complete_sr,
      COUNT(DISTINCT site_id) FILTER (WHERE status = ANY($${scoped.values.length + 4}))::int AS sites_with_open_sr,
      ROUND(AVG(EXTRACT(EPOCH FROM (fv.first_visit_date - sr.open_date)) / 3600)::numeric, 2) AS avg_first_visit_time_hours,
      ROUND((AVG(EXTRACT(EPOCH FROM (sr.complete_date - sr.open_date)) / 3600) FILTER (WHERE sr.complete_date IS NOT NULL))::numeric, 2) AS avg_closure_time_hours
    FROM sr
    LEFT JOIN (
      SELECT ticket_id, MIN(visit_date) AS first_visit_date
      FROM service_visits
      WHERE visit_date IS NOT NULL
      GROUP BY ticket_id
    ) fv ON fv.ticket_id = sr.ticket_id
    ${scoped.where}
    `,
    [...scoped.values, openStatuses, pendingStatuses, completeStatuses, siteOpenStatuses]
  );
  const row = result.rows[0] || {};
  const sitesWithOpenSr = Number(row.sites_with_open_sr || 0);
  return {
    ...row,
    total_sites_in_scope: sitesInScope,
    total_sites: sitesInScope,
    // total_active_sites_in_scope is kept for API compatibility.
    // It currently means all sites in selected scope.
    // Do not filter by customer_site_master.active_status until business rule changes.
    total_active_sites_in_scope: sitesInScope,
    open_site_issue_percentage: sitesInScope ? Math.round((sitesWithOpenSr / sitesInScope) * 10000) / 100 : null
  };
}

export async function getStateHealth(params = {}) {
  const sourceSql = await serviceRequestSourceSql();
  const dateRange = dateRangeFromQuery(params);
  const scoped = buildScopeWhere('sr', { dateRange }, 1);
  const result = await query(
    `
    WITH sr AS (${sourceSql}),
    state_sites AS (
      -- active_sites compatibility naming means all sites in selected scope.
      -- Do not filter by customer_site_master.active_status until business rule changes.
      SELECT COALESCE(NULLIF(TRIM(state), ''), 'Unknown') AS state, COUNT(DISTINCT oracle_site_no)::int AS total_sites
      FROM customer_site_master
      GROUP BY COALESCE(NULLIF(TRIM(state), ''), 'Unknown')
    )
    SELECT
      COALESCE(NULLIF(TRIM(sr.state), ''), 'Unknown') AS state,
      COUNT(*)::int AS total_sr,
      COUNT(*) FILTER (WHERE status = ANY($${scoped.values.length + 1}))::int AS open_sr,
      COUNT(*) FILTER (WHERE status = ANY($${scoped.values.length + 2}))::int AS pending_sr,
      COUNT(*) FILTER (WHERE status = ANY($${scoped.values.length + 3}))::int AS complete_sr,
      COUNT(DISTINCT site_id) FILTER (WHERE status = ANY($${scoped.values.length + 4}))::int AS sites_with_open_sr,
      COALESCE(MAX(ss.total_sites), 0)::int AS total_sites,
      -- total_active_sites is kept for API compatibility.
      -- It currently means all sites in selected scope.
      -- Do not filter by customer_site_master.active_status until business rule changes.
      COALESCE(MAX(ss.total_sites), 0)::int AS total_active_sites,
      ROUND((COUNT(DISTINCT site_id) FILTER (WHERE status = ANY($${scoped.values.length + 4}))::numeric / NULLIF(MAX(ss.total_sites), 0)) * 100, 2)::float AS open_site_issue_percentage
    FROM sr
    LEFT JOIN state_sites ss ON LOWER(ss.state) = LOWER(COALESCE(NULLIF(TRIM(sr.state), ''), 'Unknown'))
    ${scoped.where}
    GROUP BY COALESCE(NULLIF(TRIM(sr.state), ''), 'Unknown')
    ORDER BY open_sr DESC, total_sr DESC
    `,
    [...scoped.values, openStatuses, pendingStatuses, completeStatuses, siteOpenStatuses]
  );
  return result.rows;
}

export async function getServiceAreaHealth(params = {}) {
  const sourceSql = await serviceRequestSourceSql();
  const dateRange = dateRangeFromQuery(params);
  const scoped = buildScopeWhere('sr', { state: params.state, dateRange }, 1);
  const result = await query(
    `
    WITH sr AS (${sourceSql})
    SELECT
      COALESCE(NULLIF(TRIM(state), ''), 'Unknown') AS state,
      COALESCE(NULLIF(TRIM(service_area_name), ''), 'Unmapped') AS service_area_name,
      COUNT(*)::int AS total_sr,
      COUNT(*) FILTER (WHERE status = ANY($${scoped.values.length + 1}))::int AS open_sr,
      COUNT(*) FILTER (WHERE status = ANY($${scoped.values.length + 2}))::int AS pending_sr,
      COUNT(*) FILTER (WHERE status = ANY($${scoped.values.length + 3}))::int AS complete_sr,
      COUNT(DISTINCT site_id) FILTER (WHERE status = ANY($${scoped.values.length + 4}))::int AS sites_with_open_sr,
      ROUND(AVG(EXTRACT(EPOCH FROM (fv.first_visit_date - sr.open_date)) / 3600)::numeric, 2) AS avg_first_visit_time_hours,
      ROUND((AVG(EXTRACT(EPOCH FROM (sr.complete_date - sr.open_date)) / 3600) FILTER (WHERE sr.complete_date IS NOT NULL))::numeric, 2) AS avg_closure_time_hours
    FROM sr
    LEFT JOIN (
      SELECT ticket_id, MIN(visit_date) AS first_visit_date
      FROM service_visits
      WHERE visit_date IS NOT NULL
      GROUP BY ticket_id
    ) fv ON fv.ticket_id = sr.ticket_id
    ${scoped.where}
    GROUP BY COALESCE(NULLIF(TRIM(state), ''), 'Unknown'), COALESCE(NULLIF(TRIM(service_area_name), ''), 'Unmapped')
    ORDER BY open_sr DESC, total_sr DESC
    `,
    [...scoped.values, openStatuses, pendingStatuses, completeStatuses, siteOpenStatuses]
  );
  return result.rows;
}

export async function getOfflineTrend(params = {}) {
  const scope = {
    state: params.state,
    serviceArea: params.serviceArea,
    dateRange: dateRangeFromQuery(params),
    dateColumn: 'snapshot_date'
  };
  const scoped = buildScopeWhere('d', scope, 1);
  const result = await query(
    `
    SELECT
      snapshot_date,
      COUNT(DISTINCT site_id)::int AS offline_sites,
      COUNT(*)::int AS offline_rows
    FROM daily_offline_snapshots d
    ${scoped.where}
    GROUP BY snapshot_date
    ORDER BY snapshot_date
    `,
    scoped.values
  );
  return result.rows;
}

export async function getRepeatFailureTrend(params = {}) {
  const sourceSql = await serviceRequestSourceSql();
  const dateRange = dateRangeFromQuery(params);
  const scoped = buildScopeWhere('sr', { state: params.state, serviceArea: params.serviceArea, dateRange }, 1);
  const result = await query(
    `
    WITH sr AS (${sourceSql}),
    ordered AS (
      SELECT
        sr.*,
        LAG(complete_date) OVER (PARTITION BY site_id ORDER BY open_date NULLS LAST, ticket_id) AS previous_complete_date
      FROM sr
      ${scoped.where}
    ),
    repeat_failures AS (
      SELECT
        open_date::date AS repeat_date,
        site_id,
        ticket_id,
        previous_complete_date,
        open_date,
        EXTRACT(DAY FROM (open_date - previous_complete_date))::int AS repeat_after_days
      FROM ordered
      WHERE previous_complete_date IS NOT NULL
        AND open_date IS NOT NULL
        AND open_date > previous_complete_date
    )
    SELECT
      repeat_date,
      COUNT(*)::int AS repeat_failure,
      COUNT(DISTINCT site_id)::int AS repeat_failure_sites,
      ROUND(AVG(repeat_after_days)::numeric, 1) AS avg_repeat_after_days
    FROM repeat_failures
    GROUP BY repeat_date
    ORDER BY repeat_date
    `,
    scoped.values
  );
  return result.rows;
}

export async function getVisitPerformance(params = {}) {
  const sourceSql = await serviceRequestSourceSql();
  const dateRange = dateRangeFromQuery(params);
  const scoped = buildScopeWhere('sr', { state: params.state, serviceArea: params.serviceArea, dateRange }, 1);
  const result = await query(
    `
    WITH sr AS (${sourceSql}),
    first_visits AS (
      SELECT ticket_id, MIN(visit_date) AS first_visit_date, COUNT(*)::int AS visit_count
      FROM service_visits
      WHERE visit_date IS NOT NULL
      GROUP BY ticket_id
    )
    SELECT
      COALESCE(sr.open_date::date, fv.first_visit_date::date) AS metric_date,
      COUNT(DISTINCT sr.ticket_id)::int AS total_sr,
      COUNT(DISTINCT fv.ticket_id)::int AS sr_with_visit,
      COALESCE(SUM(fv.visit_count), 0)::int AS total_visits,
      ROUND(AVG(EXTRACT(EPOCH FROM (fv.first_visit_date - sr.open_date)) / 3600)::numeric, 2) AS avg_first_visit_time_hours,
      ROUND((AVG(EXTRACT(EPOCH FROM (sr.complete_date - sr.open_date)) / 3600) FILTER (WHERE sr.complete_date IS NOT NULL))::numeric, 2) AS avg_closure_time_hours
    FROM sr
    LEFT JOIN first_visits fv ON fv.ticket_id = sr.ticket_id
    ${scoped.where}
    GROUP BY COALESCE(sr.open_date::date, fv.first_visit_date::date)
    ORDER BY metric_date
    `,
    scoped.values
  );
  return result.rows;
}

export async function getSiteIntelligence(siteId) {
  const cleaned = String(siteId || '').trim();
  if (!cleaned) {
    const error = new Error('siteId is required');
    error.status = 400;
    throw error;
  }

  const sourceSql = await serviceRequestSourceSql();
  const [siteResult, requestResult, visitResult, offlineResult, repeatResult] = await Promise.all([
    query(
      `SELECT *
       FROM customer_site_master
       WHERE oracle_site_no = $1 OR cs_id = $1
       LIMIT 1`,
      [cleaned]
    ),
    query(
      `WITH sr AS (${sourceSql})
       SELECT *
       FROM sr
       WHERE site_id = $1 OR cs_id = $1
       ORDER BY open_date DESC NULLS LAST, last_updated_at DESC NULLS LAST
       LIMIT 250`,
      [cleaned]
    ),
    query(
      `SELECT *
       FROM service_visits
       WHERE site_id = $1
       ORDER BY visit_date DESC NULLS LAST
       LIMIT 250`,
      [cleaned]
    ),
    query(
      `SELECT *
       FROM daily_offline_snapshots
       WHERE site_id = $1 OR cs_id = $1
       ORDER BY snapshot_date DESC
       LIMIT 250`,
      [cleaned]
    ),
    query(
      `WITH sr AS (${sourceSql}),
       ordered AS (
         SELECT *, LAG(complete_date) OVER (PARTITION BY site_id ORDER BY open_date NULLS LAST, ticket_id) AS previous_complete_date
         FROM sr
         WHERE site_id = $1 OR cs_id = $1
       )
       SELECT ticket_id, open_date, previous_complete_date, EXTRACT(DAY FROM (open_date - previous_complete_date))::int AS repeat_after_days
       FROM ordered
       WHERE previous_complete_date IS NOT NULL AND open_date > previous_complete_date
       ORDER BY open_date DESC`,
      [cleaned]
    )
  ]);

  const serviceRequests = requestResult.rows;
  const visits = visitResult.rows;
  const offlineRows = offlineResult.rows;
  const timeline = [
    ...offlineRows.map((row) => ({
      type: 'offline',
      date: row.snapshot_date,
      label: row.offline_status || 'OFFLINE',
      detail: row.issue_type || null
    })),
    ...serviceRequests.map((row) => ({
      type: 'service_request',
      date: row.open_date,
      label: `SR ${row.ticket_id}`,
      detail: row.status || null
    })),
    ...visits.map((row) => ({
      type: 'visit',
      date: row.visit_date,
      label: `Visit ${row.visit_id}`,
      detail: row.engineer_name || row.vendor_name || null
    }))
  ].filter((item) => item.date).sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    site: siteResult.rows[0] || null,
    current_open_sr_count: serviceRequests.filter((row) => siteOpenStatuses.includes(row.status)).length,
    total_sr_till_date: serviceRequests.length,
    total_visits_till_date: visits.length,
    offline_frequency: new Set(offlineRows.map((row) => String(row.snapshot_date))).size,
    offline_dates: [...new Set(offlineRows.map((row) => row.snapshot_date))],
    repeat_failure_count: repeatResult.rows.length,
    repeat_failures: repeatResult.rows,
    service_requests: serviceRequests,
    visits,
    timeline
  };
}

export async function getUploadsHistory() {
  const result = await query(
    `SELECT
      COALESCE(upload_id, id) AS upload_id,
      upload_date,
      uploaded_at,
      source_file_name,
      data_type,
      COALESCE(records_count, record_count) AS records_count,
      processed_count,
      rejected_count,
      status,
      error_message
     FROM upload_history
     ORDER BY uploaded_at DESC
     LIMIT 200`
  );
  return result.rows;
}
