# Business Context & Data Dictionary

Reference for business terminology, rules, and data definitions.

---

## Purpose

Convert daily operational Excel data into management-ready service visibility for Pan-India field service operations. Enable operations leaders to:
- Monitor service area (POP) risk and coverage
- Track engineer productivity and performance
- Identify offline sites and service gaps
- Make resource allocation decisions
- Report on operational metrics

---

## Key Terminology

### Core Entities

**Site / CS ID**
- Individual customer/client location
- Identified by unique CS ID
- Has online/offline status
- May have multiple field visits per day
- Belongs to one Service Area (POP)
- Located in one State

**Service Area / POP (Point of Presence)**
- Regional service cluster
- Multiple engineers assigned
- Multiple sites within boundaries
- Has service area code (e.g., "MUM_001")
- Geographic territory with polygon boundaries
- May span multiple cities in a state

**State**
- Indian state (Maharashtra, Tamil Nadu, etc.)
- Contains multiple Service Areas
- Top-level geographic grouping
- Used for regional risk assessment

**Engineer / Field Technician**
- Field service professional
- Assigned to specific Service Area(s)
- Responsible for site visits and ticket resolution
- Has manager (Reporting Manager 2)
- Tracked for productivity and attendance
- Has operational risk score

**Ticket**
- Service request / work order
- Has lifecycle: OPEN → PENDING → COMPLETED → CLOSED/SENDBACK
- Assigned to engineer
- Related to specific site/CS ID
- Tracked for TAT (turnaround time)
- May be linked to site being offline

**Visit / Activity**
- Field engineer visit to a site
- Logged with date, time in, time out
- Linked to ticket (may be no-ticket visits)
- Tracked for visit patterns and gaps
- Used to measure productivity

---

## Key Metrics

### Offline Metrics

**Offline Sites**
- Number of sites currently offline (no connectivity)
- Calculated as: sites with status = offline
- Critical KPI for operations

**Offline %**
- Percentage of total mapped sites that are offline
- Formula: (offline_sites / total_sites) * 100
- Used to assess Service Area health
- Color-coded for severity

**Offline > 3 Days**
- Sites offline for more than 3 consecutive days
- Indicates aging/escalated issues
- Tracked separately from current offline count

**Offline > 5 Days**
- Sites offline for more than 5 consecutive days
- High priority for intervention

### Ticket Metrics

**Open Tickets**
- Tickets in OPEN status
- Active, unstarted work
- Indicator of backlog

**Pending Tickets**
- Tickets in PENDING status
- In-progress work
- Being actively worked

**Completed Tickets**
- Tickets completed by engineer
- Work finished, awaiting closure

**Closed Tickets**
- Final CLOSED status
- Work completed and closed

**Ticket But No Visit**
- Count of active tickets with zero field visits
- Indicates delayed engineer response
- Shows "Engineer Action Lag"

**Offline But No Ticket**
- Sites that are offline but have no active ticket created
- Shows "Ticket Creation Lag"
- Gap between detection and response

**Completed Still Offline**
- Sites where ticket was completed/closed but site is still offline
- May indicate incomplete resolution or system data lag

### Engineer Productivity Metrics

**Attendance Days**
- Days engineer was marked present (last 30 days)
- Based on daily clock-in records

**On-Time Attendance Days**
- Days engineer arrived on-time (last 30 days)
- Before scheduled start time

**Late Attendance Days**
- Days engineer arrived late
- After scheduled start time

**Productive Days**
- Days with at least one site visit
- Indicates active engagement
- Last 30 days

**Zero Productive Days**
- Days with no site visits
- Indicator of low productivity
- Last 30 days

**Visits Last 30D**
- Total number of site visits in last 30 days
- Key productivity metric
- Higher is better

**Repeat Visit Rate / Avg Repeat Visit Gap**
- Average number of days between visits to same site
- Lower is better (more frequent coverage)
- Indicates responsiveness

**Offline %**
- Percentage of assigned sites currently offline
- Engineer responsibility metric
- High % indicates area coverage issues

