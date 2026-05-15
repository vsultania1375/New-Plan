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

export async function ingestCustomerSites(filePath) {
  const rows = readRows(filePath, 'Sheet1').filter((row) => text(value(row, 'Oracle Site Number')));
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
    return {
      detected_file_type: 'sites',
      target_table: 'customer_site_master',
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

export async function ingestTickets(filePath) {
  const rows = readRows(filePath, 'Sheet1').filter((row) => text(value(row, 'Ticket ID')));
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
      mode: 'truncate_insert'
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
      sourceFile
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
        row
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
