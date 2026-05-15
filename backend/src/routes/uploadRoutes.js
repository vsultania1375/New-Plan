import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import {
  ingestAttendance,
  ingestCustomerSites,
  ingestEngineers,
  ingestOffline,
  ingestServiceAreas,
  ingestTicketActivity,
  ingestTickets
} from '../services/ingestionService.js';
import { query } from '../db/pool.js';
import { readRows, readWorkbookInfo } from '../utils/workbook.js';
import { dateOnly, excelDate, extractOfflineDataDate, text } from '../utils/normalize.js';

fs.mkdirSync(env.uploadDir, { recursive: true });

const upload = multer({ dest: env.uploadDir });
export const uploadRoutes = express.Router();

function requireAdmin(req, res, next) {
  const provided = req.header('x-admin-key');
  if (!provided || provided !== env.adminUploadKey) {
    return res.status(403).json({ error: 'Admin upload access required.' });
  }
  return next();
}

const TYPE_META = {
  offline: { target_table: 'offline_data_master', sheet_used: 'B2B' },
  tickets: { target_table: 'view_ticket', sheet_used: 'Sheet1' },
  sites: { target_table: 'customer_site_master', sheet_used: 'Sheet1' },
  engineers: { target_table: 'engineer_master', sheet_used: 'Sheet1' },
  serviceAreas: { target_table: 'service_area_master', sheet_used: 'Sheet1' },
  attendance: { target_table: 'attendance_data', sheet_used: 'Sheet1' },
  ticketActivity: { target_table: 'visit_master', sheet_used: 'Sheet1' }
};

const CANONICAL_TYPES = {
  serviceAreas: 'service_areas',
  ticketActivity: 'ticket_activity'
};

const REQUIRED_HEADERS = {
  offline: ['cs_no', 'No. Of Days', 'Segment', 'Offline Date & Time'],
  tickets: ['Ticket ID', 'Oracle Site No', 'Ticket Status', 'Ticket Assigned To'],
  sites: ['CS ID', 'Oracle Site Number', 'Oracle Site Name'],
  engineers: ['Employee Code', 'Employee Name', 'Designation', 'Active Status'],
  serviceAreas: ['Service Area Code', 'Service Area Name'],
  attendance: ['Employee Code', 'Attendance Date', 'In Date Time'],
  ticketActivity: ['Engineer Code', 'Ticket ID', 'Visit No', 'Visit Date', 'Visit In Time']
};

function normalizeHeaders(headers = []) {
  return new Set(headers.map((header) => header.toLowerCase()));
}

function getWorkbookInfo(filePath) {
  return readWorkbookInfo(filePath);
}

function sheetHasHeaders(sheet, requiredHeaders) {
  const headers = normalizeHeaders(sheet?.headers);
  return requiredHeaders.every((header) => headers.has(header.toLowerCase()));
}

function hasHeaders(filePath, requiredHeaders) {
  if (!filePath) return false;
  try {
    return getWorkbookInfo(filePath).some((sheet) => sheetHasHeaders(sheet, requiredHeaders));
  } catch {
    return false;
  }
}

