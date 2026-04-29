-- 02_views.sql
-- Views لنظام إدارة التقارير

-- ============================================================
-- user_report_counts - عدد التقارير لكل مستخدم (إجمالي)
-- ============================================================
create or replace view public.user_report_counts as
select
  u.id as user_id,
  u.username,
  count(r.*) filter (where r.id is not null) as total_reports,
  count(r.*) filter (where r.is_deleted = false) as active_reports,
  count(r.*) filter (where r.is_deleted = true) as deleted_reports,
  max(r.created_at) as last_report_created_at
from public.users u
left join public.reports r on r.user_id = u.id
group by u.id, u.username;

-- ============================================================
-- user_current_limit - آخر حد مسموح لكل مستخدم
-- ============================================================
create or replace view public.user_current_limit as
select distinct on (ul.user_id)
  ul.user_id,
  ul.limit_type,
  ul.limit_value,
  ul.limit_date,
  ul.set_by,
  ul.created_at as limit_set_at,
  u.username as set_by_username,
  u.full_name as set_by_full_name
from public.user_limits ul
join public.users u on u.id = ul.set_by
order by ul.user_id, ul.created_at desc;

-- ============================================================
-- user_suspension_status - حالة التعليق الحالية لكل مستخدم
-- ============================================================
create or replace view public.user_suspension_status as
select
  u.id as user_id,
  u.username,
  u.full_name,
  u.role,
  coalesce(s.is_suspended, false) as is_suspended,
  s.suspended_at,
  s.suspension_reason,
  s.reactivated_at,
  s.reactivated_by,
  s.days_count_at_suspension,
  s.reports_count_at_suspension
from public.users u
left join lateral (
  select
    true as is_suspended,
    us.suspended_at,
    us.suspension_reason,
    us.reactivated_at,
    us.reactivated_by,
    us.days_count_at_suspension,
    us.reports_count_at_suspension
  from public.user_suspensions us
  where us.user_id = u.id
    and us.reactivated_at is null
  order by us.suspended_at desc
  limit 1
) s on true;

-- ============================================================
-- user_period_stats - إحصائيات المستخدم منذ آخر فك تعليق
-- ============================================================
create or replace view public.user_period_stats as
select
  u.id as user_id,
  u.username,
  u.full_name,
  u.role,
  u.supervisor_id,
  u.created_at as user_created_at,
  coalesce(last_reactivation.last_reactivated_at, u.created_at) as period_start,
  coalesce(period_reports.report_count, 0) as period_report_count,
  coalesce(period_reports.total_days, 0) as period_total_days,
  period_reports.last_report_at,
  coalesce(suspension_count.total_suspensions, 0) as total_suspensions
from public.users u
left join lateral (
  select max(us.reactivated_at) as last_reactivated_at
  from public.user_suspensions us
  where us.user_id = u.id
    and us.reactivated_at is not null
) last_reactivation on true
left join lateral (
  select
    count(*) as report_count,
    coalesce(sum(r.days_count), 0) as total_days,
    max(r.created_at) as last_report_at
  from public.reports r
  where r.user_id = u.id
    and r.is_deleted = false
    and r.created_at >= coalesce(
      (select max(us2.reactivated_at)
       from public.user_suspensions us2
       where us2.user_id = u.id
         and us2.reactivated_at is not null),
      u.created_at
    )
) period_reports on true
left join lateral (
  select count(*) as total_suspensions
  from public.user_suspensions us
  where us.user_id = u.id
) suspension_count on true;

-- ============================================================
-- supervisor_users_stats - إحصائيات كل المستخدمين التابعين لكل مشرف
-- ============================================================
create or replace view public.supervisor_users_stats as
select
  sup.id as supervisor_id,
  sup.username as supervisor_username,
  sup.full_name as supervisor_full_name,
  usr.id as user_id,
  usr.username,
  usr.full_name,
  usr.phone,
  usr.email,
  usr.created_at as user_created_at,
  ps.period_report_count,
  ps.period_total_days,
  ps.total_suspensions,
  ps.last_report_at,
  uss.is_suspended,
  ucl.limit_type,
  ucl.limit_value,
  ucl.limit_date
from public.users sup
join public.users usr on usr.supervisor_id = sup.id
left join public.user_period_stats ps on ps.user_id = usr.id
left join public.user_suspension_status uss on uss.user_id = usr.id
left join public.user_current_limit ucl on ucl.user_id = usr.id
where usr.role = 'user';