### Operational Risk Score

**Engineer Score**
- Calculated metric combining:
  - Productivity (visits)
  - Responsiveness (repeat visit gap)
  - Attendance (on-time %)
  - Coverage (offline % in service area)
- Scale: 0-100 (higher is better)
- Used for risk assessment
- **NOT** HR performance evaluation

**Risk Classification**
- **Good** (Green): Score > 70
- **Normal/Warning** (Yellow): Score 40-70
- **Critical** (Red): Score < 40
- Based on offline % and service area health

### TAT (Turnaround Time)

**Avg TAT / Avg Ticket Aging**
- Average number of days from ticket creation to closure
- Measured in days
- Lower is better
- Used to track speed of resolution
- May differ by report (avg_tat vs avg_ticket_aging field names)

---

## Business Rules & Important Notes

### Manager Assignment
- **Reporting Manager 2** = Responsible manager for engineer/site
- **Reporting Manager 1** = Ignored (not used in dashboards)
- Manager responsibility for performance monitoring

### Site Denominator
- Always use ALL sites in selected scope
- **Do NOT filter by customer_site_master.active_status yet**
- All mapped sites counted, regardless of current status
- Future enhancement: may filter by active status

### Data Freshness
- Updated daily from operational imports
- Last import timestamp shows data recency
- Based on previous day's transactions
- May have 12-24 hour lag

### Offline Detection
- Automatically detected when no heartbeat received
- System monitoring triggers offline flag
- May be caused by: network issues, power loss, system failure
- Cleared when connectivity restored

### Service Management vs HR
- **Operational Risk Score** = Service coverage/responsiveness metric
- **NOT** HR performance evaluation tool
- Used for: Resource allocation, risk management, service planning
- Not used for: Salary, promotion, termination decisions

### Territory Coverage
- Service Area boundaries defined by polygon geometries
- May not match strict geographic boundaries
- Used for visual representation on map
- Some areas may have overlapping coverage (TBD)

---

## Data Model Notes

### Key Assumptions
1. Engineer can be assigned to multiple Service Areas
2. Site belongs to exactly one Service Area
3. Service Area belongs to exactly one State
4. Engineer has one primary manager (Reporting Manager 2)
5. Ticket is assigned to one engineer
6. Visit is logged for one engineer and one site

### Data Quality Issues (Known)
1. Some engineers may have no assigned service area
2. Some sites may be unmapped or missing location
3. Historical data may have gaps
4. Offline detection has false positives
5. Some visits may not be linked to tickets

### Calculated Fields
- All percentages rounded to nearest integer
- All averages rounded to 2 decimals
- All counts use thousand separators in display
- Null values shown as "—" (em dash)

---

## Report Types

### Full Report
**Purpose:** Executive overview and detailed drill-down
**Contains:**
- Pan-India territory map with state interaction
- State severity classification
- Service Area ranking when state selected
- Service Area polygon boundaries on map
- KPI cards (top-level metrics)
- Operations summary (detailed table)
- Charts: Offline distribution, aging buckets, bank load
- Detail tables: Engineer load, service area risk, offline without ticket, ticket without visit, completed still offline, state risk

**Key Features:**
- Map is interactive (click state → service areas)
- Click Service Area → Inline info panel
- Export available on detail tables
- Filter by state/service area

### State Wise Report
**Purpose:** Analyze specific state performance
**Contains:**
- Table of all states with key metrics
- Columns: Offline sites, aging days, tickets, engineers, TAT
- Click state → State detail modal

**Key Metrics:**
- Offline sites count
- Offline > 5 days count
- Offline without ticket count
- Average offline aging
- Active engineers
- Total service areas

### Engineer Wise Report
**Purpose:** Monitor engineer productivity and performance
**Contains:**
- Table of all engineers with detailed metrics
- Click engineer → Engineer Profile modal
- Search by: Name, ID, Service Area, Manager
- Filter by: State, Service Area, Manager, Risk, Zero productive days

