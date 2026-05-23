# Component Specifications — Current Design

Reference for all component styles, dimensions, and behaviors.

---

## KPI Card

**Current Implementation:** `.engineer-summary-card` / `.kpi-card`

### Dimensions
- **Width:** Auto-fit grid, minmax(140px, 1fr)
- **Height:** 92px
- **Padding:** 12px 14px
- **Gap:** 8px (inner spacing between elements)

### Typography
- **Label:** 11px, regular, muted gray (`#64748b`)
- **Value:** 22px, bold, brand navy (`#253247`)
- **Icon:** 16px (lucide-react)

### Border & Shadow
- **Border:** Left 4px solid (color by tone)
- **Border-radius:** 4px
- **Box-shadow:** `0 2px 8px rgba(16, 35, 63, 0.04)`
- **Background:** Solid white `#ffffff`

### Tone Variants
```css
.card.neutral    /* Gray border */
.card.good       /* Green border #10b981 */
.card.warning    /* Orange border #f97316 */
.card.critical   /* Red border #dc2626 */
```

### Responsive
- **1366px:** 6 cards per row
- **1080px:** 5 cards per row (adjusted minmax)
- **720px:** Single column with full width

---

## Panel / Container

**Current Implementation:** `.panel`

### Dimensions
- **Padding:** 20-24px
- **Margin:** 12-16px
- **Border-radius:** 8px
- **Min-height:** Varies by content

### Styling
- **Border:** 1px solid `rgba(148, 163, 184, 0.22)`
- **Background:** Solid white `#ffffff`
- **Box-shadow:** `0 2px 8px rgba(16, 35, 63, 0.04)`

### Nested Structure
- **Heading:** `.panel-heading`
  - Padding: 0 (inherits from panel)
  - Flex with justify-space-between
- **Content:** Direct children
  - Gap: 12-16px between sections

---

## Panel Heading

**Current Implementation:** `.panel-heading`

### Dimensions
- **Display:** Flex with gap: 18px
- **Align:** justify-space-between, align-items: center

### Typography
- **Label (`.panel-heading p`):** 12px, bold, uppercase, muted gray, letter-spacing 0
- **Title (`.panel-heading h2`):** 20px, bold, brand navy
- **Margin:** 0 on all elements

---

## Table

**Current Implementation:** `.engineer-wise-table` / various table classes

### Container
- **Max-height:** 380-620px (varies by section)
- **Overflow:** Auto (scrollable)
- **Border:** 1px solid `rgba(148, 163, 184, 0.22)`
- **Border-radius:** 8px
- **Wrapper class:** `.table-wrap` or `.engineer-table-wrap`

### Header Row
- **Background:** `#f8fafc`
- **Padding:** 12-16px per cell
- **Typography:** 12px, bold, brand navy
- **Border-bottom:** 1px solid separator

### Data Rows
- **Padding:** 12-16px per cell
- **Typography:** 13px, regular, brand navy
- **Border-bottom:** 1px solid separator
- **Height:** Auto (content-dependent)

### Row Interaction
- **Hover:** Background `#f8fbff` (light blue)
- **Click:** Opens detail modal
- **Cursor:** Pointer on hover

### Data Formatting
- **Numbers:** Formatted with thousand separators (12,345)
- **Null values:** Display "—" (em dash)
- **Percentages:** "42%" format
- **Text:** Truncated if too long (table width constraint)

---

## Button / Tab

**Current Implementation:** `.report-tab` / generic `<button>`

### Tab Button
- **Height:** 42px (minimum, flex-based)
- **Padding:** 0 16px
- **Display:** Inline-flex
- **Align:** Center items
- **Gap:** 8px (icon + text)

### Typography
- **Font-size:** 14px
- **Font-weight:** 400 (regular)
- **Color:** Default navy `#253247`
- **Icon:** 16px (lucide-react)

### States
- **Default:** Transparent background, navy text
- **Hover:** Same (text only)
- **Active:** 
  - Border-bottom: 2px solid brand navy
  - Text: Navy
  - Background: Transparent

### Border Radius
- **Tabs:** `10px 10px 0 0` (rounded top only)
- **Action buttons:** 6-8px

---

## Badge / Pill

**Current Implementation:** `.badge` / `.risk-badge`

