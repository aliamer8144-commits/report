-- 03_seed.sql
-- Basic seed for local/testing. Do NOT use weak passwords in production.

-- users
insert into public.users (username, password, is_admin)
values
  ('admin', 'admin123', true)
on conflict (username) do nothing;

insert into public.users (username, password, is_admin)
values
  ('user1', 'user123', false)
on conflict (username) do nothing;

-- devices
with u as (
  select id from public.users where username = 'user1'
)
insert into public.authorized_devices (user_id, device_id, is_approved)
select u.id, 'web_seed_device', true from u
on conflict (user_id, device_id) do nothing;

-- reports
with u as (
  select id from public.users where username = 'user1'
)
insert into public.reports (
  user_id, service_code, id_number, name_ar, name_en, days_count,
  entry_date_gregorian, exit_date_gregorian,
  entry_date_hijri, exit_date_hijri,
  report_issue_date,
  nationality_ar, nationality_en,
  doctor_name_ar, doctor_name_en,
  job_title_ar, job_title_en,
  hospital_name_ar, hospital_name_en,
  print_date, print_time,
  is_deleted
)
select
  u.id,
  'SVC-001', '1234567890', 'مريض تجريبي', 'Test Patient', 3,
  current_date - interval '5 days', current_date - interval '2 days',
  '1447-09-01', '1447-09-04',
  current_date - interval '2 days',
  'السعودية', 'Saudi Arabia',
  'د. أحمد', 'Dr. Ahmed',
  'طبيب', 'Doctor',
  'مستشفى الرياض', 'Riyadh Hospital',
  to_char(current_date, 'FMDay, DD Month YYYY'), to_char(now(), 'HH12:MI AM'),
  false
from u
on conflict do nothing;

-- activities (sample)
with u as (
  select id from public.users where username = 'user1'
), r as (
  select id from public.reports order by created_at desc limit 1
)
insert into public.activities (user_id, report_id, activity_type, title, description)
select u.id, r.id, 'add', 'تم إضافة تقرير جديد', 'تقرير أولي تجريبي'
from u cross join r;


