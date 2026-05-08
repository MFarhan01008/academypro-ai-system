-- AcademyPro AI v2 teacher, schedule, salary and public AI upgrade
create extension if not exists "pgcrypto";

alter table public.students add column if not exists student_code text;
alter table public.students add column if not exists teacher_id uuid;
alter table public.students add column if not exists schedule_id uuid;
alter table public.students add column if not exists batch_name text;
alter table public.fees add column if not exists teacher_id uuid;
alter table public.fees add column if not exists schedule_id uuid;

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academy_settings(id) on delete cascade,
  teacher_code text,
  full_name text not null,
  father_name text,
  photo_url text,
  phone text,
  whatsapp text,
  cnic text,
  address text,
  qualification text,
  experience_years integer not null default 0,
  subject_specialty text,
  bio text,
  joining_date date default current_date,
  monthly_salary numeric(12,2) not null default 0,
  status text not null default 'active' check (status in ('active','inactive','left')),
  public_visible boolean not null default true,
  featured boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, academy_id),
  unique(academy_id, teacher_code)
);

create table if not exists public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academy_settings(id) on delete cascade,
  class_id uuid,
  subject_id uuid,
  teacher_id uuid,
  batch_name text,
  days text,
  start_time time,
  end_time time,
  room text,
  monthly_fee numeric(12,2) not null default 0,
  status text not null default 'active' check (status in ('active','inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, academy_id)
);

create table if not exists public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academy_settings(id) on delete cascade,
  student_id uuid not null,
  class_id uuid,
  subject_id uuid,
  teacher_id uuid,
  schedule_id uuid,
  monthly_fee numeric(12,2) not null default 0,
  status text not null default 'active' check (status in ('active','inactive','left')),
  enrolled_at date not null default current_date,
  left_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_salaries (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academy_settings(id) on delete cascade,
  teacher_id uuid not null,
  salary_month date not null,
  base_salary numeric(12,2) not null default 0,
  bonus_amount numeric(12,2) not null default 0,
  deduction_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','partial','paid','cancelled')),
  paid_date date,
  payment_method text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.make_student_code() returns trigger language plpgsql as $$
begin if new.student_code is null or new.student_code = '' then new.student_code := 'STU-' || upper(substr(replace(new.id::text,'-',''),1,6)); end if; return new; end; $$;
drop trigger if exists set_student_code on public.students;
create trigger set_student_code before insert on public.students for each row execute function public.make_student_code();

create or replace function public.make_teacher_code() returns trigger language plpgsql as $$
begin if new.teacher_code is null or new.teacher_code = '' then new.teacher_code := 'TCH-' || upper(substr(replace(new.id::text,'-',''),1,6)); end if; return new; end; $$;
drop trigger if exists set_teacher_code on public.teachers;
create trigger set_teacher_code before insert on public.teachers for each row execute function public.make_teacher_code();

update public.students set student_code='STU-' || upper(substr(replace(id::text,'-',''),1,6)) where student_code is null;
update public.teachers set teacher_code='TCH-' || upper(substr(replace(id::text,'-',''),1,6)) where teacher_code is null;

do $$ declare t text; begin foreach t in array array['teachers','class_schedules','student_enrollments','teacher_salaries'] loop execute format('alter table public.%I enable row level security', t); end loop; end $$;

drop policy if exists "Owners can manage teachers" on public.teachers;
drop policy if exists "Owners can manage schedules" on public.class_schedules;
drop policy if exists "Owners can manage enrollments" on public.student_enrollments;
drop policy if exists "Owners can manage salaries" on public.teacher_salaries;
create policy "Owners can manage teachers" on public.teachers for all to authenticated using (public.is_academy_owner(academy_id)) with check (public.is_academy_owner(academy_id));
create policy "Owners can manage schedules" on public.class_schedules for all to authenticated using (public.is_academy_owner(academy_id)) with check (public.is_academy_owner(academy_id));
create policy "Owners can manage enrollments" on public.student_enrollments for all to authenticated using (public.is_academy_owner(academy_id)) with check (public.is_academy_owner(academy_id));
create policy "Owners can manage salaries" on public.teacher_salaries for all to authenticated using (public.is_academy_owner(academy_id)) with check (public.is_academy_owner(academy_id));

drop policy if exists "Public can read active academy settings for AI chat" on public.academy_settings;
drop policy if exists "Public can read active classes for AI chat" on public.classes;
drop policy if exists "Public can read active subjects for AI chat" on public.subjects;
drop policy if exists "Public can read active teachers" on public.teachers;
drop policy if exists "Public can read active schedules" on public.class_schedules;
create policy "Public can read active academy settings for AI chat" on public.academy_settings for select to anon using (status='active');
create policy "Public can read active classes for AI chat" on public.classes for select to anon using (exists(select 1 from public.academy_settings a where a.id=classes.academy_id and a.status='active'));
create policy "Public can read active subjects for AI chat" on public.subjects for select to anon using (exists(select 1 from public.academy_settings a where a.id=subjects.academy_id and a.status='active'));
create policy "Public can read active teachers" on public.teachers for select to anon using (status='active' and public_visible=true and exists(select 1 from public.academy_settings a where a.id=teachers.academy_id and a.status='active'));
create policy "Public can read active schedules" on public.class_schedules for select to anon using (status='active' and exists(select 1 from public.academy_settings a where a.id=class_schedules.academy_id and a.status='active'));

grant select on public.academy_settings, public.classes, public.subjects, public.teachers, public.class_schedules to anon;
grant select, insert, update, delete on public.teachers, public.class_schedules, public.student_enrollments, public.teacher_salaries to authenticated;
