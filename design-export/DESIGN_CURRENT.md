# PAN India Operations Intelligence Dashboard — Current Design Snapshot

**Purpose:** Document current frontend design, layout, typography, colors, and components for UI redesign.

**Version:** Current (2026-05-22)  
**Target Redesign Level:** Premium, Management-Ready, Professional, Stunning

---

## Executive Summary

The dashboard is a service operations intelligence system that converts daily operational Excel data into management-ready visibility for field service operations across India. Currently, it displays:
- Pan-India territory maps with state severity coloring
- Service Area (POP) coverage and risk ranking
- KPI metrics and operational summaries
- Engineer productivity and performance tracking
- Territory coverage audit trails

**Current state:** Functional but needs UI/UX refresh for premium, executive-ready appearance.

---

## Application Structure

### Main Layout
```
┌─────────────────────────────────────────────────┐
│  Command Header (Fixed at top)                  │  52px (scrolls away)
│  Logo | SERVICE INTELLIGENCE | Dashboard | ... │
├─────────────────────────────────────────────────┤
│  Report Tabs (Fixed at top)                     │  54px (always visible)
│  Full Report | State Wise | Engineer Wise | ... │
├─────────────────────────────────────────────────┤
│  Main Content Area (Scrollable)                 │  Min 106px from top
│  Maps, tables, KPIs, modals, panels             │  
│                                                  │
└─────────────────────────────────────────────────┘
```

### Page Sections (Full Report)
1. **Header** — Logo + title + status + admin
2. **Tabs** — Navigation between report types
3. **Status Card** — API health indicator
4. **Territory Map Card** — Pan-India map with state interaction
5. **Command Center** — KPI cards + operations summary
6. **Charts Section** — Aging buckets pie, offline by bank bar
7. **Detail Tables** — Engineer load, service area, offline sites, tickets, etc.

---

## Current Color Palette

### Brand Colors
- **Navy (Brand):** `#253247` / `var(--brand-navy)` — Primary text, active states
- **White:** `#ffffff` — Backgrounds, surfaces
- **Muted Gray:** `#64748b` — Secondary text, labels

### Status/Semantic Colors
- **Green (Good):** `#10b981` / `var(--green)` — Positive metrics, productivity
- **Red (Critical):** `#dc2626` — Offline, risk, critical alerts
- **Orange (Warning):** `#f97316` — Caution, pending, warning states
- **Yellow (Aging):** `#f59e0b` — Aging, medium risk
- **Blue (Info):** `#2563eb` — Information, neutral metrics

### Surface Colors
- **White:** `#ffffff` — Card backgrounds
- **Light Gray:** `#f8fafc` — Panel backgrounds, alternating rows
- **Very Light:** `#f1f5f9` — Hover states
- **Border Line:** `rgba(148, 163, 184, 0.22)` — Subtle separators

### Transparency
- **Header:** `rgba(255, 255, 255, 0.96)` — Slight transparency
- **Cards:** Solid white `#ffffff`
- **Modal Overlay:** `rgba(16, 35, 63, 0.5)` — Dark semi-transparent

---

## Current Typography

### Font Family
- **Primary:** System default stack (no custom font specified)
- **Fallback:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Type Scales

**Headers/Titles:**
- H1: `24px` bold, brand navy (`#253247`)
- H2: `20px` bold, brand navy
- H3: `16px` bold, brand navy
- Label (Uppercase): `12px` bold, uppercase, muted gray

**Body Text:**
- Default: `14px` regular, brand navy
- Compact: `13px` regular, brand navy
- Small: `12px` regular, muted gray
- Tiny: `11px` regular, muted gray

**Numbers:**
- Metric values: `22px` bold, brand navy
- KPI cards: `22-24px` bold
- Table data: `12-13px` regular

### Font Weights
- Bold: 700
- Semibold: 600
- Regular: 400

---

## Current Component Library

### KPI Card
- **Size:** ~140px width (auto-fit grid)
- **Height:** 92px (compact)
- **Layout:** Icon + label (12px) + value (22px bold)
- **Border:** Left 4px accent border (colored by tone)
- **Background:** Solid white
- **Shadow:** Subtle `0 2px 8px rgba(..., 0.04)`
- **Tones:** neutral, good, warning, critical

