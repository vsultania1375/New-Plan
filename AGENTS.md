# Agent Instructions

This repo is the **PAN India Operations Intelligence Dashboard**. Read this file before doing work.

## Always Read First

Every Codex agent must read:

- `CODEX.md` or `Codex.md` if present.
- `GUARDRAILS.md`
- `ARCHITECTURE.md`
- `AGENTS.md`
- `README.md`
- root, backend, and frontend `package.json` files.
- `database/schema.sql`
- relevant backend/frontend files for the task.

## What This App Does

The app ingests operational Excel exports and shows management where field operations are lagging:

- offline sites
- missing active tickets
- tickets without visits
- completed/sendback tickets still offline
- state / Service Area risk (POP = Service Area)
- engineer ticket load

## Business Terminology

- POP and Service Area are the same operational unit in this dashboard.
- Use `service_area_name` as the POP / Service Area display name.
- Use `service_area_code` where available for mapping.
- Do not treat POP as a separate hierarchy unless business introduces a new mapping later.

## Stack

- Root scripts in `package.json`
- Backend: `backend/`, Node.js, Express, PostgreSQL
- Frontend: `frontend/`, React, Vite, Leaflet, Recharts
- Schema: `database/schema.sql`
- Local DB: `docker-compose.yml` PostgreSQL on `5432`

## Default Working Mode

- Follow `GUARDRAILS.md`.
- Keep changes small and task-focused.
- Do not over-engineer.
- Do not modify formulas without approval.
- Do not change schema without approval.
- Do not run destructive commands.
- Ask before package installs.
- Preserve project architecture.

## Review-Only Mode

When the user says review, audit, swarm, check, inspect, or report:

- Do not modify code.
- Do not modify docs.
- Do not change schema.
- Do not install packages.
- Do not create commits.
- Only inspect and generate a report.
- Wait for user approval before implementation.

If the user explicitly asks to edit documentation, doc edits are allowed only within the requested files.

## Approval Before Changes

Codex must get explicit user approval before:

- Any schema change.
- Any formula change.
- Any destructive operation.
- Any package install.
- Any major UI redesign.
- Any auth/security change.
- Any data lifecycle change.
- Any production/deployment change.

## Commands

Install:

```powershell
npm install
npm run install:all
```

Run backend:

```powershell
npm run dev:backend
```

Backend production start:

```powershell
npm run start --prefix backend
```

Run frontend:

```powershell
npm run dev:frontend
```

Run database:

```powershell
docker compose up -d postgres
docker compose ps
docker compose stop postgres
```

Never run `docker compose down -v` unless the user explicitly approves deleting local database volumes.

Initialize DB:

```powershell
npm run db:init
```

Ingest current sample files:

```powershell
npm run ingest:sample
```

Run both apps:

```powershell
npm run dev
```

Build:

```powershell
npm run build --prefix frontend
```

Preview:

```powershell
npm run preview --prefix frontend
```

API health checks:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:4000/api/health
Invoke-WebRequest -UseBasicParsing http://localhost:4000/api/analytics/overview
```

Backend syntax check:

```powershell
Get-ChildItem -Recurse -Filter *.js backend/src | ForEach-Object { node --check $_.FullName }
```

Lint:

```text
Confirm command from package.json before running.
```

Test:

```text
Confirm command from package.json before running.
```

## Non-Negotiable Business Rules

- `cs_id` is always a string/VARCHAR. Never convert it to a number.
- `offline_data_master` is append-only.
- `view_ticket` is latest snapshot only: truncate + insert.
- `visit_master` and `attendance_data` are append-only.
- `service_area_code` can be null.
- Do not filter sites by `active_status` yet.
- Dashboard active engineers:
  - `designation = 'Engineer'`
  - `active_status = 'YES'`
- Management offline insight filter:
  - `segment = 'PSU'`
  - `aging_days > 2`
- Active ticket statuses:
  - `OPEN`
  - `PENDING`
  - `COMPLETED`
  - `SENTBACK`
  - `SENDBACK`
- `COMPLETED` is active because approval is pending.
- `CLOSED`, `CANCELLED`, and `REJECTED` are inactive.

## Required Join Direction

Preferred flow:

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

Do not add new analytics that directly join offline rows to tickets by `cs_id`. Existing direct joins are known technical debt.

## Agent Swarm Roles

### 1. Product Manager Agent

Checks:

- Product direction.
- Management usefulness.
- Whether dashboard shows ground lag clearly.
- Missing or overbuilt product features.

### 2. Data Visualization Agent

Checks:

- Whether metrics help decision-making.
- Formula correctness.
- Chart/table usefulness.
- Filters and aggregations.
- Risk of misleading management.

### 3. CTO Architecture Agent

Checks:

- Architecture safety.
- Database joins.
- Data lifecycle.
- Scalability.
- Destructive code risks.
- Security/auth risks.

### 4. Developer / QA Agent

Checks:

- Build/runtime issues.
- API issues.
- Frontend issues.
- Upload/import issues.
- Export issues.
- Bugs.
- Missing tests.

### 5. UI / UX Agent

Checks:

- Professional dashboard look.
- Management-friendly layout.
- Map-first design.
- KPI readability.
- Table readability.
- Visual hierarchy.
- Similar quality direction as: `https://market-insight-dashboard--bizcommsoulutio.replit.app/branch?region=North&branch=Punjab`

## Swarm Report Format

Each agent must report:

- Summary.
- What is correct.
- Issues found.
- Risks.
- Recommended changes.
- Approval status: `Approved`, `Approved with Changes`, or `Not Approved`.

## Upload/Admin Rules

- Upload/import APIs require `x-admin-key`.
- Local default key: `admin123`.
- Env var: `ADMIN_UPLOAD_KEY`.
- Normal users should see insights only.

## Safety Rules

- Do not delete files unless explicitly requested.
- Do not run `docker compose down -v` unless the user approves data deletion.
- Do not change schema casually; schema changes affect ingestion and analytics.
- Do not run sample import repeatedly without warning: append-only tables can duplicate data.
- Do not commit or expose `.env`.
- Preserve existing user files and uploaded spreadsheets.

## Where To Work

- Ingestion logic: `backend/src/services/ingestionService.js`
- Cleaning/parsing helpers: `backend/src/utils/normalize.js`
- Analytics queries: `backend/src/services/analyticsService.js`
- API routes: `backend/src/routes/`
- Dashboard UI: `frontend/src/App.jsx`
- Dashboard styles: `frontend/src/styles.css`
- Frontend API client: `frontend/src/api.js`

## Testing Expectations

Tests or manual validation should cover:

- `cs_id` leading zero preservation.
- Offline filter `PSU + aging_days > 2`.
- `view_ticket` snapshot behavior.
- Active ticket logic.
- Attendance status derivation.
- Engineer performance formulas.
- Exports respecting filters.
- Final joins using `oracle_site_no` through `customer_site_master`.

## Before Final Answer

For code changes, run at least:

```powershell
npm run build --prefix frontend
Get-ChildItem -Recurse -Filter *.js backend/src | ForEach-Object { node --check $_.FullName }
```

If PostgreSQL is running, also check:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:4000/api/health
Invoke-WebRequest -UseBasicParsing http://localhost:4000/api/analytics/overview
```

Report anything you could not test.
