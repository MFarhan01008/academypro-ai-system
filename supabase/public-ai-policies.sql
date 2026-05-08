-- Public website / AI chat read permissions
alter table public.academy_settings enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;

-- These two tables exist after running teacher-upgrade.sql
alter table if exists public.teachers enable row level security;
alter table if exists public.class_schedules enable row level security;

drop policy if exists "Public can read active academy settings for AI chat" on public.academy_settings;
drop policy if exists "Public can read active classes for AI chat" on public.classes;
drop policy if exists "Public can read active subjects for AI chat" on public.subjects;
drop policy if exists "Public can read public teachers for AI chat" on public.teachers;
drop policy if exists "Public can read active schedules for AI chat" on public.class_schedules;

create policy "Public can read active academy settings for AI chat"
on public.academy_settings for select to anon using (status = 'active');

create policy "Public can read active classes for AI chat"
on public.classes for select to anon using (
  exists (select 1 from public.academy_settings a where a.id = classes.academy_id and a.status = 'active')
);

create policy "Public can read active subjects for AI chat"
on public.subjects for select to anon using (
  exists (select 1 from public.academy_settings a where a.id = subjects.academy_id and a.status = 'active')
);

create policy "Public can read public teachers for AI chat"
on public.teachers for select to anon using (
  status = 'active'
  and public_visible = true
  and exists (select 1 from public.academy_settings a where a.id = teachers.academy_id and a.status = 'active')
);

create policy "Public can read active schedules for AI chat"
on public.class_schedules for select to anon using (
  status = 'active'
  and exists (select 1 from public.academy_settings a where a.id = class_schedules.academy_id and a.status = 'active')
);

grant select on public.academy_settings to anon;
grant select on public.classes to anon;
grant select on public.subjects to anon;
grant select on public.teachers to anon;
grant select on public.class_schedules to anon;