**Current KPIs:**
- Total Sites (Activity icon)
- Offline Load (AlertTriangle icon)
- Offline but No Ticket (Ticket icon)
- Ticket but No Visit (Wrench icon)
- Avg TAT (Clock icon)
- Field Force (Users icon)

### Panel / Card Container
- **Border:** 1px solid `rgba(148, 163, 184, 0.22)`
- **Background:** Solid white `#ffffff`
- **Border-radius:** 8px
- **Padding:** 20-24px
- **Shadow:** `0 2px 8px rgba(16, 35, 63, 0.04)`
- **Margin:** 12-16px

### Button / Tab
- **Default:** Transparent background, navy text `#253247`
- **Hover:** Light blue background `#f0f4ff` (estimated)
- **Active Tab:** Navy bottom border 2px, navy text
- **Height:** ~42px (tabs)
- **Padding:** 0 16px (tabs)
- **Border-radius:** 10px 10px 0 0 (tabs)

### Badge / Badge
- **Background:** Light surface with border
- **Padding:** 4px 10px
- **Border-radius:** 999px (pill-shaped)
- **Font-size:** 11px bold
- **Tones:** critical (red), warning (orange), good (green), neutral (gray)

### Table
- **Header Row:** Background `#f8fafc`, font 12px bold
- **Data Rows:** `13px` regular, alternating white
- **Border:** Bottom 1px between rows
- **Hover:** Background `#f8fbff` (light blue)
- **Max-height:** Variable (with scrollable container)
- **Padding:** 12-16px cells

### Modal / Dialog
- **Overlay:** Fixed, full-screen, `rgba(16, 35, 63, 0.5)` background
- **Modal:** Fixed, white card, max-width 1120px, max-height 88vh
- **Border-radius:** 12px
- **Padding:** 20px
- **Shadow:** `0 20px 25px -5px rgba(0, 0, 0, 0.1)`
- **Animation:** Fade-in 0.15s, slide-up 0.25s

---

## Current Feature Components

### 1. Territory Map Card
- **Map:** Leaflet map with state regions, SVG overlays
- **State interaction:** Click to drill down → Service Area ranking
- **Layers:** Service health (offline %), traffic, aging
- **Legend:** Color scale with values
- **Side panel:** POP ranking when state selected
- **Map info panel:** Hover and selected state info

### 2. Command Center
- **Purpose:** KPI cards + operations summary after map
- **Layout:** Grid of cards + detailed summary table
- **KPIs:** Same as above

### 3. Territory Coverage Audit
- **Admin only feature**
- **Purpose:** Data import validation and coverage verification
- **Layout:** Table with import results

### 4. State Wise Report
- **Table:** All states with metrics
- **Columns:** State, offline sites, aging, tickets, engineers
- **Interaction:** Click state → State detail modal
- **Search/Filter:** Enabled
- **Export:** CSV available

### 5. Engineer Wise Report
- **Table:** All engineers with productivity metrics
- **Columns:** Name, ID, state, service area, manager, attendance, productivity, visits, score, risk
- **Interaction:** Click engineer → Engineer Profile modal
- **Search/Filter:** By engineer, ID, service area, manager
- **Modal:** 
  - Contact & assignment section
  - Attendance & productivity (last 30 days)
  - Service area responsibility
  - Last 30 days visit calendar (NEW redesign)
  - Visit timing histogram
  - Recent visits table

### 6. Engineer Profile Modal
- **Size:** Max 1120px wide, 88vh tall
- **Sections:** 6 sections with organized layout
- **Calendar:** New redesign shows only visit counts per day
- **Histogram:** Visits by hour
- **Recent visits:** Table of last 30 visits

### 7. Customer Wise Report
- **Status:** Placeholder (to be configured)
- **Layout:** Same table structure as others

---

## Current Layout Grid System

