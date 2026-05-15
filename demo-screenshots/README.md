# Demo Screenshots

This directory contains the 5 key screenshots for the PAN India Operations Intelligence Dashboard demo.

## Screenshots to Capture

### 1. PAN India Overview
**File:** `01-pan-india-overview.png`

**Show:**
- Top KPI cards (Total Offline, Offline >5d, Offline no Ticket, Ticket no Visit, Avg TAT, Active Engineers)
- Executive Summary line above Operations Summary Panel
- Territory map with state color severity
- Operations Summary Panel with Operational Health Score
- Top Risk States chips

**Tip:** Capture the full viewport showing KPI cards → map → operations panel layout

---

### 2. State Hover / Floating Info Card
**File:** `02-state-hover-info-card.png`

**Show:**
- Territory map with a state hovered (e.g., Uttar Pradesh)
- Floating info card inside the map showing state snapshot
- Card is fixed in position (not following cursor)
- State name, total POPs, total offline, engineer count visible in card

**Tip:** Hover over a high-risk state (pink/red) to make the card stand out

---

### 3. State Selected with POP Markers
**File:** `03-state-selected-pop-markers.png`

**Show:**
- Selected state with breadcrumb showing "Uttar Pradesh"
- Territory map with POP centroid markers (small colored dots)
- POP ranking panel on right side showing list of POPs with risk badges and metrics
- POP centroid fallback note at bottom: "POP locations are shown as centroid markers..."

**Tip:** Click a top-risk state, then scroll right panel to show the full POP list

---

### 4. POP Selected with Operations Summary
**File:** `04-pop-selected-summary.png`

**Show:**
- Selected POP (e.g., Ghaziabad) with breadcrumb
- Operations Summary Panel title showing "POP Operations Summary"
- Top-row metrics (POP name, STATE, ENGINEER, TOTAL SITES, OFFLINE SITES, AVG TAT in hrs)
- Classification chips (Warning, Offline Heavy)
- Operational Health Score cards with:
  - Offline Health (10 sites, >3 Days: 6)
  - Total Sites (10) — with 'i' info icon visible
  - Active Tickets (4, Visits: 9) — with 'i' info icon visible
  - Average TAT (52 hrs) — with 'i' info icon and "High" status
  - Resolution Status — with metrics

**Tip:** Show info icons are visible by hovering or capturing with icons showing

---

### 5. Ground Lag / Risk Section
**File:** `05-ground-lag-risk-section.png`

**Show:**
- "Ground Lag Funnel" heading and "Where the Work Is Leaking" title
- Funnel cards showing:
  - Offline Sites: 1,430 (100% of offline load)
  - Tickets Created: 637 (45% of offline load) — showing the gap
  - Engineer Assigned: (next tier in funnel)
  - Visit Done: (next tier)
  - Closed / Cleared: (final tier)
- Below: Top Risk States and Top Risk POPs panels (if visible)

**Tip:** Scroll to ensure the full funnel is visible and all tiers are shown

---

## Capture Instructions

1. Open dashboard at `http://localhost:5173`
2. Ensure status pill shows **Live**
3. Use browser DevTools or Snipping Tool to capture each view
4. Save as PNG at 1920x1080 or similar high resolution
5. Name files exactly as listed above
6. Keep backgrounds clean (no browser UI in frame, just the dashboard)

---

## Reference Sizes

- Recommended: 1920x1080 (standard 16:9)
- Minimum: 1280x720
- Maximum: 4K (2560x1440) if possible

---

## Usage in Deck

- Include all 5 screenshots in stakeholder presentation deck
- Add captions below each explaining key points
- Group with DEMO_SCRIPT.md for presenter notes
- Consider creating a "before/after" slide comparing to manual Excel analysis

---

## Accessibility Notes

- Use high contrast colors (dashboard uses red, orange, green)
- Make sure text is legible (14px or larger in final deck)
- Consider adding callout boxes or arrows for key metrics in presentation
