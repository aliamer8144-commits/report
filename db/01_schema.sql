-- 01_schema.sql
-- نظام إدارة التقارير - المخطط الكامل
-- RLS remains disabled (يتم استخدام المصادقة المخصصة مع anon key)

-- Extensions
create extension if not exists pgcrypto;

-- ============================================================
-- users - جدول المستخدمين
-- ============================================================
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  -- حقول نظام المشرفات
  full_name text,
  phone text,
  email text,
  role text not null default 'user' check (role in ('user', 'supervisor', 'admin')),
  supervisor_id uuid references public.users(id),
  -- حقول الحدود المسموحة (inline - للوصول السريع)
  limit_type text check (limit_type in ('days', 'reports', 'date')),
  limit_value numeric,
  limit_date timestamptz,
  -- حقول التعليق
  is_suspended boolean not null default false,
  last_unsuspended_at timestamptz not null default now(),
  -- صلاحية تنزيل PPTX (يتحكم بها المشرف)
  pptx_enabled boolean not null default true
);

-- ============================================================
-- authorized_devices - الأجهزة المرخصة
-- ============================================================
create table if not exists public.authorized_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  device_id text not null,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, device_id)
);

-- ============================================================
-- reports - التقارير
-- ============================================================
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

-- ============================================================
-- activities - سجل الأنشطة
-- ============================================================
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

-- ============================================================
-- api_usage_logs - سجل استخدام API
-- ============================================================
create table if not exists public.api_usage_logs (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'pdf',
  status text not null default 'success',
  details text,
  created_at timestamptz default now()
);

-- ============================================================
-- user_limits - حدود المستخدمين (سجل كامل لكل حد تم تحديده)
-- limit_type: 'days_count' (بعدد الأيام) | 'reports_count' (بعدد التقارير) | 'specific_date' (إلى تاريخ معين)
-- ============================================================
create table if not exists public.user_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  set_by uuid not null references public.users(id),
  limit_type text not null check (limit_type in ('days_count', 'reports_count', 'specific_date')),
  limit_value integer check (limit_value > 0),
  limit_date timestamptz,
  created_at timestamptz not null default now(),
  -- قيد: إذا كان النوع days_count أو reports_count يجب تحديد limit_value وعدم تحديد limit_date
  -- إذا كان النوع specific_date يجب تحديد limit_date وعدم تحديد limit_value
  constraint limit_value_or_date check (
    (
      limit_type in ('days_count', 'reports_count')
      and limit_value is not null
      and limit_date is null
    )
    or (
      limit_type = 'specific_date'
      and limit_date is not null
      and limit_value is null
    )
  )
);

-- ============================================================
-- user_suspensions - سجل التعليقات
-- ============================================================
create table if not exists public.user_suspensions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  suspended_by uuid not null references public.users(id),
  suspension_reason text not null default 'تم تجاوز الحد المسموح',
  suspended_at timestamptz not null default now(),
  reactivated_at timestamptz,  -- null = التعليق لا يزال ساري
  reactivated_by uuid references public.users(id),
  reports_count_at_suspension integer not null default 0,
  days_count_at_suspension integer not null default 0,
  new_limit_id uuid references public.user_limits(id)  -- الحد الجديد بعد فك التعليق
);

-- ============================================================
-- suspension_history - سجل تاريخي إضافي للتعليقات
-- ============================================================
create table if not exists public.suspension_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  supervisor_id uuid references public.users(id),
  suspended_at timestamptz not null default now(),
  unsuspended_at timestamptz,
  reason text,
  limit_type text,
  limit_value numeric,
  limit_date timestamptz
);

-- ============================================================
-- Indexes
-- ============================================================

-- users
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_supervisor_id on public.users(supervisor_id);

-- reports
create index if not exists idx_reports_user_active on public.reports(user_id, is_deleted) where is_deleted = false;
create index if not exists idx_reports_user_service on public.reports(user_id, service_code);
create index if not exists idx_reports_user_idnumber on public.reports(user_id, id_number);
create index if not exists idx_reports_created_at on public.reports(created_at desc);
-- قيد فريد على رمز الخدمة (لل تقارير غير المحذوفة فقط)
create unique index if not exists idx_reports_service_code_unique on public.reports(service_code) where is_deleted = false;

-- activities
create index if not exists idx_activities_user_read_created on public.activities(user_id, is_read, created_at desc);
create index if not exists idx_activities_report on public.activities(report_id);

-- user_limits
create index if not exists idx_user_limits_user_id on public.user_limits(user_id);
create index if not exists idx_user_limits_set_by on public.user_limits(set_by);

-- user_suspensions
create index if not exists idx_suspensions_user_id on public.user_suspensions(user_id);
create index if not exists idx_suspensions_suspended_by on public.user_suspensions(suspended_by);
create index if not exists idx_suspensions_active on public.user_suspensions(user_id, reactivated_at) where reactivated_at is null;

-- suspension_history
create index if not exists idx_suspension_history_user on public.suspension_history(user_id);

-- RLS off (default). Keep disabled while using anon key without JWT session binding.
-- If you later enable Supabase Auth, enable RLS and add policies accordingly.