function detectImportType(filename, filePath) {
  const lower = filename.toLowerCase();
  const workbookInfo = getWorkbookInfo(filePath);
  const b2bSheet = workbookInfo.find((sheet) => sheet.sheetName === 'B2B');
  if (b2bSheet && sheetHasHeaders(b2bSheet, REQUIRED_HEADERS.offline)) return 'offline';
  if (workbookInfo.some((sheet) => sheetHasHeaders(sheet, REQUIRED_HEADERS.tickets))) return 'tickets';
  if (workbookInfo.some((sheet) => sheetHasHeaders(sheet, REQUIRED_HEADERS.sites))) return 'sites';
  if (workbookInfo.some((sheet) => sheetHasHeaders(sheet, REQUIRED_HEADERS.engineers))) return 'engineers';
  if (workbookInfo.some((sheet) => sheetHasHeaders(sheet, REQUIRED_HEADERS.serviceAreas))) return 'serviceAreas';
  if (workbookInfo.some((sheet) => sheetHasHeaders(sheet, REQUIRED_HEADERS.attendance))) return 'attendance';
  if (workbookInfo.some((sheet) => sheetHasHeaders(sheet, REQUIRED_HEADERS.ticketActivity))) return 'ticketActivity';
  if (lower.includes('b2b offline')) return 'offline';
  if (lower.includes('viewticket') || lower.includes('view ticket')) return 'tickets';
  if (lower.includes('customersitemaster') || lower.includes('customer_site')) return 'sites';
  if (lower.includes('employeemaster')) return 'engineers';
  if (lower.includes('serviceareamaster')) return 'serviceAreas';
  if (lower.includes('attendancereport')) return 'attendance';
  if (lower.includes('ticketactivity') || lower.includes('ticket activity')) return 'ticketActivity';
  if (lower.includes('visit') && hasHeaders(filePath, ['Engineer Code', 'Ticket ID', 'Visit No', 'Visit Date', 'Visit In Time'])) {
    return 'ticketActivity';
  }
  if (hasHeaders(filePath, ['Engineer Code', 'Ticket ID', 'Visit No', 'Visit Date', 'Visit In Time'])) return 'ticketActivity';
  return null;
}

function normalizeSummary(type, result, dryRun = false) {
  const meta = TYPE_META[type] || {};
  const warnings = result.warnings || [];
  return {
    success: result.failed_rows ? false : true,
    ...(dryRun ? { dry_run: true } : {}),
    detected_file_type: result.detected_file_type || CANONICAL_TYPES[type] || type,
    target_table: result.target_table || meta.target_table || null,
    sheet_used: result.sheet_used || meta.sheet_used || null,
    total_rows: result.total_rows ?? 0,
    inserted_rows: result.inserted_rows ?? 0,
    updated_rows: result.updated_rows ?? 0,
    skipped_duplicates: result.skipped_duplicates ?? 0,
    failed_rows: result.failed_rows ?? 0,
    warnings,
    ...(result.estimated_duplicates != null ? { estimated_duplicates: result.estimated_duplicates } : {}),
    ...(result.missing_required_headers ? { missing_required_headers: result.missing_required_headers } : {}),
    message: dryRun
      ? 'Dry run completed. No data was imported.'
      : result.failed_rows
      ? 'Import completed with row failures.'
      : warnings.length
      ? 'Import completed with warnings.'
      : 'Import completed successfully'
  };
}

