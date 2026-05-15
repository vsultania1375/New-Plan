# PROJECT_HANDOVER.md
# PAN India Operations Intelligence Dashboard — Agent Handover Log

> **Rule:** Every agent that works on this repo MUST read this file first, and MUST append a new entry after completing work. Do not delete old entries.

---

# Handover Entry — 2026-05-15 (approved data reset)

## Agent / Tool
Codex

## Task Completed
Cleared all approved dashboard table rows after explicit user approval so the system can be repopulated from fresh admin uploads.

## Files Changed
- `DATA_RESET_LOG.md`
- `PROJECT_HANDOVER.md`

## Pre-Reset Counts
- `offline_data_master`: 1430
- `view_ticket`: 8751
- `customer_site_master`: 23345
- `engineer_master`: 340
- `service_area_master`: 250
- `attendance_data`: 211
- `visit_master`: 2804
- `holiday_master`: 0

## Reset Performed
- Emptied rows only from:
  - `offline_data_master`
  - `view_ticket`
  - `customer_site_master`
  - `engineer_master`
  - `service_area_master`
  - `attendance_data`
  - `visit_master`
  - `holiday_master`
- Schema, tables, uploaded Excel files, and project files were preserved.

## Post-Reset Counts
- All approved tables now contain `0` rows.

## Verification
- `/api/health` remained OK with DB connected
- `/api/analytics/overview` returned zeroed metrics, as expected after reset

## Next Recommended Step
- Re-upload files through Admin Upload using the documented daily order and dry-run-first workflow.

---

# Handover Entry — 2026-05-15 (release checklist)

## Agent / Tool
Codex

## Task Completed
Created `RELEASE_CHECKLIST.md` for the first usable version release gate.

## Files Changed
- `RELEASE_CHECKLIST.md`
- `PROJECT_HANDOVER.md`

## Checklist Coverage
- Local startup checklist
- Database health checklist
- Upload workflow checklist
- Dashboard verification checklist
- Demo checklist
- Known limitations
- Do-not-break rules
- Backup recommendation before daily use
- Final go / no-go checklist

## Notes
- No code changes were made.
- The checklist consolidates the current operating reality from the architecture, guardrails, daily upload guide, and validated workflow behavior.

## Next Recommended Step
- Use the checklist once end-to-end before the first real daily production-like run or stakeholder demo.

---

# Handover Entry — 2026-05-15 (daily upload guide)

## Agent / Tool
Codex

## Task Completed
Created `DAILY_UPLOAD_GUIDE.md` to document the safe daily admin upload workflow.

## Files Changed
- `DAILY_UPLOAD_GUIDE.md`
- `PROJECT_HANDOVER.md`

## Guide Coverage
- Daily upload order
- Daily vs occasional files
- Dry-run-first rule
- Import confirmation rule
- Duplicate protection behavior
- What each file updates
- Post-upload dashboard verification
- Upload failure handling
- Explicit “what not to do” safety section
- Example daily workflow

## Notes
- No code changes were made.
- The guide reflects the current upload implementation, including dry-run validation, append-only duplicate protection, and `view_ticket` snapshot semantics.

## Next Recommended Step
- Share the guide with the daily operator and use it as the checklist for the next real upload cycle.

---

# Handover Entry — 2026-05-15 (controlled live upload validation)

## Agent / Tool
Codex

## Task Completed
Completed controlled live upload validation against the current local database.

## Files Tested
- `TicketActivity (2).xlsx`
- `B2B Offline 13-05-2026.xlsx`
- `AttendanceReport (30).xlsx`
- `ViewTicket (82).xlsx`

## Pre / Post Counts
- Pre-import:
  - `offline_data_master`: 1430
  - `attendance_data`: 211
  - `visit_master`: 2804
  - `view_ticket`: 8751
  - `customer_site_master`: 23345
  - `engineer_master`: 340
  - `service_area_master`: 250
- Post-import:
  - `offline_data_master`: 1430
  - `attendance_data`: 211
  - `visit_master`: 2804
  - `view_ticket`: 8751
  - `customer_site_master`: 23345
  - `engineer_master`: 340
  - `service_area_master`: 250

## Import Results
- TicketActivity duplicate import:
  - inserted `0`
  - skipped duplicates `2804`
- Offline duplicate import:
  - inserted `0`
  - skipped duplicates `1430`
- Attendance duplicate import:
  - inserted `0`
  - skipped duplicates `211`
- ViewTicket snapshot import:
  - inserted `8751`
  - final table count `8751`

## Dashboard / API Validation
- APIs after imports:
  - `/api/health` OK
  - `/api/analytics/overview` OK
  - `/api/analytics/map/states` returned 38 rows
  - `/api/analytics/map/offline` returned 238 POP markers
  - `/api/analytics/tables/engineer-load` returned rows
  - `/api/analytics/tables/ticket-without-visit` returned rows
- Admin Upload UI showed structured import summary and the post-upload refresh message:
  - `Upload successful. Dashboard updated.`