### Dimensions
- **Padding:** 4px 10px
- **Height:** Auto (~20px with text)
- **Border-radius:** 999px (pill-shaped)
- **Display:** Inline-flex
- **Align:** Center

### Typography
- **Font-size:** 11px
- **Font-weight:** 700 (bold)
- **Color:** Varies by tone

### Variants
```css
.badge.critical  /* Red background, darker red text */
.badge.warning   /* Orange background, darker orange text */
.badge.good      /* Green background, darker green text */
.badge.neutral   /* Gray background, gray text */
```

### Border & Shadow
- **Border:** 1px solid (lighter shade of background color)
- **Background:** Light tint of semantic color
- **Box-shadow:** None

---

## Modal / Dialog

**Current Implementation:** `.engineer-profile-modal` / `.modal`

### Overlay
- **Position:** Fixed, full-screen
- **Top/Left/Right/Bottom:** 0
- **Background:** `rgba(16, 35, 63, 0.5)` (dark semi-transparent)
- **Z-index:** 5000
- **Padding:** 20px

### Modal Card
- **Position:** Relative to overlay (centered)
- **Max-width:** 1120px
- **Max-height:** 88vh
- **Width:** 100% (responsive)
- **Overflow:** Auto for scrolling
- **Background:** White `#ffffff`
- **Border-radius:** 12px
- **Box-shadow:** `0 20px 25px -5px rgba(0, 0, 0, 0.1)`
- **Padding:** 20px

### Header Section
- **Display:** Flex with justify-space-between
- **Gap:** 18px
- **Border-bottom:** 1px solid separator
- **Padding-bottom:** 12px

### Close Button
- **Background:** Transparent
- **Border:** None
- **Icon:** 20px (X icon)
- **Color:** Muted gray on default, navy on hover
- **Cursor:** Pointer

### Content Sections (`.engineer-modal-section`)
- **Padding:** 16px 18px
- **Border-bottom:** 1px solid separator (except last)
- **Heading:** 16px, bold, brand navy

### Animation
- **Overlay:** Fade-in 0.15s ease
- **Modal:** Slide-up 0.25s ease

### Responsive (720px)
- **Max-width:** 100% (full width minus padding)
- **Max-height:** 92vh
- **Modal:** Becomes more compact

---

## Input / Search

**Current Implementation:** `.engineer-search` / `.filter-bar`

### Search Input
- **Height:** 36-40px
- **Padding:** 8px 12px
- **Border:** 1px solid `rgba(148, 163, 184, 0.22)`
- **Border-radius:** 6px
- **Font-size:** 13px
- **Background:** White `#ffffff`

### With Icon
- **Display:** Flex with align-center, gap: 8px
- **Icon:** 15px (search icon)
- **Icon color:** Muted gray `#64748b`

### Focus State
- **Border-color:** Brand blue `#2563eb`
- **Outline:** None (custom focus)
- **Box-shadow:** `0 0 0 3px rgba(37, 99, 235, 0.1)` (subtle)

### Placeholder
- **Color:** `rgba(100, 116, 139, 0.5)` (lighter muted)
- **Font-style:** Regular

---

## Select / Dropdown

**Current Implementation:** `<select>` elements

### Dropdown
- **Height:** 36-40px
- **Padding:** 8px 12px
- **Border:** 1px solid `rgba(148, 163, 184, 0.22)`
- **Border-radius:** 6px
- **Font-size:** 13px
- **Background:** White `#ffffff`
- **Cursor:** Pointer

### Option
- **Padding:** 8px 12px
- **Background:** Varies (OS default or styled)
- **Color:** Navy text `#253247`

### Focus State
- **Border-color:** Brand blue `#2563eb`
- **Outline:** None
- **Box-shadow:** `0 0 0 3px rgba(37, 99, 235, 0.1)`

---

## Legend / Indicator

**Current Implementation:** `.engineer-modal-calendar-legend` / `.map-legend`

### Legend Container
- **Display:** Flex with flex-wrap
- **Gap:** 12px
- **Margin-bottom:** 12px

### Legend Item
- **Display:** Inline-flex
- **Align:** Center items
- **Padding:** 4px 10px
- **Border-radius:** 999px (pill)
- **Font-size:** 11px
- **Font-weight:** 700
- **Background:** Light surface
- **Border:** 1px solid lighter shade

