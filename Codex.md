from pathlib import Path

content = r"""# CODEX.md  
# PAN India Operations Intelligence Dashboard

## 1. Project Vision

Build a **PAN India Operations Command Center** dashboard for management to monitor ground-level service performance.

The system will allow management to upload operational files daily and automatically generate insights around:

- Offline sites
- Ticket creation and ticket status
- Engineer activity and productivity
- Site visits
- Attendance discipline
- State-wise / POP-wise / engineer-wise lag
- Exportable performance reports

The main purpose is:

> A PAN India Head should open the dashboard and immediately understand where the lag is happening on the ground.

---

## 2. Core Business Problem

The company has multiple operational datasets:

- Offline site data
- Site master data
- FSM ticket data
- Engineer master data
- Visit data
- Attendance data
- Service area mapping data

Currently these files are separate. The dashboard should connect them and answer:

1. Which sites are offline?
2. Which offline sites have no tickets?
3. Which tickets have no visits?
4. Which engineers are overloaded?
5. Which engineers are attending but not producing enough visits?
6. Which POP/service area/state is causing operational lag?
7. Which sites are repeatedly going offline?
8. Which states or POPs need urgent action?

---

# 3. Data Sources

---

## 3.1 Offline Data

### File Name Format

```text
B2B Offline DD-MM-YYYY.xlsx