- Direct API validation remained live after all imports.

## Remaining Risks / Notes
- In the sandboxed browser run, external map tile requests emitted `ERR_NETWORK_ACCESS_DENIED`; this is environment-related and not tied to upload behavior.
- During automated UI validation the status pill was captured while refresh was still in `Checking`; direct API checks remained healthy and the dashboard content stayed populated.

## Next Recommended Step
- If desired, do one human browser pass outside the restricted sandbox to confirm the post-upload status pill settles back to `Live` after refresh.

---

# Handover Entry — 2026-05-15 (upload workflow polish)

## Agent / Tool
Codex

## Task Completed
Polished the existing upload workflow without schema changes: standardized import summaries, added dry-run validation, added duplicate protection for append-only offline and attendance imports, strengthened file detection, exposed Ticket Activity in the admin UI, and added a structured result panel.

## Files Changed
- `backend/src/routes/uploadRoutes.js`
- `backend/src/services/ingestionService.js`
- `frontend/src/api.js`
- `frontend/src/components/AdminAccess.jsx`
- `frontend/src/styles.css`
- `PROJECT_HANDOVER.md`

## Import Behavior Changes
- Upload responses now use one summary shape across file types
- `POST /api/uploads?dryRun=true` validates files without mutating data
- Offline duplicate key: `data_date + cs_id + offline_date_time`, with fallback to `data_date + cs_id + aging_days`
- Attendance duplicate key: `employee_id + attendance_date`
- Ticket Activity dry run now estimates deterministic `visit_id` duplicates
- Existing `view_ticket` snapshot behavior remains truncate + insert
- Existing master-table upsert behavior remains unchanged

## UI Changes
- Added `Ticket Activity / Visit Data` manual option
- Added `Validate File` dry-run action beside `Upload`
- Added structured import summary card with detected type, target table, sheet, row counts, duplicates, warnings, and status tone
- Successful imports still trigger the existing dashboard refresh path

## Validation Results
- Frontend build passed
- Backend syntax check passed
- API health passed
- Dry run:
  - Offline file: 1430 rows, 1430 estimated duplicates
  - TicketActivity file: 2804 rows, 2804 estimated duplicates
  - Attendance file: 211 rows, 211 estimated duplicates
  - ViewTicket file: 8751 rows
- Dry runs left table counts unchanged:
  - `offline_data_master`: 1430
  - `attendance_data`: 211
  - `visit_master`: 2804
  - `view_ticket`: 8751
- Admin UI dry-run result panel rendered correctly for TicketActivity

## Remaining Risks / Notes
- Real re-import validation was intentionally not executed because it would mutate current demo data; user approval is still needed before testing live imports, especially the `view_ticket` snapshot refresh.
- Browser console showed map tile network-denied messages in the sandboxed validation browser; those were unrelated to the upload flow.

## Next Recommended Step
- With approval, perform controlled live-import validation in this order: TicketActivity duplicate-skip, Offline duplicate-skip, Attendance duplicate-skip, then ViewTicket snapshot refresh.

---

# Handover Entry — 2026-05-15 (local startup diagnosis)

## Agent / Tool
Codex

## Task Completed
Diagnosed the local runtime, started the backend safely, verified existing database contents, and confirmed the live dashboard can connect once the backend is running.

## What Was Checked
- Docker CLI / engine availability
- Docker Compose postgres service state
- Port reachability for `5432`, `4000`, and `5173`
- Backend `.env` values
- Existing database row counts
- Live API endpoints
- Browser dashboard status and map smoke test

## Services Started
- PostgreSQL: already running and healthy in Docker Compose
- Backend: started with `npm run dev --prefix backend`
- Frontend: already reachable on `localhost:5173`

## API Results
- `/api/health` — OK, `dbConnected: true`
- `/api/analytics/overview` — OK
- `/api/analytics/map/states` — OK, 38 rows
- `/api/analytics/map/offline` — OK, 238 POP markers

## Data Availability
- `offline_data_master`: 1430
- `view_ticket`: 8751
- `customer_site_master`: 23345
- `engineer_master`: 340
- `service_area_master`: 250
- `attendance_data`: 211
- `visit_master`: 2804

## Dashboard Status
- Header status pill showed `Live`
- Territory map rendered
- Hovering a state produced the floating map info card
- Selecting a state showed selected-state details and POP ranking rows
- No console errors observed during the browser smoke test

## Issues / Notes
- Original issue was runtime state, not missing data: PostgreSQL was available and populated, but backend was not running on `localhost:4000`
- Automated cursor-path verification of “card stays fixed while moving within the exact same polygon” was not perfectly reproducible because test pointer movement crossed neighboring polygons, but the implementation remains event-driven by territory changes rather than mousemove position

## Next Recommended Step
- Keep the backend running during local dashboard work, or use the root `npm run dev` command so frontend and backend start together.

---

# Handover Entry — 2026-05-15 (failed fetch + floating map card pass)

## Agent / Tool
Codex

