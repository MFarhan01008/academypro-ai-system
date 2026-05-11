-- Temporary practical MVP policy: allow logged-in admin users to read/manage admin tables.
-- Use this if students exist in Table Editor but admin UI still shows 0.

alter table public.students enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.teachers enable row level security;
alter table public.class_schedules enable row level security;

drop policy if exists "admin authenticated students read" on public.students;
drop policy if exists "admin authenticated students insert" on public.students;
drop policy if exists "admin authenticated students update" on public.students;
drop policy if exists "admin authenticated students delete" on public.students;

create policy "admin authenticated students read" on public.students
for select to authenticated using (true);
create policy "admin authenticated students insert" on public.students
for insert to authenticated with check (true);
create policy "admin authenticated students update" on public.students
for update to authenticated using (true) with check (true);
create policy "admin authenticated students delete" on public.students
for delete to authenticated using (true);

drop policy if exists "admin authenticated classes read" on public.classes;
create policy "admin authenticated classes read" on public.classes
for select to authenticated using (true);

drop policy if exists "admin authenticated subjects read" on public.subjects;
create policy "admin authenticated subjects read" on public.subjects
for select to authenticated using (true);

drop policy if exists "admin authenticated teachers read" on public.teachers;
create policy "admin authenticated teachers read" on public.teachers
for select to authenticated using (true);

drop policy if exists "admin authenticated schedules read" on public.class_schedules;
create policy "admin authenticated schedules read" on public.class_schedules
for select to authenticated using (true);
