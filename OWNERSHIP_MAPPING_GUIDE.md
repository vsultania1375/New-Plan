# Ownership Mapping Guide

This guide explains how to maintain official ownership mappings for the dashboard.

Business terminology: **POP = Service Area**. Use `service_area_name` as the Service Area display name and `service_area_code` where available.

## Purpose

The dashboard does not infer ownership from ticket assignment.

Use these files as the approved ownership source of truth:

1. `StateHeadMapping.xlsx`
2. `ServiceAreaEngineerMapping.xlsx`

After upload:

- State Wise Report shows State Head details.
- Service Area Profile shows active engineer, manager, backup engineer, and assignment details.

## Upload Order

1. Upload `StateHeadMapping.xlsx`
2. Upload `ServiceAreaEngineerMapping.xlsx`

Always click **Validate File** before **Upload**.

## StateHeadMapping.xlsx

### Required Fields

- `state`
- `state_head_name`
- `state_head_employee_id`
- `active_status`

### Optional Fields

- `phone`
- `email`
- `region`
- `backup_state_head_name`
- `backup_state_head_employee_id`
- `effective_from`
- `effective_to`

## ServiceAreaEngineerMapping.xlsx

### Required Fields

- `service_area_name`
- `state`
- `engineer_id`
- `engineer_name`
- `active_status`

### Optional Fields

- `service_area_code`
- `assignment_start_date`
- `backup_engineer_id`
- `backup_engineer_name`
- `manager_employee_id`
- `manager_name`
- `effective_from`
- `effective_to`

## Validation Rules

- `active_status` should be `YES` or `NO`.
- Dates should use `YYYY-MM-DD`.
- Do not leave required fields blank.
- State names must match dashboard state names as closely as possible.
- `service_area_name` must match the Service Area name from the system.
- Use `service_area_code` wherever available.
- If `service_area_code` is blank, the system matches by `service_area_name + state`.

## Common Mistakes

- Uploading without dry-run validation.
- Using ticket assignment as ownership.
- Misspelling state or Service Area names.
- Leaving `active_status` blank.
- Using date formats like `01/05/26` instead of `2026-05-01`.
- Putting multiple active owners for the same state or Service Area.

## Dashboard Changes After Upload

After `StateHeadMapping.xlsx` is uploaded:

- State Wise Report should show State Head name.
- Phone/email appears where provided.
- Missing states continue to show `Mapping Pending`.

After `ServiceAreaEngineerMapping.xlsx` is uploaded:

- Service Area Profile should show Active Engineer.
- Manager, backup engineer, phone, and assignment date appear where provided.
- Missing Service Areas continue to show `Mapping Pending`.

## Safety Notes

- These mapping files are occasional uploads, not daily files.
- Upload them only when official ownership changes.
- Do not import placeholder/example rows.
- Keep approved copies of the uploaded files outside the project folder.