## Task Completed
Diagnosed the dashboard `Failed to fetch` state, replaced the raw error banner with professional system-status UX, added graceful partial-load behavior, clarified startup docs, and moved the state/POP info card into the map as a fixed floating card anchored to territory/marker coordinates instead of the cursor.

## Root Cause / API Status
- Frontend API base is correct: `http://localhost:4000/api`
- Backend env and CORS configuration are aligned with local frontend startup
- Actual failure on this machine: backend was not listening on `localhost:4000` and PostgreSQL was not listening on `localhost:5432`
- Docker Desktop engine was also unavailable during diagnosis, so PostgreSQL could not be started from Compose in-session

## Files Changed
- `README.md`
- `frontend/src/api.js`
- `frontend/src/App.jsx`
- `frontend/src/components/DashboardLayout.jsx`
- `frontend/src/components/DashboardStatus.jsx`
- `frontend/src/components/TerritoryMapCard.jsx`
- `frontend/src/components/StateTerritoryMap.jsx`
- `frontend/src/styles.css`
- `PROJECT_HANDOVER.md`

## UI / Behavior Changes
- Added top-level API status indicator: `Live`, `Backend Offline`, `No Data`, `Partial Data`
- Added professional status cards for offline, no-data, and partial-load scenarios
- Dashboard data loading now uses per-endpoint fallbacks so one failed API does not hide working sections
- Floating map info card now appears inside the map and anchors to state bounds center or selected POP marker location
- State hover still updates details without following mouse movement
- Existing side panel keeps POP ranking, legend, and centroid-only note

## Tests Run
- `npm run build --prefix frontend` — passed
- `Get-ChildItem -Recurse -Filter *.js backend/src | ForEach-Object { node --check $_.FullName }` — passed
- Real API checks on `localhost:4000` — unavailable because backend was not running
- Browser verification with real frontend + unavailable backend — confirmed `Backend Offline` indicator and offline status card
- Browser verification with mocked API responses — confirmed partial-load card keeps hero content visible and floating state card renders inside map

## Remaining Issues
- Real end-to-end live verification still requires PostgreSQL and backend startup on this machine
- POP polygons remain intentionally out of scope until real geometry exists

## Next Step
- Start PostgreSQL and backend locally, run API health checks, then complete one real-data browser smoke test across map hover/state select/POP select.

---

# Handover Entry — 2026-05-15 (live UX verification pass)

## Agent / Tool
Codex

## Task Completed
Ran a live/frontend UX verification pass for the fixed state info panel and made one small polish fix.

## What Passed
- Frontend dev server started successfully on `http://localhost:5173`.
- Browser verification with mocked API responses confirmed:
  - dashboard shell loads
  - territory map renders
  - state hover updates the fixed side panel
  - the panel remains in the same screen position while the cursor moves
  - helper text renders when no map scope is active
- Frontend build passed after the polish change.
- Backend syntax check passed.

## What Failed / Could Not Be Completed
- True live dashboard verification against real APIs could not be completed because:
  - Docker Desktop engine was unavailable
  - no PostgreSQL service was listening on `localhost:5432`
  - backend API endpoints on `localhost:4000` were therefore unavailable
- Because the real backend could not run, the full browser checklist against production-shaped live data still needs one final pass once PostgreSQL is available.

## Files Changed
- `frontend/src/components/MapInfoPanel.jsx`
- `PROJECT_HANDOVER.md`

## Minor Fix Made
- Unavailable POP fields in the fixed panel now render as `—` instead of `0`, preventing false precision for values not present in current POP marker data.

## Pending Work
- Re-run the full live dashboard browser checklist with PostgreSQL and backend running.
- Keep POP view centroid-only until real POP/service-area geometry exists.

## Handover Entry — 2026-05-15 (demo polish: tooltips, units, centroid note)

## Agent / Tool
Codex

## Task Completed
Added small explainer tooltips to Operations health cards, unit labels where appropriate, an executive summary line, and a POP centroid fallback note in the POP ranking panel for demo polish.

## Files Changed
- `frontend/src/components/OperationsSummaryPanel.jsx`
- `frontend/src/components/PopRankingPanel.jsx`
- `frontend/src/styles.css`

## Notes
- Tooltips are inline `title` attributes on health card info icons to keep formulas and business logic private.
- POP centroid note clarifies that polygons will follow when real geometry is available.

## Next Steps
- Build and run a quick smoke test with the backend to verify the new text renders correctly in real-data flows.

## Handover Entry — 2026-05-15 (final demo readiness)

## Agent / Tool
Codex

## Task Completed
Performed a final browser smoke test, validated demo polish (tooltips, units, executive summary, POP centroid note), prepared a stakeholder demo script, and suggested screenshots.

