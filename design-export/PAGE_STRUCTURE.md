# Page Structure & Navigation Flow

Detailed breakdown of each page and section in the dashboard.

---

## Main Navigation

### Top Header (Fixed at top, scrolls away)
```
[Logo Image] SERVICE INTELLIGENCE | Dashboard     [Live Pill] [Admin Upload]
```
- **Logo:** PNG image, left side
- **Label:** "SERVICE INTELLIGENCE" (uppercase, gray)
- **Title:** "Dashboard" (main heading)
- **Status Pill:** Colored indicator (Live/Partial/Offline/No Data)
- **Admin Panel:** Upload button (if authenticated with key)
- **Fixed positioning:** No, scrolls normally with page
- **Height:** ~52px

### Report Tabs (Fixed at top, always visible)
```
[Full Report] [State Wise] [Engineer Wise] [Customer Wise]
```
- **Tab style:** Underline indicates active tab (bottom border 2px navy)
- **Tab height:** ~54px
- **Fixed positioning:** Yes, stays at viewport top
- **Background:** Glass effect with blur
- **Interaction:** Click to switch reports (content updates below)

---

## Page 1: Full Report

**URL/Route:** `/` or `activeReport === 'full'`

### Page Structure
```
┌─────────────────────────────────────────────┐
│ Header + Tabs (Fixed)                       │
├─────────────────────────────────────────────┤
│ Status Card (API Health)                    │ ~60px
├─────────────────────────────────────────────┤
│ Territory Map Card                          │ ~700px
│  ├─ Pan-India map with states               │
│  ├─ State interaction/drill-down            │
│  ├─ Bottom-left legend + info panel         │
│  └─ Right side panel (POP ranking)          │
├─────────────────────────────────────────────┤
│ V3 Command Center                           │ ~150px
│  ├─ KPI Cards (6 cards)                     │
│  └─ Operations Summary table                │
├─────────────────────────────────────────────┤
│ Charts Section                              │ ~300px
│  ├─ Offline Aging Buckets (Pie chart)      │
│  └─ Offline Load by Bank (Bar chart)        │
├─────────────────────────────────────────────┤
│ Detail Tables (6 tables)                    │ Variable
│  ├─ Engineer Performance / Load             │
│  ├─ Service Area Detail                     │
│  ├─ Offline But No Active Ticket            │
│  ├─ Ticket But No Visit                     │
│  ├─ Completed/SENDBACK Still Offline        │
│  └─ Top Risk States                         │
└─────────────────────────────────────────────┘
```

### Section Breakdown

#### Status Card
- **Content:** API health status message
- **States:**
  - "Live" → All data loaded successfully
  - "Partial" → Some API calls failed, partial data
  - "Offline" → Database not connected, no data
  - "No Data" → System running but no data available
- **Show failures:** If partial, lists which APIs failed
- **Height:** ~60px
- **Styling:** Colored background based on status

#### Territory Map Card
**Component:** `TerritoryMapCard`
- **Map:** Leaflet with OSM tiles
- **Layers:**
  - State regions (colored by offline %)
  - Service Area polygons (when state selected)
  - POP markers (clickable, when enabled)
- **State Interaction:**
  - Hover shows tooltip
  - Click selects state
  - Selected state highlights and shows POP ranking on right
- **Legend:** Bottom-left corner, color scale (0-100% offline)
- **Info Panel:** Bottom-left, shows selected state/POP info
- **Right Panel:** POP ranking for selected state
  - Click POP → Drill down to POP detail
  - Shows offline sites, tickets, TAT, risk badge

#### V3 Command Center
**Component:** `V3CommandCenter`
- **Top Section:** KPI Cards (6 cards in responsive grid)
  - Total Sites, Offline Load, Offline but No Ticket
  - Ticket but No Visit, Avg TAT, Field Force
- **Bottom Section:** Operations Summary
  - Large table with top-level metrics
  - Shows online/offline breakdown, ticket status, engineer count

#### Charts Section
**Component:** `ChartsSection`
- **Left Chart:** Offline Severity (Aging Buckets)
  - Pie chart showing bucket distribution
  - 7 colors for different aging ranges
- **Right Chart:** Offline Load by Bank
  - Horizontal bar chart
  - Top banks by offline count
  - 8 banks shown

