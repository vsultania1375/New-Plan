# PAN India Operations Intelligence Dashboard — Demo Script

## Executive Summary

This dashboard converts operational Excel/CSV exports into **ground operations intelligence**. It identifies where field operations are lagging and helps management prioritize ticket creation, engineer deployment, and escalations.

---

## Demo Flow (10–15 minutes)

### **Opening: The Problem**

**Say:**
> "We get Excel dumps from field teams every day showing which sites are offline, which tickets are pending, and which engineers are working. But management has no way to see the big picture—where the biggest issues are, and where to push action."
>
> "This dashboard solves that. It ingests those Excel dumps, runs operational analytics in real time, and shows management exactly where work is leaking."

**Show Screenshot 1: PAN India Overview**
- Point to the **top KPI cards**: Total Offline, Offline >5 Days, Offline but No Ticket, Ticket but No Visit, Avg TAT, Active Engineers
- Explain: "These six numbers tell the whole story. If offline is high but tickets are low, ticket creation is the bottleneck."

---

### **Step 1: India Territory Map**

**Say:**
> "This map shows all 38 Indian states/UTs color-coded by risk. Red = critical, Orange = warning, Green = good."

**Show Screenshot 2: State Hover / Floating Info Card**
- Hover over a state (e.g., Uttar Pradesh)
- Point to the **floating info card** inside the map
- Say: "Hovering a state shows a quick snapshot—no need to wait for details."
- Say: "The card stays in place; it doesn't follow the mouse, so management can read it."

---

### **Step 2: State Drilldown**

**Say:**
> "Click a state to drill down into the details."

**Show Screenshot 3: State Selected with POP Markers**
- Click a top-risk state (e.g., Uttar Pradesh)
- Point to: breadcrumb, POP centroid markers on the map, POP ranking panel on the right
- Say: "Now we see 25 POPs (Points of Operations) in this state, ranked by risk. Each POP is a service area."
- Say: "The map shows POPs as centroid markers for now. Real territorial polygons can be added later."

---

### **Step 3: POP-Level Operational Health**

**Say:**
> "Click a POP to see its operational health in detail."

**Show Screenshot 4: POP Selected with Operations Summary**
- Click a POP (e.g., Ghaziabad)
- Scroll to show the **Operations Summary Panel** 
- Point to the health cards:
  - **Offline Health**: 10 sites offline, 6 >3 days (action needed)
  - **Total Sites**: 10
  - **Active Tickets**: 4 (with 9 visits completed)
  - **Average TAT**: 52 hours (high — in orange)
  - **Resolution Status**: closed/completed tickets
- Say: "Each card has a tooltip explaining the metric. Hover the 'i' icon to see what it means."
- Say: "Units are shown (hrs for TAT, sites for offline, tickets for active tickets)."

---

### **Step 4: Management Decisions**

**Say:**
> "Now, what does management do with this information? Three key decisions:"

**Decision 1: Ticket Creation Push**
- Point to the **Ticket Creation Gap** card
- Say: "If a state has many offline sites but few active tickets, push the ticket creation team. Make sure field supervisors are logging tickets."

**Decision 2: Engineer Action Push**
- Point to the **Engineer Action Gap** card
- Say: "If tickets exist but visits are low, push engineers to execute. Maybe send a directive to field managers: 'Visit all OPEN tickets this week.'"

**Decision 3: Escalation**
- Point to **Offline Health** + **Avg TAT** together
- Say: "If both are in red/orange and rising, escalate to the state head or POP manager. That's a critical situation."

---

### **Step 5: Ground Lag Funnel**

**Show Screenshot 5: Ground Lag / Risk Section**

**Say:**
> "Below, we see the funnel showing where work is leaking."

- Offline Sites: 1,430 (100%)
- Tickets Created: 637 (45%) — *so 55% have no ticket*
- Engineer Assigned: (shown in next tier)
- Visit Done: (shown in next tier)
- Closed / Cleared: (final tier)

**Say:**
> "This funnel helps you understand: of 1,430 offline sites, only 45% have active tickets. That's your biggest leak. Focus the ticket creation team there."

---

## Important Note

**Say:**
> "One important note: **POP boundaries are not real polygons yet.** We're showing POPs as centroid markers—single points on the map. Once we receive real POP/service-area polygon data in GeoJSON format, we can draw actual territories and color them by risk or metrics. The dashboard is ready for that upgrade."

---

## Q&A Prompts

**Q: How often is the data updated?**
> The dashboard ingests data at the frequency your Excel/CSV exports are provided. We can ingest daily, weekly, or on-demand via the Admin Upload button.

**Q: Can we filter by state or date range?**
> Yes. The filter bar at the top lets you pick a date range, state, and segment. Those filters apply to all metrics and tables below.

**Q: What if a POP has no coordinates?**
> If a service area has no lat/lng in the master data, it won't appear as a marker on the map. But it will still be in the detailed tables below.

**Q: Can we export these tables?**
> Yes. Every table has an Export button. You can download to Excel for further analysis or sharing.

---

## Demo Checklist

- [ ] Open dashboard at http://localhost:5173
- [ ] Confirm **Live** status pill is green
- [ ] Show top KPI cards and explain each
- [ ] Point to the India territory map and colors
- [ ] Hover a state to show the floating info card
- [ ] Click a top-risk state (e.g., Uttar Pradesh)
- [ ] Show POP centroid markers and ranking panel
- [ ] Click a POP (e.g., Ghaziabad)
- [ ] Show Operations Summary Panel with health cards
- [ ] Point to tooltips and unit labels
- [ ] Scroll down to show the Ground Lag Funnel
- [ ] Mention that POP polygons are future work
- [ ] Ask if there are questions

---

## Time Estimates

- **Opening**: 2 minutes
- **Territory Map**: 2 minutes
- **State Drilldown**: 2 minutes
- **POP Detail**: 2 minutes
- **Management Decisions**: 2 minutes
- **Ground Lag Funnel**: 1 minute
- **Q&A**: 2–3 minutes

**Total: 13–16 minutes**

---

## Notes for Presenter

1. **Emphasize simplicity**: "This replaces 20 Excel sheets with 5 screens."
2. **Highlight speed**: "You used to wait for analysts to produce reports. Now it's real-time."
3. **Connect to outcomes**: "Ticket creation team now knows which state to focus on. Engineer managers know where to deploy."
4. **Roadmap**: "Future: POP polygons, automated alerts, route optimization, and predictive offline detection."

---

## Future Enhancements (Mention if asked)

- Real POP/service-area polygons from GeoJSON
- Automated alerts when a POP/state hits Critical
- Route planning to optimize engineer visits
- Predictive models for offline sites
- Mobile app for field managers
- Integration with FSM system for real-time ticket syncs