## Smoke Test Summary
- Dashboard loads and main UI renders at `http://localhost:5173/`.
- Status pill shows `Live` (backend reachable at `http://localhost:4000`).
- Top KPI cards visible and populated (offline sites, aging buckets, ticket gaps, Avg TAT, active engineers).
- Territory map loads; floating info card appears inside the map and remains fixed (does not follow cursor).
- State click selects a state and POP centroid markers appear; POP ranking panel renders.
- Clicking a POP row updates the `Operations Summary` panel.
- Health card explainers/tooltips present; unit labels visible for Avg TAT (hrs), Offline (sites), Tickets (tickets), Engineers (engineers). Visit productivity label present but uses frontend fallback text when data is missing.
- Executive summary line appears above the operations panel when risk data is available.
- POP centroid fallback note is visible in the POP ranking panel.
- No console errors observed during the smoke test UI interactions.

## Files Changed
- [frontend/src/components/OperationsSummaryPanel.jsx](frontend/src/components/OperationsSummaryPanel.jsx)
- [frontend/src/components/PopRankingPanel.jsx](frontend/src/components/PopRankingPanel.jsx)
- [frontend/src/styles.css](frontend/src/styles.css)

## Demo Script
- See the `Demo Script` section in the attached handover note (also below in this entry).

## Suggested Screenshots
1. PAN India overview (top KPI cards + Executive summary)
2. State hover showing floating info card inside map
3. State selected with POP centroid markers and POP ranking panel visible
4. POP selected with updated Operations Summary Panel and health card tooltips visible
5. Ground lag / risk section showing top-risk states and funnel breakdown

## Remaining Risks
- POP polygons are not yet available; current POPs are centroid markers only.
- Some POP-level metrics (e.g., `active_engineers`, `offline_gt_3_days`) are not present in the `/api/analytics/map/offline` payload and therefore show as `—` or use frontend fallback values.
- Final full-data verification requires PostgreSQL + backend running against production-shaped data for one last smoke test.

## Next Recommended Step
- Run one last live-data smoke test with production-like DB available, capture the suggested screenshots, and rehearse the demo script once.



## Risks / Notes
- Current infrastructure on this machine prevented a real end-to-end local run.
- The fixed-panel interaction itself was verified in-browser with mocked API payloads, but real-data POP/state selection should still be smoke-tested once services are available.

---

# Handover Entry — 2026-05-15

## Agent / Tool
Codex

## Task Completed
Fixed the moving state tooltip/data panel on the territory map.

## Files Changed
- `frontend/src/components/TerritoryMapCard.jsx`
- `frontend/src/components/StateTerritoryMap.jsx`
- `frontend/src/components/MapInfoPanel.jsx`
- `frontend/src/styles.css`
- `PROJECT_HANDOVER.md`

## Behavior Changed
- Removed cursor-following state hover tooltip behavior.
- Added a fixed right-side information card inside the territory map panel.
- State hover now updates the fixed card without moving it.
- State selection keeps the selected state details visible after mouse leave.
- POP selection takes priority in the fixed card while preserving the POP ranking list.
- Back to PAN India clears selected state, selected POP, and hovered state.

## Tests Run
- `npm run build --prefix frontend` — passed
- `Get-ChildItem -Recurse -Filter *.js backend/src | ForEach-Object { node --check $_.FullName }` — passed
- `GET /api/health` — not run successfully; local backend was not available on `localhost:4000`
- `GET /api/analytics/overview` — not run successfully; local backend was not available on `localhost:4000`

## Pending Work
- Real POP polygon GeoJSON remains future work.
- POP-level `offline_gt_3_days` and `active_engineers` are still unavailable from current marker data, so the fixed card shows `—` for those POP fields.

## Risks / Notes
- State tooltip component remains in the repo but is no longer used by state hover; it may be removable later if no future design needs it.
- POP marker tooltips remain unchanged intentionally.
- Browser-only interaction checks still need a live dashboard session because the local backend was not running during validation.

---

# Handover Entry — 2026-05-14

## Agent / Tool
Claude Code (claude-sonnet-4-6) via VSCode extension

## Task Completed
Phase 2: State → POP Drilldown implemented.

When a user clicks a state on the territory map:
- POP centroid markers auto-appear (no manual toggle needed)
- The right side panel switches from a simple KPI dl-list to a scrollable POP ranking panel
- POP rows sorted by risk (critical → warning → normal), then by offline count
- Clicking a POP row or marker highlights it on the map, updates scope summary cards, and updates breadcrumb to show PAN India → State → POP
- Selected POP marker is visually distinct (orange fill, larger radius, dark border)
- Back to PAN India clears everything and hides POP markers again
- POP territory boundaries are NOT faked — centroid markers only, with a visible label

## Files Changed
- `frontend/src/components/TerritoryMapCard.jsx`
- `frontend/src/components/StateTerritoryMap.jsx`
- `frontend/src/components/LayerToggle.jsx`
- `frontend/src/components/MapBreadcrumb.jsx`
- `frontend/src/styles.css`
- `PROJECT_HANDOVER.md` (this file)

## New Files Added
- `frontend/src/components/PopRankingPanel.jsx`