#### Detail Tables (6 tables in scrollable section)
**Component:** `DetailTables`

**Table 1: Engineer Performance / Load**
- **Columns:** Engineer Name, State, Active Tickets, Visits, Avg TAT
- **Shows:** Engineer workload and productivity
- **Sortable:** May be sortable
- **Exportable:** CSV export button

**Table 2: Service Area Detail**
- **Columns:** Service Area, State, Offline Sites, >5 Days, Active Tickets
- **Shows:** Service Area health status
- **Indicates:** Which areas need attention

**Table 3: Offline But No Active Ticket**
- **Columns:** CS ID, Site Name, State, Aging Days, Service Area
- **Shows:** Sites offline without ticket (gap in response)
- **Indicates:** Ticket creation lag
- **Purpose:** Find sites needing ticket creation

**Table 4: Ticket But No Visit**
- **Columns:** Ticket ID, CS ID, State, Ticket Status, Assigned Engineer
- **Shows:** Tickets without engineer visits
- **Indicates:** Engineer response lag
- **Purpose:** Find tickets needing attention

**Table 5: Completed/SENDBACK Still Offline**
- **Columns:** Ticket ID, CS ID, Ticket Status, Offline Aging Days, Engineer
- **Shows:** Resolved tickets but site still offline
- **Indicates:** Data quality or incomplete resolution
- **Purpose:** Identify unresolved issues

**Table 6: Top Risk States**
- **Columns:** State, Offline Sites, >5 Days, No Ticket, Avg Aging
- **Shows:** States with highest risk
- **Indicates:** Which states need focus
- **Sortable:** By offline count (descending)

---

## Page 2: State Wise Report

**URL/Route:** `activeReport === 'state'`

### Page Structure
```
┌─────────────────────────────────────────────┐
│ Header + Tabs (Fixed)                       │
├─────────────────────────────────────────────┤
│ Hero Panel                                  │ ~80px
│ "State Wise Report"                         │
│ "List of all states with key metrics"       │
├─────────────────────────────────────────────┤
│ State Table                                 │ Scrollable
│ [Search] [Filters]                          │
│ ┌─────────────────────────────────┐         │
│ │ State | Offline | >5D | Tickets │         │
│ │ ...                             │         │
│ └─────────────────────────────────┘         │
│ (Click row → State detail modal)            │
└─────────────────────────────────────────────┘
```

### Components

#### Hero Panel
- **Title:** "State Wise Report"
- **Subtitle:** "List of all states with key metrics"
- **Styling:** Light background panel with heading

#### State Table
**Component:** `StateWiseReport`
- **Columns:**
  - State (text)
  - Offline Sites (number)
  - Offline > 5 Days (number)
  - Offline Without Ticket (number)
  - Avg Offline Aging (days)
- **Sorting:** Default by state name
- **Search:** By state name
- **Click Row:** Opens state detail modal
- **Export:** CSV button

#### State Detail Modal
- **Size:** 1120px wide, 88vh tall
- **Sections:**
  1. Summary metrics (grid)
  2. Offline breakdown (online vs offline)
  3. Ticket status breakdown
  4. Service area ranking (in state)
  5. Engineer coverage (in state)
- **Close:** ESC key or close button

---

## Page 3: Engineer Wise Report

**URL/Route:** `activeReport === 'engineer'`

### Page Structure
```
┌─────────────────────────────────────────────┐
│ Header + Tabs (Fixed)                       │
├─────────────────────────────────────────────┤
│ Hero Panel                                  │ ~80px
│ "Engineer Wise Report"                      │
│ "Attendance, productivity, visits, load"    │
├─────────────────────────────────────────────┤
│ Summary Cards (6 KPI cards)                 │ ~92px
├─────────────────────────────────────────────┤
│ Engineer Table Panel                        │ Scrollable
│ [Search] [Filters]                          │
│ ┌─────────────────────────────────┐         │
│ │ Engineer | ID | State | Score | │         │
│ │ ...                             │         │
│ └─────────────────────────────────┘         │
│ (Click row → Engineer Profile modal)        │
└─────────────────────────────────────────────┘
```

### Components

#### Hero Panel
- **Title:** "Engineer Wise Report"
- **Subtitle:** "Attendance, productivity, visits, and owned Service Area load"

