CREATE TABLE IF NOT EXISTS offline_data_master (
  id BIGSERIAL PRIMARY KEY,
  data_date DATE NOT NULL,
  alarm_date TIMESTAMP NULL,
  b2b_code TEXT NULL,
  bank_name_standard TEXT NULL,
  descr TEXT NULL,
  site_name TEXT NULL,
  cs_id VARCHAR(80) NOT NULL,
  aging_days INTEGER NULL,
  bucket TEXT NULL,
  branch_code TEXT NULL,
  atm_id_clean TEXT NULL,
  state TEXT NULL,
  offline_date_time TIMESTAMP NULL,
  zone TEXT NULL,
  segment TEXT NULL,
  source_file TEXT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_site_master (
  id BIGSERIAL PRIMARY KEY,
  cs_id VARCHAR(80) NULL,
  oracle_site_no VARCHAR(80) NOT NULL UNIQUE,
  oracle_site_name TEXT NULL,
  oracle_account_no TEXT NULL,
  oracle_customer_name TEXT NULL,
  atm_id TEXT NULL,
  service_area_name TEXT NULL,
  city TEXT NULL,
  state TEXT NULL,
  state_code TEXT NULL,
  pin_code TEXT NULL,
  address_line_1 TEXT NULL,
  address_line_2 TEXT NULL,
  address_line_3 TEXT NULL,
  latitude DOUBLE PRECISION NULL,
  longitude DOUBLE PRECISION NULL,
  active_status TEXT NULL,
  raw JSONB NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS view_ticket (
  ticket_id VARCHAR(80) PRIMARY KEY,
  oracle_site_name TEXT NULL,
  oracle_site_no VARCHAR(80) NULL,
  cs_id VARCHAR(80) NULL,
  primary_customer_name TEXT NULL,
  atm_id TEXT NULL,
  service_area_name TEXT NULL,
  state TEXT NULL,
  ticket_status TEXT NULL,
  ticket_status_reason TEXT NULL,
  aging_days INTEGER NULL,
  total_visits INTEGER NULL,
  ticket_type TEXT NULL,
  ticket_sub_type TEXT NULL,
  create_date TIMESTAMP NULL,
  planned_date TIMESTAMP NULL,
  ticket_assigned_type TEXT NULL,
  ticket_assigned_to TEXT NULL,
  assigned_employee_name TEXT NULL,
  assigned_employee_id VARCHAR(80) NULL,
  current_approver_name TEXT NULL,
  last_visit_in_datetime TIMESTAMP NULL,
  last_visit_out_datetime TIMESTAMP NULL,
  last_submission_datetime TIMESTAMP NULL,
  ticket_closed_datetime TIMESTAMP NULL,
  cancelled_by_name TEXT NULL,
  cancelled_datetime TIMESTAMP NULL,
  raw JSONB NULL,
  refreshed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS engineer_master (
  employee_id VARCHAR(80) PRIMARY KEY,
  employee_name TEXT NULL,
  company_name TEXT NULL,
  location TEXT NULL,
  department TEXT NULL,
  designation TEXT NULL,
  region TEXT NULL,
  state TEXT NULL,
  service_state TEXT NULL,
  city TEXT NULL,
  address TEXT NULL,
  pin_code TEXT NULL,
  date_of_joining DATE NULL,
  email_id TEXT NULL,
  phone_no TEXT NULL,
  reporting_manager_1 TEXT NULL,
  reporting_manager_2 TEXT NULL,
  reporting_manager_3 TEXT NULL,
  reporting_manager_4 TEXT NULL,
  reporting_manager_5 TEXT NULL,
  substitute_engineer TEXT NULL,
  active_status TEXT NULL,
  base_latitude DOUBLE PRECISION NULL,
  base_longitude DOUBLE PRECISION NULL,
  supplier_site TEXT NULL,
  raw JSONB NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_area_master (
  service_area_code VARCHAR(80) PRIMARY KEY,
  service_area_name TEXT NOT NULL,
  service_area_group TEXT NULL,
  active_status TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS state_head_mapping (
  id BIGSERIAL PRIMARY KEY,
  state TEXT NOT NULL,
  state_key TEXT GENERATED ALWAYS AS (UPPER(REGEXP_REPLACE(TRIM(state), '[^A-Za-z0-9]', '', 'g'))) STORED,
  state_head_name TEXT NULL,
  state_head_employee_id VARCHAR(80) NULL,
  phone TEXT NULL,
  email TEXT NULL,
  active_status TEXT NULL,
  region TEXT NULL,
  backup_state_head_name TEXT NULL,
  backup_state_head_employee_id VARCHAR(80) NULL,
  effective_from DATE NULL,
  effective_to DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (state_key)
);

CREATE TABLE IF NOT EXISTS service_area_engineer_mapping (
  id BIGSERIAL PRIMARY KEY,
  service_area_code VARCHAR(80) NULL,
  service_area_name TEXT NOT NULL,
  service_area_key TEXT GENERATED ALWAYS AS (UPPER(REGEXP_REPLACE(TRIM(service_area_name), '[^A-Za-z0-9]', '', 'g'))) STORED,
  state TEXT NOT NULL,
  state_key TEXT GENERATED ALWAYS AS (UPPER(REGEXP_REPLACE(TRIM(state), '[^A-Za-z0-9]', '', 'g'))) STORED,
  engineer_id VARCHAR(80) NULL,
  engineer_name TEXT NULL,
  assignment_start_date DATE NULL,
  active_status TEXT NULL,
  backup_engineer_id VARCHAR(80) NULL,
  backup_engineer_name TEXT NULL,
  manager_employee_id VARCHAR(80) NULL,
  manager_name TEXT NULL,
  effective_from DATE NULL,
  effective_to DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_area_pincode_mapping (
  id BIGSERIAL PRIMARY KEY,
  service_area_code VARCHAR(80) NULL,
  service_area_name TEXT NOT NULL,
  service_area_key TEXT GENERATED ALWAYS AS (UPPER(REGEXP_REPLACE(TRIM(service_area_name), '[^A-Za-z0-9]', '', 'g'))) STORED,
  state TEXT NOT NULL,
  state_key TEXT GENERATED ALWAYS AS (UPPER(REGEXP_REPLACE(TRIM(state), '[^A-Za-z0-9]', '', 'g'))) STORED,
  city TEXT NULL,
  pincode VARCHAR(10) NOT NULL,
  active_status TEXT NULL,
  effective_from DATE NULL,
  effective_to DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_data (
  id BIGSERIAL PRIMARY KEY,
  employee_id VARCHAR(80) NOT NULL,
  employee_name TEXT NULL,
  service_state TEXT NULL,
  attendance_date DATE NULL,
  attendance_status_raw TEXT NULL,
  attendance_status_derived TEXT NULL,
  attendance_month TEXT NULL,
  in_datetime TIMESTAMP NULL,
  out_datetime TIMESTAMP NULL,
  working_hours NUMERIC(8, 2) NULL,
  start_latitude DOUBLE PRECISION NULL,
  start_longitude DOUBLE PRECISION NULL,
  end_latitude DOUBLE PRECISION NULL,
  end_longitude DOUBLE PRECISION NULL,
  first_visit_cs_id VARCHAR(80) NULL,
  first_visit_ticket_id VARCHAR(80) NULL,
  last_visit_cs_id VARCHAR(80) NULL,
  last_visit_ticket_id VARCHAR(80) NULL,
  source_file TEXT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visit_master (
  id BIGSERIAL PRIMARY KEY,
  visit_id VARCHAR(120) NULL,
  ticket_id VARCHAR(80) NULL,
  cs_id VARCHAR(80) NULL,
  oracle_site_no VARCHAR(80) NULL,
  employee_id VARCHAR(80) NULL,
  visit_in_datetime TIMESTAMP NULL,
  visit_out_datetime TIMESTAMP NULL,
  source_file TEXT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS upload_history (
  id BIGSERIAL PRIMARY KEY,
  upload_id BIGINT GENERATED BY DEFAULT AS IDENTITY,
  upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_file_name TEXT NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  record_count INTEGER NOT NULL DEFAULT 0,
  records_count INTEGER NOT NULL DEFAULT 0,
  processed_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  error_message TEXT NULL,
  data_type TEXT NOT NULL,
  target_table TEXT NULL,
  inserted_rows INTEGER NULL,
  updated_rows INTEGER NULL,
  skipped_duplicates INTEGER NULL,
  failed_rows INTEGER NULL,
  import_summary JSONB NULL
);

ALTER TABLE upload_history ADD COLUMN IF NOT EXISTS upload_id BIGINT GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE upload_history ADD COLUMN IF NOT EXISTS records_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE upload_history ADD COLUMN IF NOT EXISTS processed_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE upload_history ADD COLUMN IF NOT EXISTS rejected_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE upload_history ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'SUCCESS';
ALTER TABLE upload_history ADD COLUMN IF NOT EXISTS error_message TEXT NULL;

CREATE TABLE IF NOT EXISTS site_master_snapshot (
  id BIGSERIAL PRIMARY KEY,
  upload_date DATE NOT NULL,
  source_file_name TEXT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  cs_id VARCHAR(80) NULL,
  oracle_site_no VARCHAR(80) NOT NULL,
  oracle_site_name TEXT NULL,
  atm_id TEXT NULL,
  service_area_name TEXT NULL,
  city TEXT NULL,
  state TEXT NULL,
  state_code TEXT NULL,
  pin_code TEXT NULL,
  latitude DOUBLE PRECISION NULL,
  longitude DOUBLE PRECISION NULL,
  active_status TEXT NULL,
  raw JSONB NULL,
  UNIQUE (upload_date, oracle_site_no)
);

CREATE TABLE IF NOT EXISTS daily_offline_snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  upload_id BIGINT NULL,
  site_id VARCHAR(80) NULL,
  cs_id VARCHAR(80) NULL,
  atm_id TEXT NULL,
  oracle_site_no VARCHAR(80) NULL,
  site_name TEXT NULL,
  state TEXT NULL,
  service_area_name TEXT NULL,
  pincode TEXT NULL,
  issue_type TEXT NULL,
  offline_status TEXT NULL,
  source_file_name TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_request_snapshot (
  id BIGSERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  source_file_name TEXT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ticket_id VARCHAR(80) NOT NULL,
  oracle_site_name TEXT NULL,
  oracle_site_no VARCHAR(80) NULL,
  cs_id VARCHAR(80) NULL,
  primary_customer_name TEXT NULL,
  atm_id TEXT NULL,
  service_area_name TEXT NULL,
  state TEXT NULL,
  ticket_status TEXT NULL,
  ticket_status_reason TEXT NULL,
  aging_days INTEGER NULL,
  total_visits INTEGER NULL,
  ticket_type TEXT NULL,
  ticket_sub_type TEXT NULL,
  create_date TIMESTAMP NULL,
  planned_date TIMESTAMP NULL,
  ticket_assigned_type TEXT NULL,
  ticket_assigned_to TEXT NULL,
  assigned_employee_name TEXT NULL,
  assigned_employee_id VARCHAR(80) NULL,
  current_approver_name TEXT NULL,
  last_visit_in_datetime TIMESTAMP NULL,
  last_visit_out_datetime TIMESTAMP NULL,
  last_submission_datetime TIMESTAMP NULL,
  ticket_closed_datetime TIMESTAMP NULL,
  cancelled_by_name TEXT NULL,
  cancelled_datetime TIMESTAMP NULL,
  raw JSONB NULL,
  UNIQUE (snapshot_date, ticket_id)
);

CREATE TABLE IF NOT EXISTS service_requests (
  ticket_id VARCHAR(80) PRIMARY KEY,
  site_id VARCHAR(80) NULL,
  cs_id VARCHAR(80) NULL,
  atm_id TEXT NULL,
  state TEXT NULL,
  service_area_name TEXT NULL,
  issue_type TEXT NULL,
  priority TEXT NULL,
  status TEXT NULL,
  open_date TIMESTAMP NULL,
  pending_date TIMESTAMP NULL,
  complete_date TIMESTAMP NULL,
  assigned_to_type TEXT NULL,
  engineer_name TEXT NULL,
  vendor_name TEXT NULL,
  state_manager TEXT NULL,
  sla_due_date TIMESTAMP NULL,
  last_remark TEXT NULL,
  last_updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_visits (
  visit_id VARCHAR(120) PRIMARY KEY,
  ticket_id VARCHAR(80) NULL,
  site_id VARCHAR(80) NULL,
  engineer_name TEXT NULL,
  vendor_name TEXT NULL,
  visit_date TIMESTAMP NULL,
  visit_type TEXT NULL,
  remark TEXT NULL,
  proof_status TEXT NULL,
  lat DOUBLE PRECISION NULL,
  lng DOUBLE PRECISION NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_area_daily_summary (
  id BIGSERIAL PRIMARY KEY,
  summary_date DATE NOT NULL,
  state TEXT NULL,
  service_area_name TEXT NOT NULL,
  service_area_key TEXT GENERATED ALWAYS AS (UPPER(REGEXP_REPLACE(TRIM(service_area_name), '[^A-Za-z0-9]', '', 'g'))) STORED,
  total_sr INTEGER NOT NULL DEFAULT 0,
  open_sr INTEGER NOT NULL DEFAULT 0,
  pending_sr INTEGER NOT NULL DEFAULT 0,
  complete_sr INTEGER NOT NULL DEFAULT 0,
  sites_with_open_sr INTEGER NOT NULL DEFAULT 0,
  offline_sites INTEGER NOT NULL DEFAULT 0,
  repeat_failure_sites INTEGER NOT NULL DEFAULT 0,
  avg_first_visit_hours NUMERIC(10, 2) NULL,
  avg_closure_hours NUMERIC(10, 2) NULL,
  source_file_name TEXT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS holiday_master (
  id BIGSERIAL PRIMARY KEY,
  holiday_date DATE NOT NULL UNIQUE,
  holiday_name TEXT NULL,
  state TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_offline_cs_id ON offline_data_master(cs_id);
CREATE INDEX IF NOT EXISTS idx_offline_date ON offline_data_master(data_date);
CREATE INDEX IF NOT EXISTS idx_offline_segment_aging ON offline_data_master(segment, aging_days);
CREATE INDEX IF NOT EXISTS idx_offline_state ON offline_data_master(state);
CREATE INDEX IF NOT EXISTS idx_site_cs_id ON customer_site_master(cs_id);
CREATE INDEX IF NOT EXISTS idx_site_service_area ON customer_site_master(service_area_name);
CREATE INDEX IF NOT EXISTS idx_ticket_cs_id ON view_ticket(cs_id);
CREATE INDEX IF NOT EXISTS idx_ticket_site_no ON view_ticket(oracle_site_no);
CREATE INDEX IF NOT EXISTS idx_ticket_active ON view_ticket(ticket_status, ticket_assigned_type);
CREATE INDEX IF NOT EXISTS idx_ticket_employee ON view_ticket(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_engineer_active ON engineer_master(active_status, designation);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_data(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_upload_history_type_date ON upload_history(data_type, upload_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_upload_history_upload_id ON upload_history(upload_id);
CREATE INDEX IF NOT EXISTS idx_upload_history_uploaded_at ON upload_history(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_daily_offline_snapshots_date ON daily_offline_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_daily_offline_snapshots_site ON daily_offline_snapshots(site_id);
CREATE INDEX IF NOT EXISTS idx_daily_offline_snapshots_scope ON daily_offline_snapshots(state, service_area_name);
CREATE INDEX IF NOT EXISTS idx_site_snapshot_date ON site_master_snapshot(upload_date);
CREATE INDEX IF NOT EXISTS idx_site_snapshot_site ON site_master_snapshot(oracle_site_no);
CREATE INDEX IF NOT EXISTS idx_sr_snapshot_date ON service_request_snapshot(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_sr_snapshot_site ON service_request_snapshot(oracle_site_no);
CREATE INDEX IF NOT EXISTS idx_sr_snapshot_status ON service_request_snapshot(ticket_status, ticket_assigned_type);
CREATE INDEX IF NOT EXISTS idx_sr_snapshot_service_area ON service_request_snapshot(service_area_name);
CREATE INDEX IF NOT EXISTS idx_service_requests_site ON service_requests(site_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_scope ON service_requests(state, service_area_name);
CREATE INDEX IF NOT EXISTS idx_service_requests_dates ON service_requests(open_date, complete_date);
CREATE INDEX IF NOT EXISTS idx_service_visits_ticket ON service_visits(ticket_id);
CREATE INDEX IF NOT EXISTS idx_service_visits_site ON service_visits(site_id);
CREATE INDEX IF NOT EXISTS idx_service_visits_date ON service_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_sa_daily_summary_date ON service_area_daily_summary(summary_date);
CREATE INDEX IF NOT EXISTS idx_sa_daily_summary_state ON service_area_daily_summary(state);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sa_daily_summary_unique ON service_area_daily_summary(summary_date, service_area_key, COALESCE(state, ''));
CREATE INDEX IF NOT EXISTS idx_state_head_mapping_state_key ON state_head_mapping(state_key);
CREATE INDEX IF NOT EXISTS idx_state_head_mapping_active ON state_head_mapping(active_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sa_engineer_mapping_code ON service_area_engineer_mapping(service_area_code) WHERE service_area_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sa_engineer_mapping_name_state ON service_area_engineer_mapping(service_area_key, state_key) WHERE service_area_code IS NULL;
CREATE INDEX IF NOT EXISTS idx_sa_engineer_mapping_state_key ON service_area_engineer_mapping(state_key);
CREATE INDEX IF NOT EXISTS idx_sa_engineer_mapping_service_area_key ON service_area_engineer_mapping(service_area_key);
CREATE INDEX IF NOT EXISTS idx_sa_engineer_mapping_active ON service_area_engineer_mapping(active_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sa_pincode_mapping_active_pin ON service_area_pincode_mapping(pincode) WHERE UPPER(TRIM(active_status)) IN ('YES', 'ACTIVE', 'TRUE');
CREATE INDEX IF NOT EXISTS idx_sa_pincode_mapping_pincode ON service_area_pincode_mapping(pincode);
CREATE INDEX IF NOT EXISTS idx_sa_pincode_mapping_service_area_key ON service_area_pincode_mapping(service_area_key);
CREATE INDEX IF NOT EXISTS idx_sa_pincode_mapping_state_key ON service_area_pincode_mapping(state_key);
CREATE INDEX IF NOT EXISTS idx_sa_pincode_mapping_active ON service_area_pincode_mapping(active_status);