function rowCountForType(type, filePath) {
  if (type === 'offline') return readRows(filePath, 'B2B', { headerRow: 2 }).filter((row) => text(row.cs_no));
  const rows = readRows(filePath, TYPE_META[type]?.sheet_used || 'Sheet1');
  if (type === 'tickets') return rows.filter((row) => text(row['Ticket ID']));
  if (type === 'sites') return rows.filter((row) => text(row['Oracle Site Number']));
  if (type === 'engineers') return rows.filter((row) => text(row['Employee Code']));
  if (type === 'serviceAreas') return rows.filter((row) => text(row['Service Area Code']));
  if (type === 'attendance') return rows.filter((row) => text(row['Employee Code']));
  if (type === 'ticketActivity') return rows.filter((row) => text(row['Ticket ID']) && text(row['Engineer Code']));
  return rows;
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

async function estimateDuplicates(type, filePath, originalName) {
  const rows = rowCountForType(type, filePath);
  if (type === 'offline') {
    const dataDate = extractOfflineDataDate(originalName);
    let duplicates = 0;
    for (const row of rows) {
      const offlineDate = excelDate(row['Offline Date & Time']);
      const result = offlineDate
        ? await query(
          `SELECT 1 FROM offline_data_master
           WHERE data_date = $1 AND cs_id = $2 AND offline_date_time = $3 LIMIT 1`,
          [dataDate, text(row.cs_no), offlineDate]
        )
        : await query(
          `SELECT 1 FROM offline_data_master
           WHERE data_date = $1 AND cs_id = $2 AND aging_days IS NOT DISTINCT FROM $3 LIMIT 1`,
          [dataDate, text(row.cs_no), Number.parseInt(row['No. Of Days'] ?? '', 10) || null]
        );
      if (result.rowCount) duplicates += 1;
    }
    return { rows, duplicates };
  }
  if (type === 'attendance') {
    let duplicates = 0;
    for (const row of rows) {
      const result = await query(
        `SELECT 1 FROM attendance_data
         WHERE employee_id = $1 AND attendance_date IS NOT DISTINCT FROM $2 LIMIT 1`,
        [text(row['Employee Code']), dateOnly(row['Attendance Date'])]
      );
      if (result.rowCount) duplicates += 1;
    }
    return { rows, duplicates };
  }
  if (type === 'ticketActivity') {
    let duplicates = 0;
    const seen = new Set();
    for (const row of rows) {
      const visitDate = excelDate(row['Visit Date']) || excelDate(row['Visit In Time']);
      const visitId = makeVisitId(row['Ticket ID'], row['Engineer Code'], row['Visit No'], visitDate);
      if (seen.has(visitId)) {
        duplicates += 1;
        continue;
      }
      seen.add(visitId);
      const result = await query('SELECT 1 FROM visit_master WHERE visit_id = $1 LIMIT 1', [visitId]);
      if (result.rowCount) duplicates += 1;
    }
    return { rows, duplicates };
  }
  return { rows, duplicates: 0 };
}

async function dryRunImport(type, filePath, originalName) {
  const workbookInfo = getWorkbookInfo(filePath);
  const required = REQUIRED_HEADERS[type] || [];
  const sheetName = TYPE_META[type]?.sheet_used || workbookInfo[0]?.sheetName;
  const sheet = workbookInfo.find((entry) => entry.sheetName === sheetName) || workbookInfo[0];
  const headers = normalizeHeaders(sheet?.headers);
  const missingRequiredHeaders = required.filter((header) => !headers.has(header.toLowerCase()));
  const { rows, duplicates } = await estimateDuplicates(type, filePath, originalName);
  const warnings = [];
  if (missingRequiredHeaders.length) warnings.push('Some required headers are missing.');
  return normalizeSummary(type, {
    total_rows: rows.length,
    inserted_rows: 0,
    updated_rows: 0,
    skipped_duplicates: 0,
    failed_rows: 0,
    estimated_duplicates: duplicates,
    missing_required_headers: missingRequiredHeaders,
    warnings
  }, true);
}

async function ingestByType(type, filePath, originalName) {
  if (type === 'offline') return ingestOffline(filePath, originalName);
  if (type === 'tickets') return ingestTickets(filePath);
  if (type === 'sites') return ingestCustomerSites(filePath);
  if (type === 'engineers') return ingestEngineers(filePath);
  if (type === 'serviceAreas') return ingestServiceAreas(filePath);
  if (type === 'attendance') return ingestAttendance(filePath, originalName);
  if (type === 'ticketActivity' || type === 'visit_master') return ingestTicketActivity(filePath, originalName);
  throw new Error(`Unsupported import type: ${type}`);
}

uploadRoutes.post('/', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded. Use multipart field name "file".' });
    const type = req.body.type || detectImportType(req.file.originalname, req.file.path);
    if (!type) return res.status(400).json({ error: `Could not detect import type for ${req.file.originalname}` });
    if (req.query.dryRun === 'true') {
      const result = await dryRunImport(type, req.file.path, req.file.originalname);
      fs.unlink(req.file.path, () => {});
      return res.json(result);
    }
    const result = await ingestByType(type, req.file.path, req.file.originalname);
    fs.unlink(req.file.path, () => {});
    return res.json({ original_name: req.file.originalname, ...normalizeSummary(type, result) });
  } catch (error) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    next(error);
  }
});

uploadRoutes.post('/sample-folder', requireAdmin, async (_req, res, next) => {
  try {
    const root = path.resolve(process.cwd(), '..');
    const files = fs.readdirSync(root);
    const results = [];
    for (const file of files) {
      const filePath = path.join(root, file);
      const type = detectImportType(file, filePath);
      if (!type) continue;
      results.push({ file, ...normalizeSummary(type, await ingestByType(type, filePath, file)) });
    }
    res.json({ imported: results });
  } catch (error) {
    next(error);
  }
});
