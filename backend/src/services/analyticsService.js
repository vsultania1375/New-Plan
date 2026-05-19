import { query } from '../db/pool.js';

const activeStatuses = ['OPEN', 'PENDING', 'COMPLETED', 'SENTBACK', 'SENDBACK'];

const stateKeyAliases = {
  ANDAMANANDNICOBAR: 'ANDAMANANDNICOBARISLANDS',
  ANDAMANANDNICOBARISLAND: 'ANDAMANANDNICOBARISLANDS',
  CHHATISGARH: 'CHHATTISGARH',
  DELHI: 'NCTOFDELHI',
  NATIONALCAPITALTERRITORYOFDELHI: 'NCTOFDELHI',
  ORISSA: 'ODISHA',
  PONDICHERRY: 'PUDUCHERRY',
  JAMMUKASHMIR: 'JAMMUANDKASHMIR',
  UTTARPARDESH: 'UTTARPRADESH',
  DADRAANDNAGRAHAVELIANDDAMANANDDIU: 'DADRAANDNAGARHAVELIANDDAMANANDDIU',
  DADRAANDNAGRAHAVELI: 'DADRAANDNAGARHAVELIANDDAMANANDDIU',
  DAMANANDDIU: 'DADRAANDNAGARHAVELIANDDAMANANDDIU'
};

const stateDisplayNames = {
  NCTOFDELHI: 'Delhi',
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
