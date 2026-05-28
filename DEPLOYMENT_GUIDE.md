# VProtect Service Dashboard Deployment Guide

This guide prepares a free public management demo using:

- Frontend: Render Static Site
- Backend: Render Web Service
- Database: Supabase Postgres free tier

This is a demo/testing setup, not final production hardening.

## Deployment Readiness Summary

### Frontend

- Framework: React + Vite
- Root directory on Render: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- API base env var: `VITE_API_BASE_URL`
- Local fallback: `http://localhost:4000`

The frontend normalizes the API base automatically:

- `VITE_API_BASE_URL=https://your-backend.onrender.com`
- calls become `https://your-backend.onrender.com/api/...`

If an old value includes `/api`, it still works:

- `VITE_API_BASE=https://your-backend.onrender.com/api`

### Backend

- Framework: Node.js + Express
- Root directory on Render: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Health check: `/api/health`
- Upload temp directory: `uploads` by default

Uploads are parsed and then temporary files are deleted. Render disk is ephemeral, so do not rely on uploaded files staying on disk. Imported data must live in Postgres.

### Database

- Recommended: Supabase Postgres free tier
- Schema source: `database/schema.sql`
- Backend env var: `DATABASE_URL`
- For Supabase SSL, set `DATABASE_SSL=true`

## Environment Variables

### Backend Render Web Service

Set these in Render:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres
DATABASE_SSL=true
CORS_ORIGIN=https://your-frontend-url.onrender.com
ADMIN_UPLOAD_KEY=<create-a-strong-demo-admin-key>
UPLOAD_DIR=uploads
```

Notes:

- `CORS_ORIGIN` can be a comma-separated list if needed.
- `FRONTEND_ORIGIN` remains supported as a backward-compatible alias.
- Do not commit real database passwords or admin keys.

### Frontend Render Static Site

Set this in Render:

```env
VITE_API_BASE_URL=https://your-backend-url.onrender.com
```

Do not include `/api` unless you intentionally want to use the older `VITE_API_BASE` style. The frontend handles either format.

## Supabase Setup

1. Create a Supabase project.
2. Open Project Settings -> Database.
3. Copy the Postgres connection string.
4. Replace the password placeholder with the real database password.
5. Open Supabase SQL Editor.
6. Run the full contents of `database/schema.sql`.
7. Confirm core tables exist:
   - `offline_data_master`
   - `customer_site_master`
   - `view_ticket`
   - `engineer_master`
   - `service_area_master`
   - `service_area_pincode_mapping`
   - `service_area_engineer_mapping`
8. Add the connection string to Render backend as `DATABASE_URL`.
9. Set `DATABASE_SSL=true`.
10. Deploy backend and check:

```text
https://your-backend-url.onrender.com/api/health
```

Expected:

```json
{
  "ok": true,
  "dbConnected": true
}
```

## Data Loading Options

For a management demo, use one of these approaches:

1. Upload files through Admin Upload after deployment.
2. Import a known database backup into Supabase.
3. Run local import scripts against Supabase only after confirming duplicate/import lifecycle rules.

Safer first demo path:

- Deploy empty schema.
- Open frontend.
- Unlock Admin Upload with `ADMIN_UPLOAD_KEY`.
- Upload the approved Excel files once.
- Confirm dashboard data.

Do not rerun append-only imports casually. `offline_data_master`, `visit_master`, and `attendance_data` are append-only.

## Render Backend Web Service

1. Create a new Render Web Service.
2. Connect the repository.
3. Set Root Directory:

```text
backend
```

4. Set Build Command:

```text
npm install
```

5. Set Start Command:

```text
npm start
```

6. Add backend environment variables from the Backend section.
7. Deploy.
8. Check:

```text
https://your-backend-url.onrender.com/api/health
```

## Render Frontend Static Site

1. Create a new Render Static Site.
2. Connect the repository.
3. Set Root Directory:

```text
frontend
```

4. Set Build Command:

```text
npm install && npm run build
```

5. Set Publish Directory:

```text
dist
```

6. Add:

```env
VITE_API_BASE_URL=https://your-backend-url.onrender.com
```

7. Deploy.
8. Open the frontend URL and confirm:
   - dashboard loads
   - status pill shows Live after backend/database are ready
   - map loads
   - Engineer Wise opens
   - Admin Upload can be unlocked with the demo key

## GeoJSON / Large File Check

Runtime files:

- `frontend/public/geo/india-states.geojson`: about 0.69 MB, required by the frontend state map.
- `geo-source/india-pincodes-opencity.geojson`: about 72.88 MB, required by backend Service Area territory APIs.

Important:

- The backend reads `geo-source/india-pincodes-opencity.geojson` from the repo at runtime.
- Keep this file available in the deployed repo for territory endpoints.
- Render should clone it as long as the file remains tracked in Git.
- The backend caches the parsed geometry in memory after first load, so the first territory request may be slower.

Deploy-size cleanup:

- `india-pincode.geojson` at the repo root was about 225.06 MB and did not appear to be used by current runtime code.
- It was moved to local archive path `archive/old-geo/india-pincode.geojson`.
- `archive/old-geo/*.geojson` is ignored so this old file should not be included in the Render deploy commit.
- Keep `geo-source/india-pincodes-opencity.geojson`; the backend needs it for Service Area territory APIs.

## CORS

Backend CORS is restricted to configured origins.

For production:

```env
CORS_ORIGIN=https://your-frontend-url.onrender.com
```

For multiple approved origins:

```env
CORS_ORIGIN=https://demo-one.onrender.com,https://demo-two.onrender.com
```

Local development remains allowed when `NODE_ENV` is not `production`.

## Security Notes For Demo

- Public dashboard URLs are readable by anyone with the link.
- Admin Upload requires `x-admin-key`.
- Do not share `ADMIN_UPLOAD_KEY` widely.
- Use a strong temporary demo admin key.
- Rotate the admin key after the demo if it was shared.
- This is not production authentication.
- Add real login/roles before production use.

## Production Health Checks

Backend:

```text
GET /api/health
```

Frontend checks:

- dashboard opens
- status pill becomes Live
- Full Report map loads
- state click works
- Service Area Profile opens
- Engineer Wise opens
- Admin Upload unlock works with the demo key
- browser console has no app-breaking errors

## Known Demo Limitations

- Render free web services can sleep after inactivity, so first request may be slow.
- Supabase free tier has resource limits; it is fine for demos, not guaranteed production capacity.
- Render filesystem is ephemeral; use Postgres as source of truth.
- Admin key is a demo gate, not production auth.
- Large GeoJSON files may increase deploy/first-request time.

## Do Not Deploy Yet Checklist

Before actual deployment, confirm:

- Supabase project exists.
- `database/schema.sql` has run successfully.
- Backend Render env vars are set.
- Frontend Render env var points to the backend URL.
- `ADMIN_UPLOAD_KEY` is strong and stored only in Render.
- Data loading plan is agreed: Admin Upload vs database backup.
- Demo audience understands this is not final production auth.
