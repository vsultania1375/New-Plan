# Daily Upload Guide

This guide is for the admin user maintaining the PAN India Operations Intelligence Dashboard.

## Business Terminology: POP = Service Area

POP and Service Area are the same operational unit in this dashboard. Use `service_area_name` as the POP / Service Area display name and `service_area_code` where available for mapping. Do not treat POP as a separate hierarchy unless business introduces a new mapping later.

## Daily Upload Order

Use this order when you receive the full daily file set:

1. `CustomerSiteMaster` — if a refreshed master file was provided
2. `EmployeeMaster` — if a refreshed master file was provided
3. `ServiceAreaMaster` — if a refreshed master file was provided
4. `StateHeadMapping` — occasional ownership file, if updated
5. `ServiceAreaEngineerMapping` — occasional ownership file, if updated
6. `ServiceAreaPincodeMapping` — occasional territory mapping file, if updated
7. `ViewTicket`
8. `B2B Offline DD-MM-YYYY`
9. `TicketActivity`
10. `AttendanceReport`

The master and ownership mapping files come first so the latest site, engineer, Service Area, State Head, and Service Area engineer ownership data is available before operational analytics refresh.

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
| `StateHeadMapping.xlsx` | Occasional / when ownership changes | `state_head_mapping` official State Head ownership |
| `ServiceAreaEngineerMapping.xlsx` | Occasional / when ownership changes | `service_area_engineer_mapping` official Service Area engineer ownership |
| `ServiceAreaPincodeMapping.xlsx` | Occasional / when territory mapping changes | `service_area_pincode_mapping` pincode-to-Service Area mapping for future territory polygons |

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
  - state / Service Area risk views
- `TicketActivity`
  - visit history
  - ticket-without-visit analysis
- `AttendanceReport`
  - attendance records
  - Engineer Wise attendance, on-time/late counts, and productivity analysis
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
- `StateHeadMapping`
  - official State Head ownership for State Wise Report
  - phone/email where provided
- `ServiceAreaEngineerMapping`
  - official active engineer owner for each Service Area
  - backup engineer, manager, and assignment dates where provided
  - primary ownership input for Engineer Wise Service Area assignment in the current schema
- `ServiceAreaPincodeMapping`
  - maps pincodes to Service Areas
  - supports future Service Area territory polygon generation
  - does **not** draw polygons until approved pincode boundary GeoJSON is added

Ticket assignment is an operational signal only. It is not ownership. Upload the mapping files before expecting ownership fields to move from `Mapping Pending` to named owners.

Engineer Wise Report depends on:

- `EmployeeMaster` for active engineers and Reporting Manager 2.
- `ServiceAreaEngineerMapping` for current Service Area assignment.
- `AttendanceReport` for attendance days, on-time days, and late days.
- `TicketActivity` for productive days, visit timing, repeat visit gap, and recent visits.
- `ViewTicket`, `B2B Offline`, and `CustomerSiteMaster` for Service Area ticket/offline/site load.

The Engineer Wise `Operational Risk Score` is an operations risk signal only. Do not use it as an HR performance score.

For `ServiceAreaPincodeMapping`, fix source-file issues before import. Bad rows are skipped, and pincode conflicts must be corrected in Excel rather than silently overwritten.

## How to Verify the Dashboard After Upload

After the upload sequence:

1. Confirm the top status pill is `Live`
2. Confirm KPI cards are populated
3. Confirm the territory map loads
4. Confirm the Operations Summary Panel is populated
5. Hover a state and confirm the floating info card appears
6. Click a state and confirm Service Area markers / Service Area ranking appear
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
- Do not invent Service Area polygons; current Service Area marker view is centroid-based until real geometry exists
- Do not expect `ServiceAreaPincodeMapping.xlsx` to draw polygons by itself; pincode boundary GeoJSON is still required
- Do not treat ticket assignment as official State Head or Service Area ownership

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