## APIs Added or Changed
None. Phase 2 is frontend-only. All data comes from existing:
- `GET /api/analytics/map/offline` — 238 POP centroid markers (already has state, lat/lng, offline counts, ticket status counts, avg TAT, riskLevel)
- `GET /api/analytics/map/states` — 38 state/UT rows

## Data / Logic Changes
- `visiblePops` computed inside `TerritoryMapCard` by filtering `popMarkers` by `selectedStateKey` using existing `normalizeStateName` util
- POP scope summary derived by mapping `popMarker` fields to the `ScopeSummaryCards` expected shape (total_mapped_sites → total_sites, ticket_status_counts.OPEN → open_tickets, etc.)
- `offline_gt_3_days` is null in POP scope (not in marker data — marker has `offline_more_than_5_days` which is shown separately in PopRankingPanel)
- `active_engineers` is null in POP scope (not in marker data)

## UI Changes
- TerritoryMapCard: added selectedPop state, auto-POP-enable on state select, POP ranking panel in right side panel
- StateTerritoryMap: selected POP marker shows as orange filled, larger radius, dark border; click vs hover separated
- LayerToggle: POP markers button hidden when a state is selected (auto-managed)
- MapBreadcrumb: now shows 3 levels: PAN India → State → POP, with state clickable when POP selected
- PopRankingPanel: new scrollable list component for POP drilldown
- styles.css: added .pop-ranking-panel, .pop-ranking-list, .pop-ranking-row, .pop-row-top, .pop-row-name, .pop-row-stats, .pop-ranking-empty, .breadcrumb-link

## Tests / Validation Done
- Frontend build: `npm run build` in `frontend/` — passed
- Visual checks via code review:
  - State click path: selectedState set → showPopMarkers=true → visiblePops computed → PopRankingPanel rendered
  - POP click path: selectedPop set → ScopeSummaryCards updated → marker highlighted
  - Back path: all state cleared → showPopMarkers=false → PAN India view restored
- No backend changes — no DB risk

