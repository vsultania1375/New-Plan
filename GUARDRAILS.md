# Project Guardrails

This project is the **PAN India Operations Intelligence Dashboard**. It ingests operational Excel/CSV exports and shows management where ground operations are lagging: offline sites, missing tickets, no visits, engineer load, and state / Service Area risk (POP = Service Area).

## Business Terminology

- POP and Service Area are the same operational unit in this dashboard.
- Use `service_area_name` as the POP / Service Area display name.
- Use `service_area_code` where available for mapping.
- Do not treat POP as a separate hierarchy unless business introduces a new mapping later.

## Non-Negotiable Data Rules

- `cs_id` must always be stored and handled as a string/VARCHAR.
- Never convert `cs_id` to a number. Values like `071` and `71` are different.
- `offline_data_master` is historical append-only.
- `view_ticket` is the latest FSM snapshot only. Refresh it with truncate + insert.
- `visit_master` is historical append-only.
- `attendance_data` is historical append-only.
- `service_area_code` may be null.
- Do not apply a site `active_status` filter yet.
- Site denominator rule: use all sites in the selected scope. Do not filter site `active_status` yet. Any `active_sites` API field is compatibility naming only.
- Show only active engineers in dashboard metrics:
  - `designation = 'Engineer'`
  - `active_status = 'YES'`

## Business Logic

- Offline management insights should use:
  - `segment = 'PSU'`
  - `aging_days > 2`
- Active ticket statuses:
  - `OPEN`
  - `PENDING`
  - `SENTBACK`
  - `SENDBACK`
  - `COMPLETED`
- `COMPLETED` is still active because approval is pending.
- `CLOSED`, `CANCELLED`, and `REJECTED` are not active.
- Use `ViewTicket.Total Visits` and `Last Visit In Date-Time` only as MVP visit signals until full visit data exists.

## Metric Formula Lock

Codex must not change these formulas without explicit user approval:

- Offline filter: `segment = 'PSU' AND aging_days > 2`
- Active tickets: `ticket_status IN ('OPEN', 'PENDING', 'SENTBACK', 'SENDBACK', 'COMPLETED') AND ticket_assigned_type = 'Engineer'`
- Active engineer filter: `designation = 'Engineer' AND active_status = 'YES'`
- Attendance status:
  - Ontime = `in_datetime <= 10:00 AM`
  - Late = `in_datetime > 10:00 AM`
  - Absent = `in_datetime IS NULL`
- Working days: selected date range excluding Sundays and holidays.
- Attendance %: `Att. Days / Working Days * 100`
- Productive Days: number of distinct days where engineer has at least one visit.
- Zero Productive Days: `Att. Days - Productive Days`
- Repeat Rate: `Total Visits / Distinct Sites`
- Offline Load: count of offline sites in engineer/service area where `segment = 'PSU' AND aging_days > 2`.
- State productivity metric: `(total visits / total number of engineers) / total working days`
- Exports must always respect applied filters.
- Formula changes require before/after validation against known sample totals and dashboard API counts.

## Join Rules

Preferred join flow:

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

- Do not directly rely on offline `cs_id` to join ticket data in new analytics.
- If existing code joins offline to tickets by `cs_id`, treat it as technical debt and fix carefully through `customer_site_master.oracle_site_no`.
- Indian Bank ATM matching needs normalization: offline `branch_code` can look like `IB ATM_ID`, while FSM ticket data has `ATM ID` directly.

## Duplicate Import Protection

- Append-only imports can duplicate data if the same file is uploaded twice.
- Codex should add duplicate prevention or ask the user before re-importing append-only files.
- Never blindly rerun sample ingestion on append-only tables.
- Suggested future protections: import batch table, `source_file + data_date` checks, row hashes, or explicit replace-by-date approval.

## Upload & Admin Rules

- Upload/import endpoints are admin-only.
- Backend upload routes require `x-admin-key`.
- Default local key is `admin123`, controlled by `ADMIN_UPLOAD_KEY` in `backend/.env`.
- Normal dashboard users should see insights only, not upload controls.

## Auth Guardrail

- The local admin/upload key is not production authentication.
- Do not treat `ADMIN_UPLOAD_KEY` as production security.
- Production auth/security changes require explicit user approval.

## Safety Rules

- Do not run destructive commands against user data unless explicitly asked.
- Do not drop/recreate database volumes casually. This deletes imported local data.
- Do not change `database/schema.sql` without confirming business impact.
- Do not run imports repeatedly without understanding append-only tables; offline and attendance imports can duplicate rows.
- Do not commit `.env`, uploaded files, generated `dist/`, or `node_modules`.

## Requires Explicit User Approval Before

- Schema changes.
- Migration changes.
- Destructive database commands.
- Data deletion.
- Import lifecycle changes.
- Metric formula changes.
- Auth/security changes.
- Package installation.
- Major UI redesign.
- Deployment changes.

## Current Known Risks

- Some analytics currently use direct `cs_id` joins between `offline_data_master` and `view_ticket`; this should be migrated to the preferred `customer_site_master -> oracle_site_no -> view_ticket` flow.
- There is no real authentication system yet; admin upload key is a local MVP gate, not production security.
- Date range/state filters are not fully implemented yet.
- Full visit history is not loaded yet, so productivity metrics are incomplete.