### Color Variants
- **Productive:** Green tint background
- **Present:** Orange tint background
- **Late:** Yellow tint background
- **Absent:** Gray tint background

---

## Calendar Grid

**Current Implementation:** `.engineer-modal-calendar-grid`

### Grid Layout
- **Display:** Grid
- **Grid-template-columns:** `repeat(7, 1fr)` (7 columns for days of week)
- **Gap:** 8px
- **Margin-bottom:** 12px

### Day Cell
- **Aspect-ratio:** 1 / 1 (square)
- **Padding:** 8px
- **Background:** `#f8fafc` (light gray)
- **Border:** 1px solid `rgba(148, 163, 184, 0.22)`
- **Border-radius:** 6px
- **Display:** Flex flex-column center items
- **Gap:** 3px

### Day Cell States
- **Empty cell:** Transparent background, no border
- **No visits:** Gray background `#f8fafc`
- **Has visits:** Green tint `rgba(46, 125, 50, 0.08)`

### Day Cell Typography
- **Date number:** 14px, bold, brand navy
- **Visit label:** 9px, regular, muted gray (or green if visits)

### Weekday Headers
- **Display:** Grid, `repeat(7, 1fr)`
- **Typography:** 11px, bold, muted gray
- **Padding:** 4px 0
- **Text-align:** Center
- **Margin-bottom:** 8px

---

## Risk Badge / Status

**Current Implementation:** `.risk-badge` / Risk indicator in tables

### Badge
- **Display:** Inline-flex
- **Padding:** 4px 10px
- **Border-radius:** 999px
- **Font-size:** 11px
- **Font-weight:** 700

### States
- **Critical (Red):** 
  - Background: Light red tint
  - Text: Dark red `#7f1d1d` or similar
  - Border: Lighter red
- **Warning (Orange):**
  - Background: Light orange tint
  - Text: Dark orange
  - Border: Lighter orange
- **Good (Green):**
  - Background: Light green tint
  - Text: Dark green
  - Border: Lighter green
- **Unknown/Neutral (Gray):**
  - Background: Light gray
  - Text: Medium gray
  - Border: Lighter gray

---

## Histogram / Chart Bar

**Current Implementation:** `.engineer-modal-hour-bar`

### Bar Container
- **Height:** 200px total
- **Display:** Grid with 24 columns (24 hours)
- **Gap:** 3px
- **Align-items:** End (aligns bars to bottom)

### Individual Bar
- **Display:** Flex flex-column align-center justify-end
- **Gap:** 4px
- **Width:** Auto (calculated by grid)

### Bar Fill
- **Height:** Proportional to data (3-100% based on max)
- **Background:** Brand color (blue)
- **Border-radius:** 2px top
- **Min-height:** 3px (even for small values)

### Label
- **Font-size:** 10px
- **Color:** Muted gray
- **Margin-top:** 4px

---

## Status Pill / Indicator

**Current Implementation:** `.status-pill` / API status

### Pill
- **Display:** Inline-flex
- **Align:** Center items
- **Gap:** 6px
- **Padding:** 6px 12px
- **Border-radius:** 999px
- **Font-size:** 12px
- **Font-weight:** 600

### States
- **Live (Green):** Green background, green dot
- **Partial (Yellow):** Yellow background, yellow dot
- **Offline (Red):** Red background, red dot
- **No Data (Gray):** Gray background, gray dot

### Dot Indicator
- **Display:** Inline-block (circle using border-radius: 50%)
- **Width/Height:** 8px
- **Background:** Matches state color

---

## Responsive Behavior Summary

### 1366px+ (Desktop)
- Full width, all columns visible
- Max width on maps and modals
- 6 KPI cards per row
- 2-column layouts where applicable

### 1080px (Tablet)
- Narrower margins (18px instead of 28px)
- Adjusted grid minmax values
- 4-5 KPI cards per row
- 1-column layouts for wide elements
- Modal max-width: 90vw

### 720px (Mobile)
- Side margins 14px
- Single column layouts
- KPI cards full width
- Tables with horizontal scroll
- Modal full width with padding
- Tabs with overflow-x: auto
- Smaller fonts on some elements
- Reduced padding/spacing

---

End of Component Specifications.
