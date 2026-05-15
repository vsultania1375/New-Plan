# PAN India Operations Dashboard

Full-stack MVP for ingesting FSM/offline Excel exports and showing management-level ground lag analytics.

## Stack

- Backend: Node.js, Express, PostgreSQL
- Frontend: React, Vite, Leaflet, Recharts
- Data ingestion: Excel parsing with `xlsx`

## Quick Start

1. Install dependencies:

```powershell
npm install
npm run install:all
```

2. Create backend env:

```powershell
Copy-Item backend\.env.example backend\.env
```

3. Update `backend\.env` with your PostgreSQL details.

4. If PostgreSQL is not already running, start the included database:

```powershell
docker compose up -d postgres
```

5. Initialize schema:

```powershell
npm run db:init
```

6. Ingest the current Excel files from this folder:

```powershell
npm run ingest:sample
```

Warning: offline, attendance, and visit imports are append-only. Do not rerun sample ingestion casually against an already-populated local database or duplicate historical rows may be created.

7. Start app:

```powershell
npm run dev
```

If you prefer separate terminals:

```powershell
docker compose up -d postgres
npm install --prefix backend
npm install --prefix frontend
npm run dev --prefix backend
npm run dev --prefix frontend
```

Useful startup checks:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:4000/api/health
Invoke-WebRequest -UseBasicParsing http://localhost:4000/api/analytics/overview
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000/api/health

## MVP Coverage

- Reads `B2B Offline DD-MM-YYYY.xlsx` from `B2B` sheet, header row 2.
- Preserves `cs_id` as text.
- Loads `ViewTicket`, `CustomerSiteMaster`, `EmployeeMaster`, `ServiceAreaMaster`, and `AttendanceReport`.
- Treats active ticket statuses as `OPEN`, `PENDING`, `COMPLETED`, `SENTBACK`, and `SENDBACK`.
- Computes offline lag, missing active engineer tickets, service-area risk, and engineer load.
- Upload/import endpoints are admin-only. The default admin key is `admin123`; change `ADMIN_UPLOAD_KEY` in `backend\.env` before real deployment.
