# Release Checklist — First Usable Version

Use this checklist before calling the dashboard ready for daily operational use or stakeholder demo.

## 1. Local Startup Checklist

- [ ] Docker Desktop is running
- [ ] `docker compose ps` shows `postgres` as healthy
- [ ] `backend/.env` exists and points to the expected local database
- [ ] PostgreSQL is reachable on `localhost:5432`
- [ ] Backend starts successfully on `localhost:4000`
- [ ] Frontend starts successfully on `localhost:5173`
- [ ] `http://localhost:4000/api/health` returns `dbConnected: true`
- [ ] Dashboard header status pill shows `Live`

## 2. Database Health Checklist

- [ ] Core tables exist
- [ ] `offline_data_master` contains rows
- [ ] `view_ticket` contains rows
- [ ] `customer_site_master` contains rows
- [ ] `engineer_master` contains rows
- [ ] `service_area_master` contains rows
- [ ] `attendance_data` contains rows when attendance reporting is expected
- [ ] `visit_master` contains rows when TicketActivity data is expected
- [ ] Known row counts are plausible for the current file set
- [ ] No destructive database command has been run

## 3. Upload Workflow Checklist

- [ ] Admin Upload unlock works
- [ ] Each file is dry-run validated before import
- [ ] File type detection is correct
- [ ] Target table and sheet used are correct
- [ ] Row counts look plausible before upload
- [ ] Duplicate estimates are reviewed
- [ ] Upload result panel shows inserted / updated / skipped / failed counts
- [ ] Append-only re-imports skip duplicates as expected
- [ ] `view_ticket` snapshot refresh completes successfully
- [ ] Post-upload message says `Upload successful. Dashboard updated.`

## 4. Dashboard Verification Checklist

- [ ] KPI cards are populated
- [ ] Territory map loads
- [ ] Operations Summary Panel is populated
- [ ] State hover shows the floating map info card
- [ ] Floating card stays anchored to territory / POP, not the cursor
- [ ] State click selects and zooms correctly
- [ ] POP markers appear after state selection
- [ ] POP ranking panel works
- [ ] State risk / POP risk sections render
- [ ] Engineer load table renders
- [ ] Ticket-without-visit table renders
- [ ] Exports respect current filters where applicable
- [ ] Browser console has no app-breaking errors

## 5. Demo Checklist

- [ ] Dashboard opens directly into a usable live state
- [ ] Top KPI story is understandable in under one minute
- [ ] PAN India map clearly shows risk concentration
- [ ] State drilldown works smoothly
- [ ] POP drilldown works smoothly
- [ ] Operations Summary Panel can explain where lag is occurring
- [ ] One example table is ready for deeper discussion
- [ ] Admin upload workflow can be demonstrated if needed
- [ ] Known caveats are prepared before the meeting

## 6. Known Limitations

- Real authentication is not implemented; the admin key is only an MVP local gate
- Some analytics still have technical debt around direct `cs_id` joins
- Full visit history is still evolving; some productivity metrics remain MVP-grade
- Date/state filter wiring is not fully complete across all API queries
- POP view is centroid-based only; real POP polygons are not yet available
- No formal migration system exists yet
- Automated tests are still limited

## 7. Do-Not-Break Rules

- Do not change business formulas without approval
- Do not convert `cs_id` to a number
- Do not truncate append-only tables:
  - `offline_data_master`
  - `visit_master`
  - `attendance_data`
- Do not change schema casually
- Do not run `docker compose down -v`
- Do not invent POP polygons
- Do not bypass dry-run validation in daily operations
- Do not treat `ADMIN_UPLOAD_KEY` as production security

## 8. Backup Recommendation Before Daily Use

Before sustained daily use:

- [ ] Back up the PostgreSQL volume or export the database
- [ ] Keep a copy of daily source files outside the app folder
- [ ] Record the current known-good row counts
- [ ] Save a copy of `backend/.env` securely outside source control
- [ ] Confirm restore steps are understood before relying on the dashboard operationally

Minimum recommendation:

- create a database backup before the first business-critical daily cycle
- take another backup before major import-process or schema changes

## 9. Final Go / No-Go Checklist

### Go

- [ ] Database healthy
- [ ] Backend and frontend both live
- [ ] Upload dry-run works
- [ ] Controlled duplicate-skip validation passed
- [ ] `view_ticket` snapshot refresh passed
- [ ] Dashboard loads with populated KPIs and map
- [ ] Critical tables render
- [ ] No known blocker remains for the intended audience

### No-Go

- [ ] Backend offline
- [ ] Database unreachable
- [ ] Upload summaries are inconsistent or failing
- [ ] Append-only imports are duplicating unexpectedly
- [ ] `view_ticket` snapshot refresh fails
- [ ] Territory map or core KPI cards fail to render
- [ ] Any business formula changed without approval

## Release Decision

- [ ] **Go**
- [ ] **No-Go**

Decision notes:

```text

```
