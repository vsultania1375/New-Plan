import path from 'node:path';
import { withTransaction } from '../db/pool.js';
import { readRows } from '../utils/workbook.js';
import {
  dateOnly,
  decimal,
  deriveAttendanceStatus,
  deriveBankName,
  excelDate,
  extractIndianBankAtmId,
  extractOfflineDataDate,
  integer,
  parseAssignedTo,
  text,
  upper
} from '../utils/normalize.js';

function value(row, key) {
  return row[key] ?? null;
}

function normalizedHeaderKey(key) {
  return String(key || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function flexibleValue(row, keys) {
  const lookup = new Map(Object.keys(row || {}).map((key) => [normalizedHeaderKey(key), row[key]]));
  for (const key of keys) {
    const normalized = normalizedHeaderKey(key);
    if (lookup.has(normalized)) return lookup.get(normalized);
  }
  return null;
}

function normalizedTextKey(valueToNormalize) {
  return (text(valueToNormalize) || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

function normalizePincode(valueToNormalize) {
  if (typeof valueToNormalize === 'number' && Number.isFinite(valueToNormalize)) {
    return String(Math.trunc(valueToNormalize));
  }
  const raw = text(valueToNormalize);
  return raw ? raw.replace(/\D/g, '') : null;
}

function normalizeActiveStatus(valueToNormalize) {
  return (text(valueToNormalize) || '').toUpperCase();
}

function isAcceptedMappingStatus(valueToCheck) {
  return ['YES', 'NO', 'ACTIVE', 'INACTIVE', 'TRUE', 'FALSE'].includes(normalizeActiveStatus(valueToCheck));
}

function isActiveMappingStatus(valueToCheck) {
  return ['YES', 'ACTIVE', 'TRUE'].includes(normalizeActiveStatus(valueToCheck));
}

function serviceAreaPincodeField(row, field) {
  const aliases = {
    service_area_code: ['service_area_code', 'Service Area Code', 'Sercive Area Code'],
    service_area_name: ['service_area_name', 'Service Area Name', 'Service Area'],
    state: ['state', 'State'],
    city: ['city', 'City', 'Top City'],
    pincode: ['pincode', 'Pincode', 'Pin Code'],
    active_status: ['active_status', 'Active Status', 'Status'],
    effective_from: ['effective_from', 'Effective From'],
    effective_to: ['effective_to', 'Effective To']
  };
  return flexibleValue(row, aliases[field] || [field]);
}

function formatVisitDateId(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 'unknown';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function cleanVisitIdPart(valueToClean) {
  return (text(valueToClean) || 'NA').replace(/[^A-Za-z0-9]+/g, '').toUpperCase() || 'NA';
}

function makeVisitId(ticketId, employeeId, visitNumber, visitDate) {
  return `VISIT_${cleanVisitIdPart(ticketId)}_${cleanVisitIdPart(employeeId)}_${cleanVisitIdPart(visitNumber)}_${formatVisitDateId(visitDate)}`;
}

async function bulkInsert(client, sql, rows) {
  for (const row of rows) {
    await client.query(sql, row);
  }
  return rows.length;
}

export async function ingestOffline(filePath, sourceFile = path.basename(filePath)) {
  const rows = readRows(filePath, 'B2B', { headerRow: 2 }).filter((row) => text(row.cs_no));
  const dataDate = extractOfflineDataDate(sourceFile);
  const mapped = rows.map((row) => {
    const bankName = deriveBankName(value(row, 'B2B Code'), value(row, 'site_name'));
    return [
      dataDate,
      excelDate(value(row, 'alarm_date')),
      text(value(row, 'B2B Code')),
      bankName,
      text(value(row, 'descr')),
      text(value(row, 'site_name')),
      text(value(row, 'cs_no')),
      integer(value(row, 'No. Of Days')),
      text(value(row, 'Bucket')),
      text(value(row, 'Branch Code')),
      extractIndianBankAtmId(value(row, 'Branch Code'), bankName),
      text(value(row, 'State')),
      excelDate(value(row, 'Offline Date & Time')),
      text(value(row, 'Zone')),
      upper(value(row, 'Segment')),
      sourceFile
    ];
  });

  return withTransaction(async (client) => {
    let insertedRows = 0;
    let skippedDuplicates = 0;
    for (const row of mapped) {
      const duplicate = row[12]
        ? await client.query(
          `SELECT 1 FROM offline_data_master
           WHERE data_date = $1 AND cs_id = $2 AND offline_date_time = $3
           LIMIT 1`,
          [row[0], row[6], row[12]]
        )
        : await client.query(
          `SELECT 1 FROM offline_data_master
           WHERE data_date = $1 AND cs_id = $2 AND aging_days IS NOT DISTINCT FROM $3
           LIMIT 1`,
          [row[0], row[6], row[7]]
        );
      if (duplicate.rowCount) {
        skippedDuplicates += 1;
        continue;
      }
      await client.query(
        `INSERT INTO offline_data_master
         (data_date, alarm_date, b2b_code, bank_name_standard, descr, site_name, cs_id, aging_days, bucket, branch_code, atm_id_clean, state, offline_date_time, zone, segment, source_file)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        row
      );
      insertedRows += 1;
    }
    await client.query(
      `INSERT INTO daily_offline_snapshots
       (snapshot_date, site_id, cs_id, atm_id, oracle_site_no, site_name, state, service_area_name, pincode, issue_type, offline_status, source_file_name)
       SELECT
         o.data_date,
         COALESCE(NULLIF(s.oracle_site_no, ''), o.cs_id),
         o.cs_id,
         COALESCE(NULLIF(s.atm_id, ''), NULLIF(o.atm_id_clean, '')),
         s.oracle_site_no,
         COALESCE(NULLIF(s.oracle_site_name, ''), o.site_name),
         COALESCE(NULLIF(s.state, ''), o.state),
         s.service_area_name,
         s.pin_code,
         o.descr,
         'OFFLINE',
         o.source_file
       FROM offline_data_master o
       LEFT JOIN customer_site_master s ON s.cs_id = o.cs_id
       WHERE o.data_date = $1
         AND o.source_file = $2
         AND NOT EXISTS (
           SELECT 1
           FROM daily_offline_snapshots d
           WHERE d.snapshot_date = o.data_date
             AND d.cs_id = o.cs_id
             AND COALESCE(d.source_file_name, '') = COALESCE(o.source_file, '')
         )`,
      [dataDate, sourceFile]
    );
    return {
      detected_file_type: 'offline',
      target_table: 'offline_data_master',
      sheet_used: 'B2B',
      total_rows: mapped.length,
      inserted_rows: insertedRows,
      updated_rows: 0,
      skipped_duplicates: skippedDuplicates,
      failed_rows: 0,
      warnings: [],
      data_date: dataDate
    };
  });
}

export async function ingestCustomerSites(filePath, sourceFile = path.basename(filePath)) {
  const rows = readRows(filePath, 'Sheet1').filter((row) => text(value(row, 'Oracle Site Number')));
  const uploadDate = new Date().toISOString().slice(0, 10);
  const mapped = rows.map((row) => [
    text(value(row, 'CS ID')),
    text(value(row, 'Oracle Site Number')),
    text(value(row, 'Oracle Site Name')),
    text(value(row, 'Oracle Account No')),
    text(value(row, 'Oracle Customer Name')),
    text(value(row, 'ATM ID')),
    text(value(row, 'Service Area')),
    text(value(row, 'City')),
    text(value(row, 'State')),
    text(value(row, 'State Code')),
    text(value(row, 'Pin Code')),
    text(value(row, 'Address Line 1')),
    text(value(row, 'Address Line 2')),
    text(value(row, 'Address Line 3')),
    decimal(value(row, 'Latitude')),
    decimal(value(row, 'Longitude')),
    text(value(row, 'Active Status')),
    JSON.stringify(row)
  ]);

  return withTransaction(async (client) => {
    const inserted = await bulkInsert(
      client,
      `INSERT INTO customer_site_master
       (cs_id, oracle_site_no, oracle_site_name, oracle_account_no, oracle_customer_name, atm_id, service_area_name, city, state, state_code, pin_code, address_line_1, address_line_2, address_line_3, latitude, longitude, active_status, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb)
       ON CONFLICT (oracle_site_no) DO UPDATE SET
       cs_id = EXCLUDED.cs_id, oracle_site_name = EXCLUDED.oracle_site_name, oracle_account_no = EXCLUDED.oracle_account_no,
       oracle_customer_name = EXCLUDED.oracle_customer_name, atm_id = EXCLUDED.atm_id, service_area_name = EXCLUDED.service_area_name,
       city = EXCLUDED.city, state = EXCLUDED.state, state_code = EXCLUDED.state_code, pin_code = EXCLUDED.pin_code,
       address_line_1 = EXCLUDED.address_line_1, address_line_2 = EXCLUDED.address_line_2, address_line_3 = EXCLUDED.address_line_3,
       latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, active_status = EXCLUDED.active_status, raw = EXCLUDED.raw,
       updated_at = NOW()`,
      mapped
    );
    await bulkInsert(
      client,
      `INSERT INTO service_requests
       (ticket_id, site_id, cs_id, atm_id, state, service_area_name, issue_type, priority, status, open_date, pending_date, complete_date, assigned_to_type, engineer_name, vendor_name, state_manager, sla_due_date, last_remark, last_updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())
       ON CONFLICT (ticket_id) DO UPDATE SET
       site_id = EXCLUDED.site_id,
       cs_id = EXCLUDED.cs_id,
       atm_id = EXCLUDED.atm_id,
       state = EXCLUDED.state,
       service_area_name = EXCLUDED.service_area_name,
       issue_type = EXCLUDED.issue_type,
       priority = EXCLUDED.priority,
       status = EXCLUDED.status,
       open_date = EXCLUDED.open_date,
       pending_date = EXCLUDED.pending_date,
       complete_date = EXCLUDED.complete_date,
       assigned_to_type = EXCLUDED.assigned_to_type,
       engineer_name = EXCLUDED.engineer_name,
       vendor_name = EXCLUDED.vendor_name,
       state_manager = EXCLUDED.state_manager,
       sla_due_date = EXCLUDED.sla_due_date,
       last_remark = EXCLUDED.last_remark,
       last_updated_at = NOW()`,
      mapped.map((row) => [
        row[0],
        row[2] || row[3],
        row[3],
        row[5],
        row[7],
        row[6],
        row[12] || row[13],
        row[10] && row[10] > 7 ? 'HIGH' : null,
        row[8],
        row[14],
        ['PENDING', 'SENTBACK', 'SENDBACK'].includes(row[8]) ? row[23] || row[14] : null,
        row[24],
        row[16],
        String(row[16] || '').toUpperCase() === 'ENGINEER' ? row[18] : null,
        String(row[16] || '').toUpperCase() === 'VENDOR' ? row[17] : null,
        row[20],
        row[15],
        row[9]
      ])
    );
    await bulkInsert(
      client,
      `INSERT INTO site_master_snapshot
       (upload_date, source_file_name, cs_id, oracle_site_no, oracle_site_name, atm_id, service_area_name, city, state, state_code, pin_code, latitude, longitude, active_status, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb)
       ON CONFLICT (upload_date, oracle_site_no) DO UPDATE SET
       source_file_name = EXCLUDED.source_file_name,
       cs_id = EXCLUDED.cs_id,
       oracle_site_name = EXCLUDED.oracle_site_name,
       atm_id = EXCLUDED.atm_id,
       service_area_name = EXCLUDED.service_area_name,
       city = EXCLUDED.city,
       state = EXCLUDED.state,
       state_code = EXCLUDED.state_code,
       pin_code = EXCLUDED.pin_code,
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       active_status = EXCLUDED.active_status,
       raw = EXCLUDED.raw,
       uploaded_at = NOW()`,
      mapped.map((row) => [
        uploadDate,
        sourceFile,
        row[0],
        row[1],
        row[2],
        row[5],
        row[6],
        row[7],
        row[8],
        row[9],
        row[10],
        row[14],
        row[15],
        row[16],
        row[17]
      ])
    );
    return {
      detected_file_type: 'sites',
      target_table: 'customer_site_master',
      sheet_used: 'Sheet1',
      total_rows: mapped.length,
      inserted_rows: 0,
      updated_rows: inserted,
      skipped_duplicates: 0,
      failed_rows: 0,
      warnings: [],
      data_date: uploadDate
    };
  });
}

export async function ingestTickets(filePath, sourceFile = path.basename(filePath)) {
  const rows = readRows(filePath, 'Sheet1').filter((row) => text(value(row, 'Ticket ID')));
  const snapshotDate = new Date().toISOString().slice(0, 10);
  const mapped = rows.map((row) => {
    const assigned = parseAssignedTo(value(row, 'Ticket Assigned To'));
    return [
      text(value(row, 'Ticket ID')),
      text(value(row, 'Oracle Site Name')),
      text(value(row, 'Oracle Site No')),
      text(value(row, 'CS ID')),
      text(value(row, 'Primary Customer Name')),
      text(value(row, 'ATM ID')),
      text(value(row, 'Service Area')),
      text(value(row, 'State Name')),
      upper(value(row, 'Ticket Status')),
      text(value(row, 'Ticket Status Reason')),
      integer(value(row, 'Aging Days')),
      integer(value(row, 'Total Visits')),
      text(value(row, 'Ticket Type')),
      text(value(row, 'Ticket Sub-Type')),
      excelDate(value(row, 'Create Date')),
      excelDate(value(row, 'Planned Date')),
      text(value(row, 'Ticket Assigned Type')),
      text(value(row, 'Ticket Assigned To')),
      assigned.assignedEmployeeName,
      assigned.assignedEmployeeId,
      text(value(row, 'Current Approver Name')),
      excelDate(value(row, 'Last Visit In Date-Time')),
      excelDate(value(row, 'Last Visit Out Date-Time')),
      excelDate(value(row, 'Last Submission Date Time')),
      excelDate(value(row, 'Ticket Closed Date & Time')),
      text(value(row, 'Cancelled By Name')),
      excelDate(value(row, 'Cancelled Date-Time')),
      JSON.stringify(row)
    ];
  });

  return withTransaction(async (client) => {
    await client.query('TRUNCATE TABLE view_ticket');
    const inserted = await bulkInsert(
      client,
      `INSERT INTO view_ticket
       (ticket_id, oracle_site_name, oracle_site_no, cs_id, primary_customer_name, atm_id, service_area_name, state, ticket_status, ticket_status_reason, aging_days, total_visits, ticket_type, ticket_sub_type, create_date, planned_date, ticket_assigned_type, ticket_assigned_to, assigned_employee_name, assigned_employee_id, current_approver_name, last_visit_in_datetime, last_visit_out_datetime, last_submission_datetime, ticket_closed_datetime, cancelled_by_name, cancelled_datetime, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28::jsonb)`,
      mapped
    );
    await bulkInsert(
      client,
      `INSERT INTO service_request_snapshot
       (snapshot_date, source_file_name, ticket_id, oracle_site_name, oracle_site_no, cs_id, primary_customer_name, atm_id, service_area_name, state, ticket_status, ticket_status_reason, aging_days, total_visits, ticket_type, ticket_sub_type, create_date, planned_date, ticket_assigned_type, ticket_assigned_to, assigned_employee_name, assigned_employee_id, current_approver_name, last_visit_in_datetime, last_visit_out_datetime, last_submission_datetime, ticket_closed_datetime, cancelled_by_name, cancelled_datetime, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30::jsonb)
       ON CONFLICT (snapshot_date, ticket_id) DO UPDATE SET
       source_file_name = EXCLUDED.source_file_name,
       oracle_site_name = EXCLUDED.oracle_site_name,
       oracle_site_no = EXCLUDED.oracle_site_no,
       cs_id = EXCLUDED.cs_id,
       primary_customer_name = EXCLUDED.primary_customer_name,
       atm_id = EXCLUDED.atm_id,
       service_area_name = EXCLUDED.service_area_name,
       state = EXCLUDED.state,
       ticket_status = EXCLUDED.ticket_status,
       ticket_status_reason = EXCLUDED.ticket_status_reason,
       aging_days = EXCLUDED.aging_days,
       total_visits = EXCLUDED.total_visits,
       ticket_type = EXCLUDED.ticket_type,
       ticket_sub_type = EXCLUDED.ticket_sub_type,
       create_date = EXCLUDED.create_date,
       planned_date = EXCLUDED.planned_date,
       ticket_assigned_type = EXCLUDED.ticket_assigned_type,
       ticket_assigned_to = EXCLUDED.ticket_assigned_to,
       assigned_employee_name = EXCLUDED.assigned_employee_name,
       assigned_employee_id = EXCLUDED.assigned_employee_id,
       current_approver_name = EXCLUDED.current_approver_name,
       last_visit_in_datetime = EXCLUDED.last_visit_in_datetime,
       last_visit_out_datetime = EXCLUDED.last_visit_out_datetime,
       last_submission_datetime = EXCLUDED.last_submission_datetime,
       ticket_closed_datetime = EXCLUDED.ticket_closed_datetime,
       cancelled_by_name = EXCLUDED.cancelled_by_name,
       cancelled_datetime = EXCLUDED.cancelled_datetime,
       raw = EXCLUDED.raw,
       uploaded_at = NOW()`,
      mapped.map((row) => [snapshotDate, sourceFile, ...row])
    );
    return {
      detected_file_type: 'tickets',
      target_table: 'view_ticket',
      sheet_used: 'Sheet1',
      total_rows: mapped.length,
      inserted_rows: inserted,
      updated_rows: 0,
      skipped_duplicates: 0,
      failed_rows: 0,
      warnings: [],
      mode: 'truncate_insert',
      snapshot_table: 'service_request_snapshot',
      data_date: snapshotDate
    };
  });
}

export async function ingestEngineers(filePath) {
  const rows = readRows(filePath, 'Sheet1').filter((row) => text(value(row, 'Employee Code')));
  const mapped = rows.map((row) => [
    text(value(row, 'Employee Code')),
    text(value(row, 'Employee Name')),
    text(value(row, 'Company Name')),
    text(value(row, 'Location')),
    text(value(row, 'Department')),
    text(value(row, 'Designation')),
    text(value(row, 'Region')),
    text(value(row, 'State')),
    text(value(row, 'Service State')),
    text(value(row, 'City')),
    text(value(row, 'Address')),
    text(value(row, 'Pin Code')),
    dateOnly(value(row, 'Date Of Joining')),
    text(value(row, 'Email Id')),
    text(value(row, 'Phone No')),
    text(value(row, 'Reporting Manager 1')),
    text(value(row, 'Reporting Manager 2')),
    text(value(row, 'Reporting Manager 3')),
    text(value(row, 'Reporting Manager 4')),
    text(value(row, 'Reporting Manager 5')),
    text(value(row, 'Substitute Engineer')),
    upper(value(row, 'Active Status')),
    decimal(value(row, 'Base Latitude')),
    decimal(value(row, 'Base Longitude')),
    text(value(row, 'Supplier Site')),
    JSON.stringify(row)
  ]);

  return withTransaction(async (client) => {
    const inserted = await bulkInsert(
      client,
      `INSERT INTO engineer_master
       (employee_id, employee_name, company_name, location, department, designation, region, state, service_state, city, address, pin_code, date_of_joining, email_id, phone_no, reporting_manager_1, reporting_manager_2, reporting_manager_3, reporting_manager_4, reporting_manager_5, substitute_engineer, active_status, base_latitude, base_longitude, supplier_site, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26::jsonb)
       ON CONFLICT (employee_id) DO UPDATE SET
       employee_name = EXCLUDED.employee_name, company_name = EXCLUDED.company_name, location = EXCLUDED.location,
       department = EXCLUDED.department, designation = EXCLUDED.designation, region = EXCLUDED.region, state = EXCLUDED.state,
       service_state = EXCLUDED.service_state, city = EXCLUDED.city, address = EXCLUDED.address, pin_code = EXCLUDED.pin_code,
       date_of_joining = EXCLUDED.date_of_joining, email_id = EXCLUDED.email_id, phone_no = EXCLUDED.phone_no,
       reporting_manager_1 = EXCLUDED.reporting_manager_1, reporting_manager_2 = EXCLUDED.reporting_manager_2,
       reporting_manager_3 = EXCLUDED.reporting_manager_3, reporting_manager_4 = EXCLUDED.reporting_manager_4,
       reporting_manager_5 = EXCLUDED.reporting_manager_5, substitute_engineer = EXCLUDED.substitute_engineer,
       active_status = EXCLUDED.active_status, base_latitude = EXCLUDED.base_latitude, base_longitude = EXCLUDED.base_longitude,
       supplier_site = EXCLUDED.supplier_site, raw = EXCLUDED.raw, updated_at = NOW()`,
      mapped
    );
    return {
      detected_file_type: 'engineers',
      target_table: 'engineer_master',
      sheet_used: 'Sheet1',
      total_rows: mapped.length,
      inserted_rows: 0,
      updated_rows: inserted,
      skipped_duplicates: 0,
      failed_rows: 0,
      warnings: []
    };
  });
}

export async function ingestServiceAreas(filePath) {
  const rows = readRows(filePath, 'Sheet1').filter((row) => text(value(row, 'Service Area Code')));
  const mapped = rows.map((row) => [
    text(value(row, 'Service Area Code')),
    text(value(row, 'Service Area Name')),
    text(value(row, 'Service Area Group')),
    upper(value(row, 'Active Status'))
  ]);

  return withTransaction(async (client) => {
    const inserted = await bulkInsert(
      client,
      `INSERT INTO service_area_master (service_area_code, service_area_name, service_area_group, active_status)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (service_area_code) DO UPDATE SET
       service_area_name = EXCLUDED.service_area_name, service_area_group = EXCLUDED.service_area_group,
       active_status = EXCLUDED.active_status, updated_at = NOW()`,
      mapped
    );
    return {
      detected_file_type: 'service_areas',
      target_table: 'service_area_master',
      sheet_used: 'Sheet1',
      total_rows: mapped.length,
      inserted_rows: 0,
      updated_rows: inserted,
      skipped_duplicates: 0,
      failed_rows: 0,
      warnings: []
    };
  });
}

export async function ingestStateHeadMapping(filePath) {
  const rows = readRows(filePath, 'Sheet1').filter((row) => text(flexibleValue(row, ['state'])));
  const mapped = rows.map((row) => [
    text(flexibleValue(row, ['state'])),
    text(flexibleValue(row, ['state_head_name', 'State Head Name'])),
    text(flexibleValue(row, ['state_head_employee_id', 'State Head Employee ID'])),
    text(flexibleValue(row, ['phone', 'Phone'])),
    text(flexibleValue(row, ['email', 'Email'])),
    text(flexibleValue(row, ['active_status', 'Active Status'])),
    text(flexibleValue(row, ['region', 'Region'])),
    text(flexibleValue(row, ['backup_state_head_name', 'Backup State Head Name'])),
    text(flexibleValue(row, ['backup_state_head_employee_id', 'Backup State Head Employee ID'])),
    dateOnly(flexibleValue(row, ['effective_from', 'Effective From'])),
    dateOnly(flexibleValue(row, ['effective_to', 'Effective To']))
  ]);

  return withTransaction(async (client) => {
    let insertedRows = 0;
    let updatedRows = 0;
    let failedRows = 0;
    const warnings = [];

    for (const row of mapped) {
      if (!row[0] || !row[1] || !row[2] || !row[5]) {
        failedRows += 1;
        continue;
      }
      const result = await client.query(
        `INSERT INTO state_head_mapping
         (state, state_head_name, state_head_employee_id, phone, email, active_status, region, backup_state_head_name, backup_state_head_employee_id, effective_from, effective_to)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (state_key) DO UPDATE SET
           state = EXCLUDED.state,
           state_head_name = EXCLUDED.state_head_name,
           state_head_employee_id = EXCLUDED.state_head_employee_id,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           active_status = EXCLUDED.active_status,
           region = EXCLUDED.region,
           backup_state_head_name = EXCLUDED.backup_state_head_name,
           backup_state_head_employee_id = EXCLUDED.backup_state_head_employee_id,
           effective_from = EXCLUDED.effective_from,
           effective_to = EXCLUDED.effective_to,
           updated_at = NOW()
         RETURNING (xmax = 0) AS inserted`,
        row
      );
      if (result.rows[0]?.inserted) insertedRows += 1;
      else updatedRows += 1;
    }

    if (failedRows) warnings.push(`${failedRows} rows skipped because required ownership fields were missing.`);
    return {
      detected_file_type: 'state_head_mapping',
      target_table: 'state_head_mapping',
      sheet_used: 'Sheet1',
      total_rows: mapped.length,
      inserted_rows: insertedRows,
      updated_rows: updatedRows,
      skipped_duplicates: 0,
      failed_rows: failedRows,
      warnings
    };
  });
}

export async function ingestServiceAreaEngineerMapping(filePath) {
  const rows = readRows(filePath, 'Sheet1').filter((row) => text(flexibleValue(row, ['service_area_name', 'Service Area Name'])));
  const mapped = rows.map((row) => [
    text(flexibleValue(row, ['service_area_code', 'Service Area Code'])),
    text(flexibleValue(row, ['service_area_name', 'Service Area Name'])),
    text(flexibleValue(row, ['state', 'State'])),
    text(flexibleValue(row, ['engineer_id', 'Engineer ID'])),
    text(flexibleValue(row, ['engineer_name', 'Engineer Name'])),
    dateOnly(flexibleValue(row, ['assignment_start_date', 'Assignment Start Date'])),
    text(flexibleValue(row, ['active_status', 'Active Status'])),
    text(flexibleValue(row, ['backup_engineer_id', 'Backup Engineer ID'])),
    text(flexibleValue(row, ['backup_engineer_name', 'Backup Engineer Name'])),
    text(flexibleValue(row, ['manager_employee_id', 'Manager Employee ID'])),
    text(flexibleValue(row, ['manager_name', 'Manager Name'])),
    dateOnly(flexibleValue(row, ['effective_from', 'Effective From'])),
    dateOnly(flexibleValue(row, ['effective_to', 'Effective To']))
  ]);

  return withTransaction(async (client) => {
    let insertedRows = 0;
    let updatedRows = 0;
    let failedRows = 0;
    const warnings = [];

    for (const row of mapped) {
      if (!row[1] || !row[2] || !row[3] || !row[4] || !row[6]) {
        failedRows += 1;
        continue;
      }

      const sql = row[0]
        ? `INSERT INTO service_area_engineer_mapping
           (service_area_code, service_area_name, state, engineer_id, engineer_name, assignment_start_date, active_status, backup_engineer_id, backup_engineer_name, manager_employee_id, manager_name, effective_from, effective_to)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (service_area_code) WHERE service_area_code IS NOT NULL DO UPDATE SET
             service_area_name = EXCLUDED.service_area_name,
             state = EXCLUDED.state,
             engineer_id = EXCLUDED.engineer_id,
             engineer_name = EXCLUDED.engineer_name,
             assignment_start_date = EXCLUDED.assignment_start_date,
             active_status = EXCLUDED.active_status,
             backup_engineer_id = EXCLUDED.backup_engineer_id,
             backup_engineer_name = EXCLUDED.backup_engineer_name,
             manager_employee_id = EXCLUDED.manager_employee_id,
             manager_name = EXCLUDED.manager_name,
             effective_from = EXCLUDED.effective_from,
             effective_to = EXCLUDED.effective_to,
             updated_at = NOW()
           RETURNING (xmax = 0) AS inserted`
        : `INSERT INTO service_area_engineer_mapping
           (service_area_code, service_area_name, state, engineer_id, engineer_name, assignment_start_date, active_status, backup_engineer_id, backup_engineer_name, manager_employee_id, manager_name, effective_from, effective_to)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (service_area_key, state_key) WHERE service_area_code IS NULL DO UPDATE SET
             service_area_name = EXCLUDED.service_area_name,
             state = EXCLUDED.state,
             engineer_id = EXCLUDED.engineer_id,
             engineer_name = EXCLUDED.engineer_name,
             assignment_start_date = EXCLUDED.assignment_start_date,
             active_status = EXCLUDED.active_status,
             backup_engineer_id = EXCLUDED.backup_engineer_id,
             backup_engineer_name = EXCLUDED.backup_engineer_name,
             manager_employee_id = EXCLUDED.manager_employee_id,
             manager_name = EXCLUDED.manager_name,
             effective_from = EXCLUDED.effective_from,
             effective_to = EXCLUDED.effective_to,
             updated_at = NOW()
           RETURNING (xmax = 0) AS inserted`;

      const result = await client.query(sql, row);
      if (result.rows[0]?.inserted) insertedRows += 1;
      else updatedRows += 1;
    }

    if (failedRows) warnings.push(`${failedRows} rows skipped because required ownership fields were missing.`);
    return {
      detected_file_type: 'service_area_engineer_mapping',
      target_table: 'service_area_engineer_mapping',
      sheet_used: 'Sheet1',
      total_rows: mapped.length,
      inserted_rows: insertedRows,
      updated_rows: updatedRows,
      skipped_duplicates: 0,
      failed_rows: failedRows,
      warnings
    };
  });
}

export function analyzeServiceAreaPincodeMappingRows(rows = []) {
  const stats = {
    total_rows: rows.length,
    valid_rows: 0,
    failed_rows: 0,
    rows_missing_service_area_name: 0,
    rows_missing_state: 0,
    rows_state_zero: 0,
    rows_service_area_code_zero: 0,
    invalid_pincodes: 0,
    invalid_active_status: 0,
    duplicate_pincodes_same_service_area: 0,
    conflicting_pincodes: 0,
    distinct_service_areas: 0,
    distinct_states: 0,
    warnings: []
  };
  const seenByPincode = new Map();
  const serviceAreas = new Set();
  const states = new Set();
  const validRows = [];

  for (const row of rows) {
    const serviceAreaCodeRaw = text(serviceAreaPincodeField(row, 'service_area_code'));
    const serviceAreaCode = serviceAreaCodeRaw === '0' ? null : serviceAreaCodeRaw;
    const serviceAreaName = text(serviceAreaPincodeField(row, 'service_area_name'));
    const state = text(serviceAreaPincodeField(row, 'state'));
    const city = text(serviceAreaPincodeField(row, 'city'));
    const pincode = normalizePincode(serviceAreaPincodeField(row, 'pincode'));
    const activeStatus = text(serviceAreaPincodeField(row, 'active_status'));
    const effectiveFrom = dateOnly(serviceAreaPincodeField(row, 'effective_from'));
    const effectiveTo = dateOnly(serviceAreaPincodeField(row, 'effective_to'));
    const serviceAreaKey = normalizedTextKey(serviceAreaName);
    const stateKey = normalizedTextKey(state);
    let rowFailed = false;

    if (!serviceAreaName) {
      stats.rows_missing_service_area_name += 1;
      rowFailed = true;
    }
    if (!state) {
      stats.rows_missing_state += 1;
      rowFailed = true;
    }
    if (state === '0') {
      stats.rows_state_zero += 1;
      rowFailed = true;
    }
    if (serviceAreaCodeRaw === '0') {
      stats.rows_service_area_code_zero += 1;
    }
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      stats.invalid_pincodes += 1;
      rowFailed = true;
    }
    if (!isAcceptedMappingStatus(activeStatus)) {
      stats.invalid_active_status += 1;
      rowFailed = true;
    }

    if (serviceAreaKey) serviceAreas.add(serviceAreaKey);
    if (stateKey && state !== '0') states.add(stateKey);

    if (!rowFailed) {
      const currentKey = `${serviceAreaKey}|${stateKey}`;
      const existing = seenByPincode.get(pincode);
      if (existing) {
        if (existing.areaKey === currentKey) {
          stats.duplicate_pincodes_same_service_area += 1;
          continue;
        }
        stats.conflicting_pincodes += 1;
        stats.failed_rows += 1;
        continue;
      }
      seenByPincode.set(pincode, { areaKey: currentKey, serviceAreaName, state });
      validRows.push({
        service_area_code: serviceAreaCode,
        service_area_name: serviceAreaName,
        service_area_key: serviceAreaKey,
        state,
        state_key: stateKey,
        city,
        pincode,
        active_status: activeStatus,
        effective_from: effectiveFrom,
        effective_to: effectiveTo
      });
      continue;
    }

    stats.failed_rows += 1;
  }

  stats.valid_rows = validRows.length;
  stats.distinct_service_areas = serviceAreas.size;
  stats.distinct_states = states.size;
  if (stats.rows_service_area_code_zero) stats.warnings.push(`${stats.rows_service_area_code_zero} rows have service_area_code = 0; code will be stored blank for those imported rows.`);
  if (stats.invalid_pincodes) stats.warnings.push(`${stats.invalid_pincodes} rows have invalid pincodes.`);
  if (stats.invalid_active_status) stats.warnings.push(`${stats.invalid_active_status} rows have unsupported active_status values.`);
  if (stats.duplicate_pincodes_same_service_area) stats.warnings.push(`${stats.duplicate_pincodes_same_service_area} duplicate pincode rows map to the same Service Area and will be skipped.`);
  if (stats.conflicting_pincodes) stats.warnings.push(`${stats.conflicting_pincodes} pincodes map to multiple Service Areas and will not be imported.`);

  return { stats, validRows };
}

export async function ingestServiceAreaPincodeMapping(filePath) {
  const rows = readRows(filePath, 'Sheet1').filter((row) => Object.values(row || {}).some((valueToCheck) => text(valueToCheck)));
  const { stats, validRows } = analyzeServiceAreaPincodeMappingRows(rows);

  return withTransaction(async (client) => {
    let insertedRows = 0;
    let updatedRows = 0;
    let skippedDuplicates = stats.duplicate_pincodes_same_service_area;
    let failedRows = stats.failed_rows;
    const warnings = [...stats.warnings];

    for (const row of validRows) {
      if (isActiveMappingStatus(row.active_status)) {
        const existing = await client.query(
          `SELECT id, service_area_name, state, service_area_key, state_key
           FROM service_area_pincode_mapping
           WHERE pincode = $1 AND UPPER(TRIM(active_status)) IN ('YES', 'ACTIVE', 'TRUE')
           LIMIT 1`,
          [row.pincode]
        );
        if (existing.rowCount) {
          const current = existing.rows[0];
          if (current.service_area_key !== row.service_area_key || current.state_key !== row.state_key) {
            failedRows += 1;
            warnings.push(`Pincode ${row.pincode} already has active mapping to ${current.service_area_name}, ${current.state}; conflicting row skipped.`);
            continue;
          }
          await client.query(
            `UPDATE service_area_pincode_mapping
             SET service_area_code = $2, service_area_name = $3, state = $4, city = $5,
                 active_status = $6, effective_from = $7, effective_to = $8, updated_at = NOW()
             WHERE id = $1`,
            [current.id, row.service_area_code, row.service_area_name, row.state, row.city, row.active_status, row.effective_from, row.effective_to]
          );
          updatedRows += 1;
          continue;
        }
      } else {
        const existingInactive = await client.query(
          `SELECT id FROM service_area_pincode_mapping
           WHERE pincode = $1
             AND service_area_key = $2
             AND state_key = $3
             AND UPPER(TRIM(COALESCE(active_status, ''))) = $4
           LIMIT 1`,
          [row.pincode, row.service_area_key, row.state_key, normalizeActiveStatus(row.active_status)]
        );
        if (existingInactive.rowCount) {
          await client.query(
            `UPDATE service_area_pincode_mapping
             SET service_area_code = $2, service_area_name = $3, state = $4, city = $5,
                 active_status = $6, effective_from = $7, effective_to = $8, updated_at = NOW()
             WHERE id = $1`,
            [existingInactive.rows[0].id, row.service_area_code, row.service_area_name, row.state, row.city, row.active_status, row.effective_from, row.effective_to]
          );
          updatedRows += 1;
          continue;
        }
      }

      const result = await client.query(
        `INSERT INTO service_area_pincode_mapping
         (service_area_code, service_area_name, state, city, pincode, active_status, effective_from, effective_to)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id`,
        [row.service_area_code, row.service_area_name, row.state, row.city, row.pincode, row.active_status, row.effective_from, row.effective_to]
      );
      if (result.rowCount) insertedRows += 1;
    }

    return {
      detected_file_type: 'service_area_pincode_mapping',
      target_table: 'service_area_pincode_mapping',
      sheet_used: 'Sheet1',
      total_rows: stats.total_rows,
      valid_rows: stats.valid_rows,
      inserted_rows: insertedRows,
      updated_rows: updatedRows,
      skipped_duplicates: skippedDuplicates,
      failed_rows: failedRows,
      rows_missing_service_area_name: stats.rows_missing_service_area_name,
      rows_missing_state: stats.rows_missing_state,
      rows_state_zero: stats.rows_state_zero,
      rows_service_area_code_zero: stats.rows_service_area_code_zero,
      invalid_pincodes: stats.invalid_pincodes,
      invalid_active_status: stats.invalid_active_status,
      duplicate_pincodes_same_service_area: stats.duplicate_pincodes_same_service_area,
      conflicting_pincodes: stats.conflicting_pincodes,
      distinct_service_areas: stats.distinct_service_areas,
      distinct_states: stats.distinct_states,
      warnings
    };
  });
}

export async function ingestAttendance(filePath, sourceFile = path.basename(filePath)) {
  const rows = readRows(filePath, 'Sheet1').filter((row) => text(value(row, 'Employee Code')));
  const mapped = rows.map((row) => [
    text(value(row, 'Employee Code')),
    text(value(row, 'Employee Name')),
    text(value(row, 'Service State')),
    dateOnly(value(row, 'Attendance Date')),
    text(value(row, 'Attendance Status')),
    deriveAttendanceStatus(value(row, 'In Date Time')),
    text(value(row, 'Attendance Month')),
    excelDate(value(row, 'In Date Time')),
    excelDate(value(row, 'Out Date Time')),
    decimal(value(row, 'Working Hours')),
    decimal(value(row, 'Start Latitude')),
    decimal(value(row, 'Start Longitude')),
    decimal(value(row, 'End Latitude')),
    decimal(value(row, 'End Longitude')),
    text(value(row, 'First Visit CS ID')),
    text(value(row, 'First Visit Ticket ID')),
    text(value(row, 'Last Visit CS ID')),
    text(value(row, 'Last Visit Ticket ID')),
    sourceFile
  ]);

  return withTransaction(async (client) => {
    let insertedRows = 0;
    let skippedDuplicates = 0;
    for (const row of mapped) {
      const duplicate = await client.query(
        `SELECT 1 FROM attendance_data
         WHERE employee_id = $1 AND attendance_date IS NOT DISTINCT FROM $2
         LIMIT 1`,
        [row[0], row[3]]
      );
      if (duplicate.rowCount) {
        skippedDuplicates += 1;
        continue;
      }
      await client.query(
        `INSERT INTO attendance_data
         (employee_id, employee_name, service_state, attendance_date, attendance_status_raw, attendance_status_derived, attendance_month, in_datetime, out_datetime, working_hours, start_latitude, start_longitude, end_latitude, end_longitude, first_visit_cs_id, first_visit_ticket_id, last_visit_cs_id, last_visit_ticket_id, source_file)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        row
      );
      insertedRows += 1;
    }
    return {
      detected_file_type: 'attendance',
      target_table: 'attendance_data',
      sheet_used: 'Sheet1',
      total_rows: mapped.length,
      inserted_rows: insertedRows,
      updated_rows: 0,
      skipped_duplicates: skippedDuplicates,
      failed_rows: 0,
      warnings: []
    };
  });
}

export async function ingestTicketActivity(filePath, sourceFile = path.basename(filePath)) {
  const sheetUsed = 'Sheet1';
  const rows = readRows(filePath, sheetUsed);
  const dataRows = rows.filter((row) => text(value(row, 'Ticket ID')) && text(value(row, 'Engineer Code')));
  const errors = [];
  const dateParseWarnings = [];
  const skippedInFile = new Set();

  const mapped = [];
  for (const [index, row] of dataRows.entries()) {
    const ticketId = text(value(row, 'Ticket ID'));
    const employeeId = text(value(row, 'Engineer Code'));
    const visitNumber = text(value(row, 'Visit No'));
    const visitDate = excelDate(value(row, 'Visit Date')) || excelDate(value(row, 'Visit In Time'));
    const visitIn = excelDate(value(row, 'Visit In Time')) || visitDate;
    const visitOut = excelDate(value(row, 'Visit Out Time'));
    const visitId = makeVisitId(ticketId, employeeId, visitNumber, visitDate || visitIn);

    if (!ticketId || !employeeId || !visitNumber) {
      errors.push({ row: index + 2, reason: 'Missing Ticket ID, Engineer Code, or Visit No.' });
      continue;
    }

    if (!visitDate && !visitIn) {
      dateParseWarnings.push({ row: index + 2, reason: 'Visit Date and Visit In Time could not be parsed; visit datetime stored as null.' });
    }

    if (skippedInFile.has(visitId)) {
      continue;
    }
    skippedInFile.add(visitId);

    mapped.push([
      visitId,
      ticketId,
      text(value(row, 'CS ID')),
      null,
      employeeId,
      visitIn,
      visitOut,
      sourceFile,
      text(value(row, 'Engineer Name'))
    ]);
  }

  return withTransaction(async (client) => {
    let insertedRows = 0;
    let skippedDuplicates = dataRows.length - mapped.length - errors.length;

    for (const row of mapped) {
      const existing = await client.query('SELECT 1 FROM visit_master WHERE visit_id = $1 LIMIT 1', [row[0]]);
      if (existing.rowCount) {
        skippedDuplicates += 1;
        continue;
      }
      await client.query(
        `INSERT INTO visit_master
         (visit_id, ticket_id, cs_id, oracle_site_no, employee_id, visit_in_datetime, visit_out_datetime, source_file)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        row.slice(0, 8)
      );
      await client.query(
        `INSERT INTO service_visits
         (visit_id, ticket_id, site_id, engineer_name, vendor_name, visit_date, visit_type, remark, proof_status, lat, lng)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (visit_id) DO UPDATE SET
         ticket_id = EXCLUDED.ticket_id,
         site_id = EXCLUDED.site_id,
         engineer_name = EXCLUDED.engineer_name,
         vendor_name = EXCLUDED.vendor_name,
         visit_date = EXCLUDED.visit_date,
         visit_type = EXCLUDED.visit_type,
         remark = EXCLUDED.remark,
         proof_status = EXCLUDED.proof_status,
         lat = EXCLUDED.lat,
         lng = EXCLUDED.lng`,
        [
          row[0],
          row[1],
          row[3] || row[2],
          row[8],
          null,
          row[5],
          null,
          null,
          null,
          null,
          null
        ]
      );
      insertedRows += 1;
    }

    return {
      detected_file_type: 'ticket_activity',
      target_table: 'visit_master',
      sheet_used: sheetUsed,
      total_rows: dataRows.length,
      inserted_rows: insertedRows,
      updated_rows: 0,
      skipped_duplicates: skippedDuplicates,
      failed_rows: errors.length,
      warnings: dateParseWarnings.length ? [`${dateParseWarnings.length} visit date values could not be parsed.`] : [],
      errors: errors.slice(0, 25),
      date_parse_warnings: dateParseWarnings.length,
      date_parse_warning_samples: dateParseWarnings.slice(0, 25),
      unsupported_columns_ignored: [
        'Engineer Name',
        'Ticket Date',
        'Ticket Type',
        'Ticket Sub Type',
        'Visit No',
        'Visit Date',
        'Is Claimed',
        'State'
      ]
    };
  });
}