**Key Metrics:**
- Attendance (on-time, late, total days)
- Productivity (productive days, zero productive days)
- Visits last 30 days
- Repeat visit gap (days between visits)
- Offline % (service area responsibility)
- Open/pending tickets
- Operational risk score
- Risk classification (Good/Warning/Critical)

**Engineer Profile Modal Contains:**
- Contact info: Phone, Email
- Assignment: Service Area, Service Area Code, Manager
- Attendance metrics (last 30 days)
- Service area responsibility (coverage, offline %, tickets)
- Calendar: Last 30 days site visits by day
- Histogram: Visits by hour of day
- Recent visits: Table of last 30 visits with ticket, site, times

### Customer Wise Report
**Purpose:** Customer/bank level visibility (not yet configured)
**Status:** Placeholder
**Future:** Similar structure to State Wise but by customer/bank

### Admin Data Health
**Purpose:** Data import validation and coverage audit
**Admin Only:** Requires admin key
**Contains:**
- Import history table
- Data quality metrics
- Coverage verification
- Site mapping status

---

## Key Scenarios

### Scenario 1: High Offline Load in Service Area
**Problem:** Service Area shows 45% offline sites
**Investigation:** Look at Engineer Wise for that area
- Which engineers assigned?
- Are they active (visits > 0)?
- What's their repeat visit gap?
- Are tickets being created for offline sites?
**Action:** Increase engineer capacity, check for coverage gaps

### Scenario 2: Tickets Without Visits
**Problem:** 50 tickets created but no engineer visits
**Investigation:** Territory Map and Engineer Wise
- Which service areas/states affected?
- How many visits overall in those areas?
- What's the repeat visit gap?
**Action:** Check engineer availability, resource allocation, skill match

### Scenario 3: Engineer High Productivity but High Offline
**Problem:** Engineer has 200 visits but 60% offline in service area
**Investigation:** Engineer Profile modal
- Are visits spread across all assigned sites?
- What's the repeat visit gap?
- Are there untouched sites?
**Action:** Rebalance territory, add resource, check for coverage dead zones

### Scenario 4: Offline Site But Completed Ticket
**Problem:** Site is offline but was just marked completed
**Investigation:** Detail Tables and Service Area Profile
- When was ticket completed?
- When did site go offline?
- Is it a system sync issue?
**Action:** Check data quality, verify site status, might be monitoring lag

---

## Performance Targets (Example)

These are typical targets; actual may vary by deployment:

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Offline % | < 2% | 2-5% | > 5% |
| Offline > 3 Days | < 50 | 50-100 | > 100 |
| Ticket but No Visit | < 5% | 5-10% | > 10% |
| Offline but No Ticket | < 5% | 5-10% | > 10% |
| Avg Repeat Visit Gap | 7 days | 10 days | 14+ days |
| Engineer Score | > 70 | 40-70 | < 40 |
| Avg TAT | 5 days | 7 days | 10+ days |

---

## User Roles & Permissions

### Operations Manager
- View all reports
- Access Full Report, State Wise, Engineer Wise, Customer Wise
- Export data
- No admin functions

### Service Leader / Director
- Same as Operations Manager
- Access to executive summary
- May have filtered view by region/area

### Administrator
- All permissions
- Access Admin Data Health
- Import/sync data
- User management

---

## Integration Points

### Data Sources
- **Daily operational imports:** Excel files with visit/ticket/attendance data
- **Site master:** Customer site information, location data
- **Map service:** OpenStreetMap tiles + custom polygon overlays
- **Manager database:** Employee-manager relationship data

### Data Outputs
- CSV export of tables
- No PDF export currently
- No API for external integration (internal dashboard only)

---

## Future Enhancements (Not in Current Scope)

- Customer/Bank level filtering
- Mobile app for field engineers
- Real-time alerts
- Predictive offline risk
- Machine learning for resource optimization
- Multi-language support
- Dark mode
- Custom report builder
- Advanced filtering/saved views
- Email alert subscriptions

---

End of Business Context.
