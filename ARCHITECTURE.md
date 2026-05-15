# Architecture

## Overview

The app is a full-stack MVP for operational intelligence.

- Frontend: React + Vite + Leaflet + Recharts
- Backend: Node.js + Express
- Database: PostgreSQL
- Ingestion: Excel parsing with `xlsx`
- Local DB: Docker Compose service `postgres`

The dashboard shows management-level operational lag using uploaded FSM/offline exports.

## Repository Layout

```text
.
├── backend/
│   ├── src/config/env.js
│   ├── src/db/pool.js
│   ├── src/routes/
│   ├── src/services/
│   ├── src/scripts/
│   └── src/utils/
├── frontend/
│   ├── src/App.jsx
│   ├── src/api.js
│   └── src/styles.css
├── database/schema.sql
├── docker-compose.yml
└── README.md
```

## Backend Flow

- `backend/src/server.js` starts Express on port `4000`.
- `backend/src/db/pool.js` manages PostgreSQL connections.
- `backend/src/routes/uploadRoutes.js` handles admin-only uploads/imports.
- `backend/src/services/ingestionService.js` maps Excel rows into database tables.
- `backend/src/services/analyticsService.js` provides dashboard metrics, map markers, risk tables, and exports.
- `backend/src/routes/analyticsRoutes.js` exposes analytics and Excel export endpoints.

## Frontend Flow

- `frontend/src/main.jsx` mounts React.
- `frontend/src/api.js` calls backend APIs at `http://localhost:4000/api` by default.
- `frontend/src/App.jsx` renders the management dashboard:
  - admin upload gate
  - executive KPIs
  - PAN India map
  - lag funnel
  - state/POP risk cards
  - analytics tables
  - export buttons
- `frontend/src/styles.css` contains the enterprise dashboard styling.

## Database Tables

Core tables:

- `offline_data_master`: append-only offline history.
- `customer_site_master`: site master keyed by `oracle_site_no`, with `cs_id`, service area, state, and lat/long.
- `view_ticket`: latest FSM ticket snapshot, truncate + insert.
- `engineer_master`: employee/engineer details.
- `visit_master`: append-only visit history placeholder.
- `attendance_data`: append-only attendance history.
- `service_area_master`: service area mapping.
- `holiday_master`: working-day support table.

Important indexes already exist for `cs_id`, `data_date`, state, ticket status/assignment, service area, and employee/date lookups.

## Final Join Flow

Primary operational join flow:

```text
offline_data_master
    -> cs_id
customer_site_master
    -> oracle_site_no
view_ticket
    -> ticket_id
visit_master
    -> employee_id
engineer_master
    -> employee_id
attendance_data
```

Additional service area mapping:

```text
customer_site_master.service_area_code
    -> service_area_master.service_area_code
engineer_master.service_area_code
    -> service_area_master.service_area_code
```

Important: do not directly join `offline_data_master` to `view_ticket` using `cs_id` for ticket intelligence. Use `customer_site_master` and `oracle_site_no`.

Current schema vs target schema:

- Current schema stores service area names on `customer_site_master.service_area_name` and `view_ticket.service_area_name`.
- Current schema stores engineer service hints as `engineer_master.service_state` and `engineer_master.supplier_site`.
- Target architecture includes `service_area_code` on site and engineer records for cleaner 1:1 service area joins.
- Adding `service_area_code` columns to `customer_site_master` or `engineer_master` is a future schema change and requires approval.

## Data Source to Table Mapping

- `B2B Offline DD-MM-YYYY.xlsx`
  - Sheet: `B2B`
  - Table: `offline_data_master`
  - Lifecycle: append-only historical

- `customer_site_mst.csv`
  - Table: `customer_site_master`
  - Lifecycle: master reload/upsert carefully
  - Current sample file is an Excel export named like `CustomerSiteMaster (*.xlsx)`.

- `View ticket.xlsx`
  - Table: `view_ticket`
  - Lifecycle: latest snapshot, truncate + insert

- `EmployeeMaster.xlsx`
  - Table: `engineer_master`
  - Lifecycle: master reload/upsert carefully

- Visit data / `TicketActivity` file
  - Table: `visit_master`
  - Lifecycle: append-only historical
  - Current purpose: visit count only

- `AttendanceReport.xlsx`
  - Table: `attendance_data`
  - Lifecycle: append-only historical

- Service area mapping file
  - Table: `service_area_master`

- Holiday file or manual holiday config
  - Table: `holiday_master`

## API Surface

Health:

- `GET /api/health`

Uploads, admin-only:

- `POST /api/uploads`
- `POST /api/uploads/sample-folder`
- Required header: `x-admin-key`

Analytics:

- `GET /api/analytics/overview`
- `GET /api/analytics/map/offline`
- `GET /api/analytics/risk/states`
- `GET /api/analytics/risk/service-areas`
- `GET /api/analytics/tables/offline-without-ticket`
- `GET /api/analytics/tables/ticket-without-visit`
- `GET /api/analytics/tables/completed-still-offline`
- `GET /api/analytics/tables/engineer-load`
- `GET /api/analytics/breakdowns`
- `GET /api/analytics/export/:name`

## Environment Variables

Backend environment variables:

- `PORT`: backend port, default `4000`.
- `DATABASE_URL`: PostgreSQL connection string.
- `FRONTEND_ORIGIN`: allowed frontend origin, default `http://localhost:5173`.
- `UPLOAD_DIR`: temporary upload folder.
- `ADMIN_UPLOAD_KEY`: local admin key for upload/import routes.

## Local Commands

Install:

```powershell
npm install
npm run install:all
```

Start PostgreSQL:

```powershell
docker compose up -d postgres
```

Initialize schema:

```powershell
npm run db:init
```

Ingest sample files from the repo root:

```powershell
npm run ingest:sample
```

Run app:

```powershell
npm run dev
```

Open:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000/api/health`

## Current Data Assumptions

- Offline workbook uses `B2B` sheet with headers on row 2.
- `ViewTicket` is a current FSM dump, not historical data.
- Employee ID is parsed from `Ticket Assigned To` text like `Engineer Name (EMP_ID)`.
- Service area is currently mostly name-based, not code-based.
- Full route/visit planning is future work.

## MVP vs Future Scope

MVP:

- File upload.
- Data ingestion.
- Core analytics.
- Management dashboard.
- PAN India map.
- Engineer performance table: partial/currently evolving; current MVP has engineer load and ticket visit signals.
- Distribution graph: partial/currently evolving; current MVP has chart breakdowns and map analytics.
- Excel exports.

Future:

- Route optimization.
- Geo validation.
- AI route planning.
- Engineer route compliance.
- Travel distance analysis.
- Visit duration analysis.

## Current Limitations

- No migration system exists yet.
- Schema is currently initialized from `database/schema.sql`.
- Automated tests may not be configured yet.
- Real authentication is not implemented yet.
- Full visit ingestion may still need completion.
- Date/state filters may still need validation.
- Some current analytics still use direct `cs_id` joins and should move to the final join flow.

## Architecture Risks To Fix Next

- Move offline-ticket analytics from direct `cs_id` joins to `customer_site_master.oracle_site_no`.
- Add real auth/roles before production.
- Add date range/state/PAN India filters at API level.
- Add duplicate protection for append-only imports by `source_file` + `data_date` or batch ID.
- Add tests for ingestion and business metrics.
