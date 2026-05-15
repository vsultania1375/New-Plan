# Daily Upload Guide

This guide is for the admin user maintaining the PAN India Operations Intelligence Dashboard.

## Daily Upload Order

Use this order when you receive the full daily file set:

1. `CustomerSiteMaster` — if a refreshed master file was provided
2. `EmployeeMaster` — if a refreshed master file was provided
3. `ServiceAreaMaster` — if a refreshed master file was provided
4. `ViewTicket`
5. `B2B Offline DD-MM-YYYY`
6. `TicketActivity`
7. `AttendanceReport`

The master files come first so the latest site, engineer, and service-area mappings are available before operational analytics refresh.

## Daily vs Occasional Files

| File | Upload cadence | Updates |
| --- | --- | --- |
| `ViewTicket.xlsx` | Daily | `view_ticket` latest snapshot |
| `B2B Offline DD-MM-YYYY.xlsx` | Daily | `offline_data_master` historical offline rows |
| `TicketActivity.xlsx` | Daily when available | `visit_master` historical visit rows |
| `AttendanceReport.xlsx` | Daily when available | `attendance_data` historical attendance rows |
| `CustomerSiteMaster.xlsx` | Occasional / when refreshed | `customer_site_master` site master |
| `EmployeeMaster.xlsx` | Occasional / when refreshed | `engineer_master` engineer master |
| `ServiceAreaMaster.xlsx` | Occasional / when refreshed | `service_area_master` mapping master |

## Dry Run First Rule

Always use `Validate File` before `Upload`.

Dry run tells you:

- detected file type
- target table
- sheet used
- total rows
- estimated duplicates
- missing required headers
- warnings

Dry run does **not** change the database.

If the detected type, sheet, or row count looks wrong, stop and inspect the file before importing.

## Import Button Rule

Only click `Upload` after the dry-run summary looks correct.

After import:

- read the result card
- confirm inserted / updated / skipped / failed counts
- confirm the dashboard refresh message says `Upload successful. Dashboard updated.`

If the upload result is unexpected, do not keep retrying blindly.

## Duplicate Safety

The append-only tables are protected against duplicate re-imports:

- `offline_data_master`
  - duplicate key: `data_date + cs_id + offline_date_time`
  - fallback if offline timestamp is missing: `data_date + cs_id + aging_days`
- `visit_master`
  - duplicate key: deterministic `visit_id`
- `attendance_data`
  - duplicate key: `employee_id + attendance_date`

Expected behavior when re-uploading the same already-imported file:

- inserted rows should be `0`
- skipped duplicates should be close to or equal to the file row count

`view_ticket` is different: it is a latest snapshot table. Importing a new `ViewTicket` file replaces the previous snapshot with truncate + insert behavior.

## What Each File Updates

- `ViewTicket`
  - ticket statuses
  - active ticket counts
  - ticket aging
  - visit signals from the ticket snapshot
- `B2B Offline`
  - current offline site load
  - offline aging
  - state / POP risk views
- `TicketActivity`
  - visit history
  - ticket-without-visit analysis
- `AttendanceReport`
  - attendance records
  - future attendance/productivity analysis
- `CustomerSiteMaster`
  - site names
  - state mapping
  - service area mapping
  - coordinates used by the map
- `EmployeeMaster`
  - engineer identity
  - active engineer counts
  - engineer metadata
- `ServiceAreaMaster`
  - service-area reference mapping

## How to Verify the Dashboard After Upload

After the upload sequence:

1. Confirm the top status pill is `Live`
2. Confirm KPI cards are populated
3. Confirm the territory map loads
4. Confirm the Operations Summary Panel is populated
5. Hover a state and confirm the floating info card appears
6. Click a state and confirm POP markers / POP ranking appear
7. Check one or two key tables:
   - `Ticket But No Visit`
   - `Engineer Performance / Load`
8. If needed, call:
   - `/api/health`
   - `/api/analytics/overview`
   - `/api/analytics/map/states`
   - `/api/analytics/map/offline`

## If Upload Fails

1. Read the import summary carefully
2. Check:
   - detected file type
   - sheet used
   - missing headers
   - warnings
   - failed rows
3. If detection is wrong, choose the file type manually and dry-run again
4. If the backend is offline:
   - start PostgreSQL
   - start the backend
   - verify `/api/health`
5. If the file itself is wrong or incomplete, correct the source file before retrying

## What Not To Do

- Do not upload without validating first
- Do not repeatedly import files just to “see if it works”
- Do not run `docker compose down -v`
- Do not edit or overwrite `.env`
- Do not treat `ADMIN_UPLOAD_KEY` as production security
- Do not manually alter business formulas while troubleshooting uploads
- Do not invent POP polygons; current POP view is centroid-based until real geometry exists

## Example Daily Workflow

1. Open the dashboard
2. Confirm the status pill is `Live`
3. Open `Admin Upload`
4. Upload fresh `ViewTicket`
   - click `Validate File`
   - review summary
   - click `Upload`
5. Upload the day’s `B2B Offline` file
   - validate first
   - upload
6. Upload `TicketActivity`
   - validate first
   - upload
7. Upload `AttendanceReport`
   - validate first
   - upload
8. Upload any refreshed master files if received
9. Confirm:
   - KPI cards updated
   - map updated
   - risk panels updated
   - tables updated
10. If any result looks unusual, stop and investigate before continuing.
