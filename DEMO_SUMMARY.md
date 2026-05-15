# PAN India Operations Intelligence Dashboard — Demo Summary

## Project Overview

**Name:** PAN India Operations Intelligence Dashboard

**Goal:** Convert daily operational Excel/CSV exports into real-time ground operations insights for management decision-making.

**Problem Solved:**
- Management had no visibility into where field operations are lagging
- Ticket creation, engineer deployment, and escalations were reactive, not proactive
- Analysis took days; now it's instant

---

## Key Dashboards

### 1. **PAN India Overview**
- 6 KPI cards showing national-level metrics
- Territory map with state risk color-coding
- Executive summary highlighting top-risk states
- Operational Health Score with 5 key indicators

### 2. **Territory Map (State & POP Drilldown)**
- India state polygon map with severity coloring
- Click state → see POP centroid markers
- Click POP → see detailed operational health
- Breadcrumb navigation (PAN India → State → POP)

### 3. **Operations Summary Panels**
- Dynamic scope switching (PAN India / State / POP)
- Top-row summary metrics (Total Sites, Offline, TAT, Engineers)
- Risk-ranked chips (Top Risk States or POPs in State)
- Operational Health Cards with tooltips and unit labels:
  - Offline Health (sites, >3 days aging)
  - Ticket Creation Gap (offline with no ticket)
  - Engineer Action Gap (ticket with no visit)
  - Visit Productivity or Engineer Capacity
  - Resolution TAT (aging hours)

### 4. **Ground Lag Funnel**
- Shows work leakage from offline → tickets → visits → closed
- Visualizes where the biggest bottleneck is

### 5. **Risk & Performance Tables**
- Top Risk States (by offline severity + aging)
- POP / Service Area Detail (by risk and offline load)
- Offline But No Ticket (action priority list)
- Ticket But No Visit (engineer deployment priority)
- Completed/SENDBACK Still Offline (quality alerts)
- Engineer Performance / Load

---

## Key Metrics

| Metric | Definition | Example |
|--------|-----------|---------|
| Total Offline Sites | PSU sites segment offline (PSU only) | 1,430 |
| Offline >3/5 Days | Aging risk threshold | 647 sites >5 days |
| Offline without Ticket | No active FSM ticket created | 793 sites |
| Ticket without Visit | Engineer not yet visited | 382 tickets |
| Avg TAT | Average ticket aging in hours | 39.3 hrs |
| Active Engineers | Field Force (designation=Engineer, active=YES) | 210 |

---

## What is Demo-Ready

✓ **Dashboard loads** with live data from PostgreSQL  
✓ **KPI cards** show correct PAN India metrics  
✓ **Territory map** renders 38 states with color severity  
✓ **State selection** auto-enables POP markers and ranking  
✓ **POP selection** updates Operations Summary Panel  
✓ **Tooltips & info icons** on health cards explain metrics  
✓ **Unit labels** visible (hrs, sites, tickets, engineers)  
✓ **Executive summary** line displays top-risk states  
✓ **POP centroid fallback note** visible in POP ranking panel  
✓ **Ground Lag Funnel** shows the work leakage flow  
✓ **Detailed tables** with export buttons for deep analysis  
✓ **No console errors** during interactions  

---

## What is Future Scope

| Feature | Reason | Timeline |
|---------|--------|----------|
| **Real POP Polygons** | Requires GeoJSON service-area boundaries | TBD (data availability) |
| **POP-Level Metrics** | Some metrics not available in current API (e.g., `offline_gt_3_days` at POP level) | Q3 2026 |
| **Date-Range Filtering** | Filters exist but API doesn't yet support date parameters | Q2 2026 |
| **Automated Alerts** | Email/SMS when POP/state hits Critical | Q3 2026 |
| **Route Optimization** | Map-based route planning for engineer visits | Q4 2026 |
| **Mobile App** | Field manager access on mobile | Q4 2026 |
| **Attendance Integration** | Sync engineer attendance with visit records | Q2 2026 |
| **Predictive Models** | Predict offline sites before they go down | Q1 2027 |

---

## Demo Assets

- **DEMO_SCRIPT.md** — Step-by-step presenter guide (13–16 min)
- **Screenshots** — 5 key views showing PAN India, map, state drilldown, POP detail, funnel
- **This Summary** — For stakeholder handouts

---

## Technical Stack

- **Frontend:** React + Vite, Leaflet map, Recharts
- **Backend:** Node.js + Express, PostgreSQL
- **Data:** Append-only fact tables (offline_data_master, visit_master, attendance_data)
- **Schema:** Normalized joins via customer_site_master, engineer_master, service_area_master
- **Deployment:** Local Docker Compose for dev; production deployment TBD

---

## Data Freshness

- **Frequency:** Daily (via Admin Upload button)
- **Sample Data:** Latest ingestion 13-05-2026
- **Data Pipeline:** Excel → ingestionService → Database → API → Dashboard
- **Latency:** Real-time (API queries latest data on each page load)

---

## Support & Training

- **Admin Panel:** Accessible via "Admin Upload" button (requires API key)
- **Filter Bar:** Date range, state, segment filters (active once API wiring complete)
- **Export:** All tables have Excel export buttons
- **Help Text:** Hover info icons for metric explanations

---

## Success Metrics for Demo

After demo, measure:

1. **Engagement**: Did management ask questions?
2. **Understanding**: Can they name the 6 KPI cards?
3. **Use Case Clarity**: Do they see how to identify where to push action?
4. **Feedback**: What features would they want next?

---

## Recommended Next Demo Steps

1. **Expand Real Data**: Run demo against production-like operational data (if available)
2. **Refine Messaging**: Tailor decision examples to actual field pain points
3. **Capture Screenshots**: Create a branded deck with the 5 key screenshots
4. **Dry Run**: Practice once before stakeholder meeting
5. **Gather Feedback**: Take notes on questions and feature requests during demo

---

## Contact & Handover

**Dashboard Owner:** [TBD]  
**Backend Maintainer:** [TBD]  
**Frontend Maintainer:** [TBD]  

**Repo:** Local at `c:\Users\Vivek\Downloads\New Plan`  
**Dev Server:** `npm run dev` (runs backend + frontend)  
**Live Dashboard:** http://localhost:5173 (after dev server starts)
