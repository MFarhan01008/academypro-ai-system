create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'owner' check (role in ('owner','admin','staff')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academy_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  academy_name text not null,
  slug text unique,
  phone text,
  whatsapp_number text,
  email text,
  address text,
  city text default 'Quetta',
  logo_url text,
  payment_qr_url text,
  theme_color text default '#2563eb',
  about_text text,
  default_monthly_fee numeric(12,2) not null default 0,
  fee_reminder_template text default 'Assalam o Alaikum, {student_name} ki {month} fee pending hai. Kindly fee clear kar dein. Regards, {academy_name}',
  admission_instructions text default 'Answer admission questions politely in simple Roman Urdu/English.',
  currency text not null default 'PKR',
  timezone text not null default 'Asia/Karachi',
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academy_settings(id) on delete cascade,
  class_name text not null,
  description text,
  default_monthly_fee numeric(12,2) not null default 0,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(academy_id,class_name), unique(id,academy_id)
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academy_settings(id) on delete cascade,
  class_id uuid,
  subject_name text not null,
  teacher_name text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,academy_id),
  constraint subjects_class_academy_fk foreign key (class_id,academy_id) references public.classes(id,academy_id) on delete set null
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academy_settings(id) on delete cascade,
  class_id uuid,
  subject_id uuid,
  full_name text not null,
  father_name text,
  phone text,
  guardian_phone text,
  address text,
  gender text check (gender in ('male','female','other')),
  date_of_birth date,
  admission_date date not null default current_date,
  monthly_fee numeric(12,2) not null default 0,
  status text not null default 'active' check (status in ('active','inactive','left')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,academy_id),
  constraint students_class_academy_fk foreign key (class_id,academy_id) references public.classes(id,academy_id) on delete set null,
  constraint students_subject_academy_fk foreign key (subject_id,academy_id) references public.subjects(id,academy_id) on delete set null
);

create table if not exists public.fees (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academy_settings(id) on delete cascade,
  student_id uuid not null,
  fee_month date not null,
  amount_due numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','due','partial','paid','cancelled')),
  due_date date,
  paid_date date,
  payment_method text check (payment_method in ('cash','bank','easypaisa','jazzcash','other')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id,fee_month),
  constraint fees_student_academy_fk foreign key (student_id,academy_id) references public.students(id,academy_id) on delete cascade
);

create table if not exists public.admission_leads (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academy_settings(id) on delete cascade,
  student_name text not null,
  parent_name text,
  phone text not null,
  interested_class text,
  subject_interest text,
  message text,
  status text not null default 'new' check (status in ('new','contacted','trial booked','admitted','rejected')),
  notes text,
  converted_student_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admission_leads_converted_student_fk foreign key (converted_student_id,academy_id) references public.students(id,academy_id) on delete set null
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academy_settings(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete cascade,
  user_message text not null,
  ai_response text not null default '',
  model text default 'gpt-4o-mini',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_academy_owner(p_academy_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.academy_settings where id=p_academy_id and owner_id=auth.uid());
$$;
create or replace function public.academy_exists(p_academy_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.academy_settings where id=p_academy_id and status='active');
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(user_id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email)) on conflict(user_id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

do $$ declare t text; begin foreach t in array array['profiles','academy_settings','classes','subjects','students','fees','admission_leads','ai_messages'] loop execute format('drop trigger if exists set_%s_updated_at on public.%I',t,t); execute format('create trigger set_%s_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t); end loop; end $$;

do $$ declare t text; begin foreach t in array array['profiles','academy_settings','classes','subjects','students','fees','admission_leads','ai_messages'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;

create policy "own profile select" on public.profiles for select to authenticated using (user_id=auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (user_id=auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

create policy "own academy all select" on public.academy_settings for select to authenticated using (owner_id=auth.uid());
create policy "own academy insert" on public.academy_settings for insert to authenticated with check (owner_id=auth.uid());
create policy "own academy update" on public.academy_settings for update to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy "own academy delete" on public.academy_settings for delete to authenticated using (owner_id=auth.uid());

create policy "classes select" on public.classes for select to authenticated using (public.is_academy_owner(academy_id));
create policy "classes insert" on public.classes for insert to authenticated with check (public.is_academy_owner(academy_id));
create policy "classes update" on public.classes for update to authenticated using (public.is_academy_owner(academy_id)) with check (public.is_academy_owner(academy_id));
create policy "classes delete" on public.classes for delete to authenticated using (public.is_academy_owner(academy_id));

create policy "subjects select" on public.subjects for select to authenticated using (public.is_academy_owner(academy_id));
create policy "subjects insert" on public.subjects for insert to authenticated with check (public.is_academy_owner(academy_id));
create policy "subjects update" on public.subjects for update to authenticated using (public.is_academy_owner(academy_id)) with check (public.is_academy_owner(academy_id));
create policy "subjects delete" on public.subjects for delete to authenticated using (public.is_academy_owner(academy_id));

create policy "students select" on public.students for select to authenticated using (public.is_academy_owner(academy_id));
create policy "students insert" on public.students for insert to authenticated with check (public.is_academy_owner(academy_id));
create policy "students update" on public.students for update to authenticated using (public.is_academy_owner(academy_id)) with check (public.is_academy_owner(academy_id));
create policy "students delete" on public.students for delete to authenticated using (public.is_academy_owner(academy_id));

create policy "fees select" on public.fees for select to authenticated using (public.is_academy_owner(academy_id));
create policy "fees insert" on public.fees for insert to authenticated with check (public.is_academy_owner(academy_id));
create policy "fees update" on public.fees for update to authenticated using (public.is_academy_owner(academy_id)) with check (public.is_academy_owner(academy_id));
create policy "fees delete" on public.fees for delete to authenticated using (public.is_academy_owner(academy_id));

create policy "leads owner select" on public.admission_leads for select to authenticated using (public.is_academy_owner(academy_id));
create policy "leads owner insert" on public.admission_leads for insert to authenticated with check (public.is_academy_owner(academy_id));
create policy "leads owner update" on public.admission_leads for update to authenticated using (public.is_academy_owner(academy_id)) with check (public.is_academy_owner(academy_id));
create policy "leads owner delete" on public.admission_leads for delete to authenticated using (public.is_academy_owner(academy_id));
create policy "public leads insert" on public.admission_leads for insert to anon with check (public.academy_exists(academy_id) and status='new');

create policy "ai select" on public.ai_messages for select to authenticated using (public.is_academy_owner(academy_id));
create policy "ai insert" on public.ai_messages for insert to authenticated with check (public.is_academy_owner(academy_id));
create policy "ai update" on public.ai_messages for update to authenticated using (public.is_academy_owner(academy_id)) with check (public.is_academy_owner(academy_id));
create policy "ai delete" on public.ai_messages for delete to authenticated using (public.is_academy_owner(academy_id));

grant usage on schema public to anon, authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant insert on public.admission_leads to anon;
grant execute on function public.is_academy_owner(uuid) to authenticated;
grant execute on function public.academy_exists(uuid) to anon, authenticated;

-- AcademyPro AI v2 upgrade is also available separately in supabase/teacher-upgrade.sql.
-- If this schema is used on a fresh project, run teacher-upgrade.sql after this file.

-- AcademyPro AI v2 upgrade:
-- After running this base schema, also run supabase/teacher-upgrade.sql for teacher/schedule/salary modules.