#### Summary Cards (6 KPI cards)
- **Total Engineers:** Count
- **Active Engineers:** With visits > 0 (last 30 days)
- **Avg Operational Score:** Average score (0-100)
- **Critical Engineers:** Score < 40
- **Zero Productive Days:** Count of engineers with no-visit days
- **Visits Last 30 Days:** Total visits across all engineers

#### Search & Filters
- **Search:** Engineer name, ID, Service Area
- **Filters:**
  - By State (dropdown)
  - By Service Area (dropdown)
  - By Manager (dropdown)
  - By Risk (Good/Warning/Critical)
  - Zero Productive Days only (checkbox)

#### Engineer Table
**Component:** `EngineerWiseReport`
- **Columns (15 total):**
  1. Engineer Name
  2. Engineer ID
  3. State
  4. Service Area
  5. Manager
  6. Attendance Days
  7. On-time Days
  8. Late Days
  9. Productive Days
  10. Visits Last 30D
  11. Avg Repeat Visit Gap
  12. Offline %
  13. Open / Pending Tickets
  14. Operational Score
  15. Risk Badge
- **Sorting:** By score (ascending) then by name
- **Click Row:** Opens Engineer Profile modal

#### Engineer Profile Modal
**Component:** `EngineerProfileModal`
- **Size:** 1120px wide, 88vh tall, scrollable
- **Animation:** Fade-in + slide-up
- **Overlay:** Semi-transparent dark background
- **Close:** ESC key, close button, or click outside

**Sections (in order):**

1. **Header**
   - Engineer name (large)
   - Engineer ID + State (small)
   - Risk badge (right side)
   - Close button (top right)

2. **Contact & Assignment**
   - Phone number
   - Email address
   - Service Area name
   - Service Area code
   - Manager name
   - Manager source ("Reporting Manager 2")

3. **Attendance & Productivity (Last 30 Days)**
   - Attendance Days (neutral tone)
   - On-Time Days (good tone, green)
   - Late Days (warning tone, orange)
   - Productive Days (good tone, green)
   - Zero Productive Days (warning tone, orange)
   - Visits Last 30D (neutral tone)
   - Avg Repeat Visit Gap (neutral tone, days)

4. **Service Area Responsibility**
   - Total Sites (neutral)
   - Offline Sites (warning)
   - Offline % (warning)
   - Open Tickets (neutral)
   - Pending Tickets (warning)
   - Operational Risk Score (neutral)

5. **Site Visits by Day (Calendar)**
   - Date range header (e.g., "23 Apr 2026 – 22 May 2026")
   - Weekday headers (Mon-Sun)
   - 7-column grid with day cells
   - Each day shows: Date + visit count (e.g., "3 sites" or "No visit")
   - Colors: Green tint if visits > 0, gray if 0 visits
   - Purpose: Show visit distribution across last 30 days

6. **Visit Timing (Histogram)**
   - 24 bars (one per hour)
   - Bar height = number of visits in that hour
   - Label = hour (0-23)
   - Purpose: Show when engineer typically visits

7. **Recent Visits (Table)**
   - Columns: Date, Time In, Time Out, Ticket ID, CS ID, Site/Service Area
   - Last 30 visits shown
   - Scrollable if many visits

---

## Page 4: Customer Wise Report

**URL/Route:** `activeReport === 'customer'`

### Current Status
- **State:** Placeholder (not configured yet)
- **Content:** "This report will be configured later."
- **Component:** `ReportPlaceholder`

### Future Structure (Similar to State Wise)
- Likely: Table by customer/bank
- Columns: Similar to state (offline, aging, tickets)
- Interaction: Click customer → Detail modal
- Purpose: Customer-level visibility

---

## Page 5: Admin Data Health

**URL/Route:** `activeReport === 'dataHealth'` (Admin only)

### Visibility
- **Visible only if:** User provides correct admin upload key
- **Access:** Via admin login button in header

### Page Structure
```
┌─────────────────────────────────────────────┐
│ Header + Tabs (Fixed)                       │
├─────────────────────────────────────────────┤
│ Admin Upload Panel                          │ Interactive form
│ (File upload, validation, import status)    │
├─────────────────────────────────────────────┤
│ Territory Coverage Audit                    │ Main content
│ (Import history, data quality, validation)  │
└─────────────────────────────────────────────┘
```

