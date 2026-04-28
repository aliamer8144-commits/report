-- 02_views.sql

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