### Responsive Breakpoints
- **Desktop:** 1366px+ (full width)
- **Tablet:** 1080px (adjusted padding/grid)
- **Mobile:** 720px (single column, side margins 14px)

### Grid Patterns
- **Summary Cards:** `repeat(auto-fit, minmax(140px, 1fr))` — 6 cards per row
- **Detail Tables:** Scrollable horizontal (max-height containers)
- **Map/Chart:** 2-column grid (map + side panel)
- **KPI Cards:** Same as summary

### Spacing
- **Horizontal margin:** 28px (desktop), 18px (tablet), 14px (mobile)
- **Vertical gap:** 12-20px between sections
- **Internal padding:** 16-24px within cards
- **Cell padding:** 12-16px in tables

---

## Current Navigation Flow

### Tab Structure
```
Full Report
├── Territory Map (Pan-India)
├── Command Center (KPIs)
├── Charts (Offline distribution)
└── Detail Tables (6 tables)

State Wise
├── State table
└── State detail modal

Engineer Wise
├── Engineer table
├── Engineer Profile modal
│   ├── Contact & assignment
│   ├── Attendance metrics
│   ├── Service area risk
│   ├── 30-day visit calendar
│   ├── Visit timing
│   └── Recent visits
└── Engineer profile modal

Customer Wise
└── Placeholder

Admin Data Health (if admin)
└── Coverage audit table
```

---

## Current Issues & Design Debt

### Visual/UX Issues
1. **Summary cards too compact** — 92px height, small font
2. **Table density** — Too much data, hard to scan
3. **Color usage inconsistent** — Multiple shades of similar colors
4. **Icons underutilized** — Small 16px icons, not prominent
5. **Typography hierarchy weak** — Too many similar sizes
6. **Modal not prominent enough** — Light shadows, could be bolder
7. **Map interaction unclear** — No obvious affordance to click states
8. **Calendar redesign needed** — Visit count visualization unclear before redesign

### Layout Issues
1. **Too many tables** — Six detail tables, information overload
2. **No visual breathing room** — Cards close together
3. **Consistent use of "—" for null** — Could use better visual representation
4. **Export buttons missing** — No CSV/PDF export visible on tables
5. **Filters sparse** — Limited filtering/sorting on tables

### Responsive Issues
1. **Mobile cards wrap poorly** — 6 KPI cards in single column
2. **Modal overflow on small screens** — Max-width: 90vw but still cramped
3. **Map unresponsive** — Doesn't adapt well below 1080px

---

## Current Design File Structure

### CSS Organization
```
styles.css (4200+ lines)
├── Variables & globals
├── Layout (.app-shell, .command-header, .report-tabs)
├── Typography & text utilities
├── Component styles
│   ├── KPI cards
│   ├── Panels & containers
│   ├── Tables
│   ├── Buttons & tabs
│   ├── Badges
│   └── Modals
├── Map styles
├── Chart styles
├── Status indicators
├── Animations & transitions
└── Responsive breakpoints (1366px, 1080px, 720px)
```

### Component Hierarchy
```
App
├── DashboardLayout
│   ├── CommandHeader
│   ├── ReportTabs
│   ├── DashboardStatus
│   ├── AdminUploadPanel (if admin)
│   └── [Active Report Content]
│       ├── TerritoryMapCard
│       ├── V3CommandCenter
│       ├── ChartsSection
│       └── DetailTables
└── [Other Reports]
    ├── StateWiseReport
    ├── EngineerWiseReport
    │   └── EngineerProfileModal
    ├── CustomerWiseReport
    └── TerritoryCoverageAudit
```

---

## Current Animations & Interactions

### Transitions
- **Fade in:** 0.15s ease (modals, overlays)
- **Slide up:** 0.25s ease (modals)
- **Hover state:** 0.2s ease (buttons, rows)

### Interactive Elements
- **Tables:** Hover row highlights in light blue
- **Buttons:** Hover color change
- **Tabs:** Bottom border indicates active
- **Maps:** Hover shows tooltips, click selects
- **Modals:** Click outside closes, ESC key closes

---

## Current Data Visualization

