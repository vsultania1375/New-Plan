# Data Reset Log

## Reset Request

The user explicitly approved clearing current dashboard table rows so fresh Excel files can be uploaded one by one through Admin Upload.

## Safety Scope

- Tables will be emptied only
- Schema will not be changed
- Tables will not be dropped
- Uploaded Excel files will not be deleted
- Project files will not be deleted
- `docker compose down -v` will not be used

## Pre-Reset Row Counts

| Table | Rows before reset |
| --- | ---: |
| `offline_data_master` | 1430 |
| `view_ticket` | 8751 |
| `customer_site_master` | 23345 |
| `engineer_master` | 340 |
| `service_area_master` | 250 |
| `attendance_data` | 211 |
| `visit_master` | 2804 |
| `holiday_master` | 0 |

## Approved Reset Tables

- `offline_data_master`
- `view_ticket`
- `customer_site_master`
- `engineer_master`
- `service_area_master`
- `attendance_data`
- `visit_master`
- `holiday_master`

## Notes

- This is a destructive row reset requested by the user.
- After reset, the dashboard should be repopulated through the documented daily upload workflow.

## Post-Reset Row Counts

| Table | Rows after reset |
| --- | ---: |
| `offline_data_master` | 0 |
| `view_ticket` | 0 |
| `customer_site_master` | 0 |
| `engineer_master` | 0 |
| `service_area_master` | 0 |
| `attendance_data` | 0 |
| `visit_master` | 0 |
| `holiday_master` | 0 |

## Verification

- Database health endpoint remained connected after reset.
- Analytics overview returned zeroed metrics after reset, as expected for an empty dashboard dataset.