### Components

#### Admin Upload Panel
- **Purpose:** Upload daily operational Excel
- **Form fields:**
  - File picker (drag-drop or browse)
  - Submit button
- **Validation:**
  - File format check (Excel)
  - Required columns validation
  - Data type checking
- **Status:**
  - In-progress spinner
  - Success/error messages
  - Failure details if errors found

#### Territory Coverage Audit
- **Purpose:** Verify data quality and import status
- **Shows:**
  - Import history (latest imports)
  - Site coverage (mapped vs unmapped)
  - Data validation results
  - Missing/invalid records
- **Table columns:** May include import date, status, records processed, errors, warnings
- **Export:** Results available for download

---

## Modal Specifications

### Modal Behavior (All Modals)
- **Overlay:** Click outside closes modal
- **Close Button:** Top-right X button
- **Keyboard:** ESC key closes
- **Focus:** First focusable element gets focus on open
- **Animation:** Fade-in (overlay) + slide-up (modal)
- **Z-index:** 5000 (above all fixed elements)

### State Detail Modal
- **Size:** 1120px max width, 88vh max height
- **Content:** State-level aggregated metrics
- **Scrollable:** If content exceeds height
- **Sections:** Summary, breakdown tables, service area ranking

### Engineer Profile Modal
- **Size:** 1120px max width, 88vh max height
- **Content:** 6 sections as described above
- **Scrollable:** Sections scroll independently
- **Sticky header:** Engineer name always visible while scrolling

---

## Responsive Behavior

### 1366px+ (Desktop)
- Full width, all columns visible
- 6 KPI cards per row
- 2-column layouts (map + sidebar)
- Tables with all columns visible
- Modals at max-width 1120px

### 1080px (Tablet)
- Side margin 18px
- 4-5 KPI cards per row
- Tables may have reduced columns
- Modals at 90vw width
- Some grids switch to single column

### 720px (Mobile)
- Side margin 14px
- 1-2 KPI cards per row (or full width)
- Tables with horizontal scroll
- Modals full-width with padding
- Single column layouts
- Tabs with overflow-x scroll

---

## Navigation Patterns

### Click Flows

**Full Report → Territory Map → Service Area:**
1. User clicks state on map
2. Map shows selected state, POP ranking appears on right
3. User clicks POP from ranking list
4. Map shows POP detail, inline info panel updates
5. User can click POP marker on map or ranking item

**Full Report → Detail Tables → Engineer:**
1. User sees engineer load table
2. User clicks engineer row
3. Opens Engineer Wise Report
4. Finds engineer in table
5. Opens Engineer Profile modal

**Engineer Wise Report → Engineer Table → Modal:**
1. User searches/filters engineers
2. Clicks engineer row
3. Engineer Profile modal opens
4. Can view all detail sections
5. Close modal to return to table

---

## Empty/Error States

### Loading State
- **Text:** "Loading [Section]…"
- **No spinner/animation currently shown**
- **Appears:** While API calls in progress

### Error State
- **Text:** Red error message with details
- **Example:** "Engineer detail could not load"
- **Appears:** When API call fails

### Empty Data
- **Null values:** Shown as "—" (em dash)
- **No data:** Shows "—" in cells
- **No special empty state design currently**

### API Status Indicator
- **Location:** Top right of header
- **States:**
  - Green pill: "Live" (all systems working)
  - Yellow pill: "Partial" (some APIs failed) + failure list
  - Red pill: "Offline" (database unreachable)
  - Gray pill: "No Data" (system running, no data)

---

## Key Interaction Patterns

### Hover Effects
- **Tables:** Row background highlights light blue
- **Buttons:** Color change to darker shade
- **Cards:** Subtle shadow increase (optional)
- **Links:** Underline appears or color change

### Click Effects
- **Tables:** Select row, may show additional info
- **Buttons:** Immediate feedback (disable during action)
- **Maps:** Selection highlight, popup info
- **Cards:** Open detail modal or navigate

### Search/Filter Patterns
- **Real-time:** Filter as user types
- **Dropdowns:** Click to open, click item to select
- **Checkboxes:** Toggle on/off
- **Clear:** Button to reset all filters

---

End of Page Structure Documentation.