### Map
- **Type:** Leaflet with SVG overlays
- **State coloring:** Based on offline %
  - Green: < 5% offline
  - Yellow: 5-10% offline
  - Orange: 10-20% offline
  - Red: > 20% offline
- **Severity labels:** "Good", "Normal", "Warning", "Critical"

### Charts
- **Pie chart:** Offline aging buckets (7 colors)
- **Bar chart:** Offline load by bank (horizontal)
- **Colors:** Same palette (red, orange, yellow, blue, etc.)

### Tables
- **Risk badge:** Color-coded by severity
- **Metric values:** Formatted numbers with thousand separators
- **Null values:** Displayed as "—"

---

## Current States & Modes

### Loading States
- **Text:** "Loading [Section]…"
- **No icon/spinner currently**

### Error States
- **Text:** Red error message
- **Example:** "Engineer detail could not load"

### Empty States
- **Text:** "—" for null values
- **No special empty state design**

### API Status
- **Status pill:** Green (Live), Yellow (Partial), Red (Offline), Gray (No Data)
- **Location:** Top-right of header

---

## Current Accessibility Notes

### Missing Features
- No keyboard navigation documentation
- Limited ARIA labels
- Modal focus management could be better
- Color-only indicators (should have text fallback)

### What Exists
- Semantic HTML (nav, section, article, etc.)
- Alt text on images
- Button states (active, hover)
- Sufficient contrast on text (navy on white)

---

## Current Assets & Resources

### Images
- **Logo:** `/image.png` (currently in public folder)
- **Map tiles:** Leaflet OSM (OpenStreetMap)
- **Icons:** lucide-react (16px size)

### Icons Used
- Activity, AlertTriangle, Clock, Ticket, Users, Wrench (KPIs)
- MapPinned, Building2, DatabaseZap, BarChart3 (Tabs)
- Search, ChevronDown, X, Calendar, Eye, Download (Actions)
- Many more for specific features

---

## Recommended Redesign Priorities

### High Priority (Core Experience)
1. **Typography system** — Clearer hierarchy, better readability
2. **KPI cards** — Larger, more prominent, better visual hierarchy
3. **Table interaction** — Better row selection, inline actions
4. **Modal design** — Larger, more prominent, better contrast
5. **Color system** — Consistent, professional, updated palette

### Medium Priority (Polish)
1. **Spacing & layout** — Breathing room, better visual organization
2. **Navigation clarity** — Better tab/menu styling
3. **Data visualization** — Enhanced charts, better legends
4. **Responsive design** — Better mobile/tablet experience
5. **Loading states** — Skeleton screens, better spinners

### Low Priority (Nice-to-have)
1. **Animation polish** — Smoother transitions
2. **Accessibility** — WCAG compliance, keyboard nav
3. **Export features** — CSV/PDF buttons
4. **Custom theme** — Dark mode, theme toggle
5. **Help/Onboarding** — Tooltips, guided tours

---

## Notes for Designer

### Business Context
- **Users:** Operations managers, service leaders, field operations
- **Usage:** Daily operational monitoring, weekly reviews, executive reporting
- **Data freshness:** Updated daily from operational imports
- **Decision-making:** Used to decide resource allocation, risk management, KPI tracking

### Design Goals
- Premium, management-ready appearance
- Stunning visual design
- Professional presentation
- Confidence-inspiring for executives
- Easy data interpretation at a glance

### Constraints
- No API changes
- No data model changes
- Keep business logic intact
- Reuse existing data endpoints
- Compatible with current tech stack (React, Recharts, Leaflet, Lucide)

### Opportunities
- Component library refresh
- Typography system update
- Color palette modernization
- Enhanced data visualization
- Better mobile experience
- Improved interaction patterns

---

## Current Technical Stack

- **Frontend:** React 18+
- **Styling:** CSS (no preprocessor, single large file)
- **Charting:** Recharts
- **Mapping:** Leaflet + Leaflet-draw
- **Icons:** lucide-react
- **Build:** Vite
- **Utilities:** Format helpers, date utilities, custom hooks

---

End of Current Design Snapshot. Ready for redesign phase with Claude Design.