## Important Decisions
- **No fake POP polygons** — centroid markers only, label says "POP Centroid Markers — Territory Boundaries Pending Real GeoJSON"
- POP markers button hidden (not removed) from LayerToggle when state is selected — auto-managed
- `popMarker.offline_more_than_5_days` is used in the ranking panel (not >3 days — that field doesn't exist in marker data)
- `active_engineers` shown as "—" in POP scope cards — not available in marker data without a new API
- `onSelectPop` prop from App.jsx is still called on POP selection to keep App.jsx state in sync for future use
- Phase 1 state territory map fully preserved

## Pending Work
1. **Real POP polygon GeoJSON** — when service-area boundaries become available, replace centroid markers with real choropleth polygons
2. **Add `offline_gt_3_days` and `active_engineers` to `/api/analytics/map/offline` API** — currently the query doesn't include these; adding them would enrich the POP ranking panel
3. **Date range / state filters at API level** — filter bar exists in FilterBar.jsx but filters aren't wired to API queries yet
4. **Attendance module** — attendance_data is imported but no attendance analytics dashboard exists
5. **Engineer-level drilldown** — click engineer in POP panel → see engineer detail
6. **Fix direct cs_id joins** — some analytics still join offline_data_master to view_ticket via cs_id directly (should go through customer_site_master.oracle_site_no)
7. **Real auth** — admin key is MVP only, not production security

## Risks / Notes
- `normalizeStateName(marker.state) === selectedStateKey` is the POP → state matching logic. If state names in popMarkers don't match GeoJSON state names, some POPs may not appear in the ranking list. This uses the same utility as the GeoJSON matching — should be consistent.
- If a POP has no lat/lng in `customer_site_master`, it won't appear in `/api/analytics/map/offline` (query filters `WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL`). Those POPs are invisible in the map and ranking panel.

---

# Handover Entry — 2026-05-14 (earlier — inspection only, no code changes)

## Agent / Tool
Claude Code (claude-sonnet-4-6) via VSCode extension

## Task Completed
Read entire repo. Produced Phase 2 inspection report. No code changes made.

## Files Changed
- `PROJECT_HANDOVER.md` (created)

## Important Decisions
- Confirmed: no backend API needed for Phase 2 (all POP data in existing `/api/analytics/map/offline`)
- Confirmed: no fake POP polygons will be created

---

# Handover Entry — (before 2026-05-14) — Codex

## Agent / Tool
Codex (limit exhausted, handed over to Claude)

## Task Completed
1. TicketActivity ingestion into `visit_master`
2. Phase 1 Territory Map (state polygons, 4 layers, breadcrumb, scope cards)

## Files Changed
- `backend/src/services/analyticsService.js`
- `backend/src/routes/analyticsRoutes.js`
- `frontend/src/api.js`
- `frontend/src/App.jsx`
- `frontend/src/styles.css`

## New Files Added
- `frontend/public/geo/india-states.geojson`
- `frontend/public/geo/README.md`
- `frontend/src/components/TerritoryMapCard.jsx`
- `frontend/src/components/StateTerritoryMap.jsx`
- `frontend/src/components/LayerToggle.jsx`
- `frontend/src/components/MapLegend.jsx`
- `frontend/src/components/StateTooltipCard.jsx`
- `frontend/src/components/ScopeSummaryCards.jsx`
- `frontend/src/components/MapBreadcrumb.jsx`
- `frontend/src/components/territoryUtils.js`

## APIs Added or Changed
- `GET /api/analytics/map/states` — new, returns 38 state/UT rows

## Data / Logic Changes
- TicketActivity file → `visit_master` (2804 rows, duplicate protection working)
- `getStateMapData()` added to analyticsService — joins offline, site master, ticket, engineer, visit data at state level

## UI Changes
- Default map changed from IndiaMapPanel (marker-only) to TerritoryMapCard (state polygon territory map)
- 4 layer buttons added
- State click + zoom + breadcrumb working
- Scope summary cards (10 KPIs) added below map

## Tests / Validation Done
- Backend syntax check ✓
- Frontend build ✓
- API health ✓
- `/api/analytics/map/states` — 38 rows ✓
- `/api/analytics/map/offline` — 238 POP markers ✓
- Browser smoke test ✓
- State polygons visible ✓
- Layer button click ✓
- State click + zoom + breadcrumb ✓
- Back to PAN India ✓
- Scope cards rendered ✓
- No console errors ✓

## Validated Metrics at Handover
- Ticket but No Visit = 382 (offline sites with active ticket, no visit)
- Broader active engineer tickets without visit = 3356 (different scope — all of view_ticket)
- Map: 238 POP markers, 38 state territories
- visit_master: 2804 rows, 2715 distinct ticket_ids, 214 distinct employee_ids
- Productive engineer-days: 1550
- Visit date range: 2026-03-07 to 2026-05-14

## Important Decisions
- POP view uses centroid markers only — no fake POP polygons
- Both visit counts (382 and 3356) are valid but answer different questions
- TicketActivity → visit_master import uses duplicate protection (skip on re-import)

## Pending Work at Codex Handover
- Phase 2: State → POP drilldown (auto POP markers, POP ranking panel, POP selection)
- Date range / state filter wiring at API level
- Attendance module
- Move direct cs_id joins to oracle_site_no flow
- Real POP polygon GeoJSON

---

# Quick Reference — Current API Surface

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/health` | Health check |
| GET | `/api/analytics/overview` | Executive KPIs |
| GET | `/api/analytics/map/offline` | 238 POP centroid markers with riskLevel |
| GET | `/api/analytics/map/states` | 38 state/UT territory rows |
| GET | `/api/analytics/risk/states` | Top risk states (limit 20) |
| GET | `/api/analytics/risk/service-areas` | Top risk POPs (limit 30) |
| GET | `/api/analytics/tables/offline-without-ticket` | Offline, no ticket (limit 100) |
| GET | `/api/analytics/tables/ticket-without-visit` | Ticket, no visit (limit 100) |
| GET | `/api/analytics/tables/completed-still-offline` | Completed but still offline (limit 100) |
| GET | `/api/analytics/tables/engineer-load` | Engineer performance (limit 100) |
| GET | `/api/analytics/breakdowns` | Aging bucket + bank breakdown |
| GET | `/api/analytics/export/:name` | Excel download |
| POST | `/api/uploads` | Admin: upload file (requires x-admin-key) |
| POST | `/api/uploads/sample-folder` | Admin: ingest sample folder |

---

# Quick Reference — File Map

```
frontend/src/
  App.jsx                          — main dashboard, data fetch, layout
  api.js                           — all API calls
  styles.css                       — all styling
  components/
    TerritoryMapCard.jsx           — Phase 2: map wrapper with selectedPop, auto POP markers
    StateTerritoryMap.jsx          — Phase 2: Leaflet map, selected POP highlight
    PopRankingPanel.jsx            — Phase 2: NEW — POP list/ranking for selected state
    LayerToggle.jsx                — Phase 2: POP toggle hidden when state selected
    MapBreadcrumb.jsx              — Phase 2: 3-level breadcrumb (PAN India > State > POP)
    MapLegend.jsx                  — color scale legend
    ScopeSummaryCards.jsx          — 10 KPI cards below map, updates for POP scope

---

# Handover Entry — 2026-05-15 (Operations Summary Panel)

## Agent / Tool
Codex

## Task Completed
Implemented `OperationsSummaryPanel` and integrated it under the territory map. Adds PAN India / State / POP scoped operational summaries with clickable chips and operational health cards.

## Files Changed
- `frontend/src/components/OperationsSummaryPanel.jsx`
- `frontend/src/components/TerritoryMapCard.jsx`
- `frontend/src/App.jsx`
- `frontend/src/styles.css`

## UI Added
- PAN India Operations Summary (top-row metrics, top-risk state chips, health cards)
- State Operations Summary (state top-row, POP chips, state-level health cards)
- POP Operations Summary (POP top-row, classification chips, POP-level health cards)

## Data Used
- Offline sites (`segment = 'PSU'`, `aging_days > 2`)
- Offline > 3 days
- Ticket creation gap (offline without active engineer ticket)
- Engineer action gap (active ticket without visit)
- Visit productivity (visits per engineer when available)
- Avg TAT (ticket aging)
- Active engineers
- Total POPs
- Ticket status counts per POP

## Important Decision
Do not use reference metrics like billing, competitor, or market potential. Only operational lag, offline, ticket, visit, engineer, and TAT data are shown.

## Validation / Tests Run
- `npm run build --prefix frontend` — passed
- `npm run dev` — frontend at `http://localhost:5173`, backend at `http://localhost:4000`
- UI automation checks:
  - Operations panel renders under territory map
  - PAN India summary appears by default
  - Top-risk state chips render and are clickable
  - Clicking a top-risk state chip changes scope to State Operations Summary
  - State POP chips render and are clickable
  - Clicking a POP chip changes scope to POP Operations Summary
  - Operational health cards show 5 cards per scope
  - Missing values display as `—`

## Pending Work
- Full sweep verification for all states/POPs (sampling validated)
- Mobile layout validation
- Optional consolidation of duplicate KPI cards elsewhere

## Risks / Notes
- Frontend-only change; no backend schema or formula changes
- Normalized state keys were added client-side to ensure top-risk chips map to internal state keys

## Next Recommended Step
- Add end-to-end UI tests for state/POP selection and value assertions
- Demo to product owner with screenshots

    StateTooltipCard.jsx           — hover tooltip on state polygon
    PopTooltip.jsx                 — hover tooltip on POP marker
    SelectedPopInsight.jsx         — POP detail strip (defined, not currently rendered in App.jsx)
    territoryUtils.js              — state normalization, layer defs, metric helpers
    RiskPanels.jsx                 — risk states + risk POPs side panels
    KpiCard.jsx                    — executive KPI card
    DashboardLayout.jsx            — shell, header, filter bar
    FilterBar.jsx                  — date/state/segment filter bar
    GroundLagFunnel.jsx            — funnel: offline → ticket → visit
    EngineerProductivityCards.jsx  — engineer productivity section
    DistributionChart.jsx          — distribution charts
    DataTable.jsx                  — sortable/exportable table
    AdminAccess.jsx                — admin login + upload panel
    IndiaMapPanel.jsx              — old marker-only map (kept, not rendered)
    format.js                      — formatNumber, markerColor, riskLabel helpers

frontend/public/geo/
  india-states.geojson             — India state/UT boundaries
  README.md                        — geo data notes

backend/src/
  server.js                        — Express entry point, port 4000
  routes/analyticsRoutes.js        — all analytics GET endpoints
  routes/uploadRoutes.js           — admin upload/import POST endpoints
  services/analyticsService.js     — all SQL queries and business logic
  services/ingestionService.js     — Excel → DB parsing and insert
  db/pool.js                       — PostgreSQL pool
  config/env.js                    — environment config

database/
  schema.sql                       — PostgreSQL schema (do not change without approval)

Root:
  GUARDRAILS.md                    — non-negotiable rules — READ THIS FIRST
  ARCHITECTURE.md                  — system overview
  CODEX.md                         — full project vision and data spec
  AGENTS.md                        — agent guidance
  README.md                        — setup instructions
  PROJECT_HANDOVER.md              — THIS FILE
```

---

# Guardrails Reminder (for every agent)

Read `GUARDRAILS.md` before writing any code. Key non-negotiables:

- `cs_id` is always VARCHAR — never cast to number
- `offline_data_master`, `visit_master`, `attendance_data` are append-only
- `view_ticket` is truncate + insert (latest snapshot only)
- Offline filter: `segment = 'PSU' AND aging_days > 2`
- Active tickets: `ticket_status IN ('OPEN','PENDING','SENTBACK','SENDBACK','COMPLETED') AND ticket_assigned_type = 'Engineer'`
- Active engineers: `designation = 'Engineer' AND active_status = 'YES'`
- Do not change schema without explicit user approval
- Do not run destructive DB commands
- Do not install packages without user approval
- **Do not fake POP polygons — centroid markers only until real GeoJSON is provided**

---

# Local Dev Commands

```powershell
docker compose up -d postgres   # start DB
npm run dev                     # start frontend + backend
# Frontend: http://localhost:5173
# Backend:  http://localhost:4000/api/health
```

---

# Handover Entry — 2026-05-15 (Dashboard cleanup & duplicate KPI reduction)

## Agent / Tool
Codex

## Task Completed
Reviewed dashboard layout and removed duplicate KPI rendering from the active page flow. Validated the cleaned layout in the running dev environment.

## Files Changed
- `PROJECT_HANDOVER.md` (this entry)

## What I Kept
- Top KPI cards (executive headline metrics)
- Territory map and floating info panel
- `OperationsSummaryPanel` below the map for scope-level summaries
- Ground lag / risk panels and detailed tables below

## What I Removed / Hidden
- `ScopeSummaryCards` is no longer rendered in the active layout to avoid duplicating the same KPIs; the component file remains for potential reuse.

## UI Polish / Decisions
- Ensured good spacing between map and operations panel (`.operations-summary-panel` has margin-top and tidy padding)
- Chips and health cards aligned and responsive; missing values render as `—` to avoid misleading zeros

## Validation / Tests Run
- `npm run build --prefix frontend` — passed
- Dev servers running: frontend at `http://localhost:5173`, backend at `http://localhost:4000`
- DOM checks performed:
  - `.kpi-card` count = 6 (top KPI cards present)
  - `.operations-summary-panel` present = 1
  - `.scope-summary-section` present = 0 (no duplicate scope cards)
  - Territory map visible, ground-lag/risk panels visible, tables visible
  - No console errors observed during checks

## Remaining / Recommended Work
- Run a full sweep of all states/POPs (sampling validated). Add E2E tests for PAN → State → POP flows. Perform mobile/responsive verification.

## Next Recommended Step
- Add automated UI tests and prepare a short stakeholder demo.

---

# Handover Entry — 2026-05-15 (demo pack creation)

## Agent / Tool
Codex

## Task Completed
Created complete stakeholder demo pack: demo script, demo summary, screenshot guidance, and updated handover log.

## Files Created
- `DEMO_SCRIPT.md` — 13–16 minute presenter guide with step-by-step talking points, opening/closing, management decisions, and Q&A
- `DEMO_SUMMARY.md` — 1-page executive summary (project goals, key dashboards, metrics, demo-ready features, future scope, contact info)
- `demo-screenshots/README.md` — guidance for capturing 5 key screenshots with descriptions of what to show in each

## Demo Script Sections
1. **Opening** — Problem solved + dashboard value
2. **Territory Map** — India state map with severity coloring
3. **State Drilldown** — POP markers, ranking, Operational Health
4. **POP Detail** — Operational Health Cards with tooltips and units
5. **Management Decisions** — 3 actionable examples (ticket creation, engineer action, escalation)
6. **Ground Lag Funnel** — Visualizing work leakage
7. **Q&A Prep** — Anticipated questions and answers
8. **Checklist** — Pre-demo validation steps

## Demo Summary Contents
- Project overview (PAN India Operations Intelligence Dashboard)
- Problem solved (visibility → proactive management)
- 5 key dashboards described
- 6 key metrics with definitions
- What is demo-ready (✓ all UI components, tooltips, units, executive summary, funnel)
- Future scope (POP polygons, POP-level metrics, alerts, route planning, mobile, attendance, predictive)
- Technical stack reference
- Data freshness note
- Success metrics for demo effectiveness

## Screenshots to Capture (Guidance Provided)
1. **PAN India Overview** — KPI cards, territory map, operations summary, risk states
2. **State Hover / Floating Info** — Floating card showing state snapshot (fixed position)
3. **State Selected with POP Markers** — POP centroid markers, ranking panel, centroid note visible
4. **POP Selected with Summary** — POP Operations Summary Panel with health cards, info icons, unit labels visible
5. **Ground Lag / Risk Section** — Funnel showing offline → tickets → visits → closed, with top risk panels

## Files Changed
- `PROJECT_HANDOVER.md` (this entry)

## Validation / Tests Run
- Live smoke test on dashboard at http://localhost:5173:
  - Dashboard loads (title confirmed)
  - Status pill shows Live
  - All 6 top KPI cards visible and populated
  - Territory map renders with state color severity
  - Floating info card inside map and fixed position
  - State click → POP markers appear
  - POP ranking panel renders with 25 POPs
  - POP click → Operations Summary Panel updates
  - Health card info icons visible with tooltips
  - Unit labels visible (hrs, sites, tickets, engineers)
  - Executive summary line displays
  - POP centroid fallback note visible in ranking panel
  - Ground lag funnel scrolls into view
  - No console errors
  - UI layout clean and not cluttered

## Demo Ready Assessment
- ✓ All UI components polished and functional
- ✓ Tooltips and info icons present
- ✓ Unit labels visible
- ✓ Executive summary displays
- ✓ POP centroid note appears
- ✓ Funnel visualizes work leakage clearly
- ✓ Tables have export buttons
- ✓ No runtime errors
- ✓ Script and summary created for stakeholder handoff

## Remaining Scope (Not Demo-Blocking)
- Actual screenshot captures (guidance provided; manual capture by presenter)
- Dry run rehearsal with actual stakeholder questions
- Branded presentation deck (template provided via DEMO_SUMMARY.md + screenshots)
- Production DB validation (demo validates with sample data)

## Next Recommended Step
- **Presenter**: Review DEMO_SCRIPT.md, capture the 5 screenshots per demo-screenshots/README.md, and dry run once
- **Follow-up**: After stakeholder demo, collect feedback on feature priorities for Phase 3
