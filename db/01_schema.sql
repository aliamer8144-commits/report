-- 01_schema.sql
-- Rebuild core tables for the app (no Supabase Auth). RLS remains disabled.

-- Extensions
create extension if not exists pgcrypto;

-- users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- authorized_devices
create table if not exists public.authorized_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  device_id text not null,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, device_id)
);

-- reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  service_code text not null,
  id_number text not null,
  name_ar text not null,
  name_en text not null,
  days_count integer not null check (days_count >= 0),
  entry_date_gregorian date not null,
  exit_date_gregorian date not null,
  entry_date_hijri text,
  exit_date_hijri text,
  report_issue_date date not null,
  nationality_ar text not null,
  nationality_en text not null,
  doctor_name_ar text not null,
  doctor_name_en text not null,
  job_title_ar text not null,
  job_title_en text not null,
  hospital_name_ar text not null,
  hospital_name_en text not null,
  print_date text not null,
  print_time text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- activities
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  report_id uuid references public.reports(id) on delete set null,
  activity_type text not null check (activity_type in ('add','edit','delete','view','download','system')),
  title text not null,
  description text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_reports_user_active on public.reports(user_id, is_deleted) where is_deleted = false;
create index if not exists idx_reports_user_service on public.reports(user_id, service_code);
create index if not exists idx_reports_user_idnumber on public.reports(user_id, id_number);
create index if not exists idx_reports_created_at on public.reports(created_at desc);

create index if not exists idx_activities_user_read_created on public.activities(user_id, is_read, created_at desc);
create index if not exists idx_activities_report on public.activities(report_id);

-- RLS off (default). Keep disabled while using anon key without JWT session binding.
-- If you later enable Supabase Auth, enable RLS and add policies accordingly.


