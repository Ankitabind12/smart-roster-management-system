-- ============================================================
-- RosterFlow â€” Initial Schema Migration
-- 001_initial_schema.sql
-- ============================================================

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- EXTENSIONS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- ENUMS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create type user_role as enum ('admin', 'operations_manager', 'pod_lead', 'employee');
create type employment_status as enum ('active', 'inactive', 'on_leave', 'terminated');
create type leave_type as enum ('casual', 'sick', 'earned', 'unpaid', 'comp_off', 'other');
create type leave_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');
create type task_status as enum ('assigned', 'in_progress', 'completed', 'cancelled', 'overdue');
create type roster_status as enum ('draft', 'published', 'archived');
create type schedule_status as enum ('working', 'weekly_off', 'leave', 'comp_off', 'public_holiday', 'not_required', 'conflict');
create type notification_type as enum (
  'task_assigned', 'task_updated', 'task_completed',
  'leave_approved', 'leave_rejected', 'leave_submitted',
  'roster_published', 'roster_updated',
  'comp_off_assigned', 'announcement'
);
create type conflict_severity as enum ('critical', 'warning', 'info');
create type process_type as enum ('cs', 'acc', 'ndr', 'retention', 'order_management', 'other');

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- HELPER: updated_at trigger function
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: profiles
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  full_name    text,
  avatar_url   text,
  phone        text,
  role         user_role not null default 'employee',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;

create policy "profiles_select_authenticated"
  on profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_insert_own"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: pods
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table pods (
  id           uuid primary key default gen_random_uuid(),
  pod_name     text not null,
  pod_code     text not null unique,
  description  text,
  pod_lead_id  uuid references profiles(id) on delete set null,
  status       text not null default 'active' check (status in ('active','inactive')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_pods_updated_at
  before update on pods
  for each row execute function set_updated_at();

alter table pods enable row level security;

create policy "pods_select_authenticated"
  on pods for select to authenticated using (true);

create policy "pods_insert_manager"
  on pods for insert to authenticated
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin','operations_manager')
    )
  );

create policy "pods_update_manager"
  on pods for update to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin','operations_manager')
    )
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: brands
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table brands (
  id                      uuid primary key default gen_random_uuid(),
  brand_name              text not null,
  brand_code              text not null unique,
  description             text,
  status                  text not null default 'active' check (status in ('active','inactive')),
  operates_365            boolean not null default false,
  operates_on_sundays     boolean not null default true,
  operates_on_holidays    boolean not null default false,
  min_daily_staff         integer not null default 1,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger trg_brands_updated_at
  before update on brands
  for each row execute function set_updated_at();

alter table brands enable row level security;

create policy "brands_select_authenticated"
  on brands for select to authenticated using (true);

create policy "brands_insert_manager"
  on brands for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "brands_update_manager"
  on brands for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: processes
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table processes (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  code                 text not null unique,
  description          text,
  brand_id             uuid not null references brands(id) on delete cascade,
  process_type         process_type not null default 'other',
  min_daily_staff      integer not null default 1,
  operates_on_sundays  boolean not null default true,
  operates_on_holidays boolean not null default false,
  status               text not null default 'active' check (status in ('active','inactive')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index idx_processes_brand_id on processes(brand_id);

create trigger trg_processes_updated_at
  before update on processes
  for each row execute function set_updated_at();

alter table processes enable row level security;

create policy "processes_select_authenticated"
  on processes for select to authenticated using (true);

create policy "processes_insert_manager"
  on processes for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "processes_update_manager"
  on processes for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: employees
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table employees (
  id                       uuid primary key default gen_random_uuid(),
  employee_id              text not null unique,
  user_id                  uuid references profiles(id) on delete set null,
  full_name                text not null,
  email                    text not null unique,
  phone                    text,
  designation              text,
  role                     user_role not null default 'employee',
  department               text,
  pod_id                   uuid references pods(id) on delete set null,
  joining_date             date,
  employment_status        employment_status not null default 'active',
  weekly_off_day           integer not null default 0 check (weekly_off_day between 0 and 6),
  secondary_weekly_off_day integer check (secondary_weekly_off_day between 0 and 6),
  working_hours            numeric(4,2) not null default 8.0,
  skills                   text[] not null default '{}',
  notes                    text,
  avatar_url               text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index idx_employees_pod_id on employees(pod_id);
create index idx_employees_employment_status on employees(employment_status);
create index idx_employees_user_id on employees(user_id);

create trigger trg_employees_updated_at
  before update on employees
  for each row execute function set_updated_at();

alter table employees enable row level security;

create policy "employees_select_authenticated"
  on employees for select to authenticated using (true);

create policy "employees_insert_manager"
  on employees for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "employees_update_manager"
  on employees for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "employees_delete_admin"
  on employees for delete to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: employee_brand_assignments
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table employee_brand_assignments (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references employees(id) on delete cascade,
  brand_id      uuid not null references brands(id) on delete cascade,
  is_primary    boolean not null default false,
  assigned_date date not null default current_date,
  created_at    timestamptz not null default now(),
  unique (employee_id, brand_id)
);

create index idx_emp_brand_employee_id on employee_brand_assignments(employee_id);
create index idx_emp_brand_brand_id on employee_brand_assignments(brand_id);

alter table employee_brand_assignments enable row level security;

create policy "emp_brand_select_authenticated"
  on employee_brand_assignments for select to authenticated using (true);

create policy "emp_brand_insert_manager"
  on employee_brand_assignments for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "emp_brand_update_manager"
  on employee_brand_assignments for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "emp_brand_delete_manager"
  on employee_brand_assignments for delete to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: employee_process_assignments
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table employee_process_assignments (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references employees(id) on delete cascade,
  process_id    uuid not null references processes(id) on delete cascade,
  is_primary    boolean not null default false,
  assigned_date date not null default current_date,
  created_at    timestamptz not null default now(),
  unique (employee_id, process_id)
);

create index idx_emp_process_employee_id on employee_process_assignments(employee_id);
create index idx_emp_process_process_id on employee_process_assignments(process_id);

alter table employee_process_assignments enable row level security;

create policy "emp_process_select_authenticated"
  on employee_process_assignments for select to authenticated using (true);

create policy "emp_process_insert_manager"
  on employee_process_assignments for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "emp_process_update_manager"
  on employee_process_assignments for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "emp_process_delete_manager"
  on employee_process_assignments for delete to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: pod_brand_assignments
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table pod_brand_assignments (
  id         uuid primary key default gen_random_uuid(),
  pod_id     uuid not null references pods(id) on delete cascade,
  brand_id   uuid not null references brands(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (pod_id, brand_id)
);

create index idx_pod_brand_pod_id on pod_brand_assignments(pod_id);
create index idx_pod_brand_brand_id on pod_brand_assignments(brand_id);

alter table pod_brand_assignments enable row level security;

create policy "pod_brand_select_authenticated"
  on pod_brand_assignments for select to authenticated using (true);

create policy "pod_brand_insert_manager"
  on pod_brand_assignments for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "pod_brand_delete_manager"
  on pod_brand_assignments for delete to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: holidays
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table holidays (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  date         date not null unique,
  holiday_type text not null default 'national' check (holiday_type in ('national','regional','optional','company')),
  description  text,
  is_national  boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_holidays_date on holidays(date);

create trigger trg_holidays_updated_at
  before update on holidays
  for each row execute function set_updated_at();

alter table holidays enable row level security;

create policy "holidays_select_authenticated"
  on holidays for select to authenticated using (true);

create policy "holidays_insert_manager"
  on holidays for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "holidays_update_manager"
  on holidays for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "holidays_delete_admin"
  on holidays for delete to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: brand_holiday_rules
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table brand_holiday_rules (
  id             uuid primary key default gen_random_uuid(),
  brand_id       uuid not null references brands(id) on delete cascade,
  holiday_id     uuid not null references holidays(id) on delete cascade,
  is_operational boolean not null default false,
  created_at     timestamptz not null default now(),
  unique (brand_id, holiday_id)
);

create index idx_brand_holiday_brand_id on brand_holiday_rules(brand_id);
create index idx_brand_holiday_holiday_id on brand_holiday_rules(holiday_id);

alter table brand_holiday_rules enable row level security;

create policy "brand_holiday_select_authenticated"
  on brand_holiday_rules for select to authenticated using (true);

create policy "brand_holiday_insert_manager"
  on brand_holiday_rules for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "brand_holiday_update_manager"
  on brand_holiday_rules for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: weekly_off_rules
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table weekly_off_rules (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references employees(id) on delete cascade,
  effective_from date not null,
  effective_to   date,
  day_of_week    integer not null check (day_of_week between 0 and 6),
  is_primary     boolean not null default true,
  created_at     timestamptz not null default now()
);

create index idx_weekly_off_employee_id on weekly_off_rules(employee_id);

alter table weekly_off_rules enable row level security;

create policy "weekly_off_select_authenticated"
  on weekly_off_rules for select to authenticated using (true);

create policy "weekly_off_insert_manager"
  on weekly_off_rules for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "weekly_off_update_manager"
  on weekly_off_rules for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: leave_requests
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table leave_requests (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references employees(id) on delete cascade,
  leave_type    leave_type not null,
  start_date    date not null,
  end_date      date not null,
  reason        text,
  status        leave_status not null default 'pending',
  reviewed_by   uuid references profiles(id) on delete set null,
  review_notes  text,
  submitted_at  timestamptz not null default now(),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (end_date >= start_date)
);

create index idx_leave_employee_status on leave_requests(employee_id, status);
create index idx_leave_dates on leave_requests(start_date, end_date);

create trigger trg_leave_requests_updated_at
  before update on leave_requests
  for each row execute function set_updated_at();

alter table leave_requests enable row level security;

create policy "leave_select_own"
  on leave_requests for select to authenticated
  using (
    employee_id in (select id from employees where user_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager','pod_lead'))
  );

create policy "leave_insert_own"
  on leave_requests for insert to authenticated
  with check (
    employee_id in (select id from employees where user_id = auth.uid())
  );

create policy "leave_update_manager"
  on leave_requests for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager','pod_lead'))
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: comp_offs
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table comp_offs (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references employees(id) on delete cascade,
  earned_date   date not null,
  assigned_date date,
  reason        text,
  status        text not null default 'earned' check (status in ('earned','assigned','used','expired')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_comp_offs_employee_id on comp_offs(employee_id);
create index idx_comp_offs_status on comp_offs(status);

create trigger trg_comp_offs_updated_at
  before update on comp_offs
  for each row execute function set_updated_at();

alter table comp_offs enable row level security;

create policy "comp_offs_select_own"
  on comp_offs for select to authenticated
  using (
    employee_id in (select id from employees where user_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager','pod_lead'))
  );

create policy "comp_offs_insert_manager"
  on comp_offs for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "comp_offs_update_manager"
  on comp_offs for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: roster_periods
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table roster_periods (
  id             uuid primary key default gen_random_uuid(),
  month          integer not null check (month between 1 and 12),
  year           integer not null check (year > 2000),
  status         roster_status not null default 'draft',
  generated_at   timestamptz,
  published_at   timestamptz,
  generated_by   uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (month, year)
);

create trigger trg_roster_periods_updated_at
  before update on roster_periods
  for each row execute function set_updated_at();

alter table roster_periods enable row level security;

create policy "roster_periods_select_authenticated"
  on roster_periods for select to authenticated using (true);

create policy "roster_periods_insert_manager"
  on roster_periods for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "roster_periods_update_manager"
  on roster_periods for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: roster_entries
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table roster_entries (
  id                 uuid primary key default gen_random_uuid(),
  roster_period_id   uuid not null references roster_periods(id) on delete cascade,
  employee_id        uuid not null references employees(id) on delete cascade,
  date               date not null,
  schedule_status    schedule_status not null default 'working',
  brand_id           uuid references brands(id) on delete set null,
  process_id         uuid references processes(id) on delete set null,
  notes              text,
  is_manual_override boolean not null default false,
  override_by        uuid references profiles(id) on delete set null,
  override_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (roster_period_id, employee_id, date)
);

create index idx_roster_entries_period_date on roster_entries(roster_period_id, date);
create index idx_roster_entries_employee_id on roster_entries(employee_id);
create index idx_roster_entries_date on roster_entries(date);

create trigger trg_roster_entries_updated_at
  before update on roster_entries
  for each row execute function set_updated_at();

alter table roster_entries enable row level security;

create policy "roster_entries_select_authenticated"
  on roster_entries for select to authenticated using (true);

create policy "roster_entries_insert_manager"
  on roster_entries for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "roster_entries_update_manager"
  on roster_entries for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: scheduling_conflicts
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table scheduling_conflicts (
  id               uuid primary key default gen_random_uuid(),
  roster_period_id uuid not null references roster_periods(id) on delete cascade,
  employee_id      uuid references employees(id) on delete set null,
  brand_id         uuid references brands(id) on delete set null,
  process_id       uuid references processes(id) on delete set null,
  conflict_date    date not null,
  severity         conflict_severity not null default 'warning',
  title            text not null,
  description      text,
  suggested_action text,
  is_resolved      boolean not null default false,
  resolved_by      uuid references profiles(id) on delete set null,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now()
);

create index idx_conflicts_period_resolved on scheduling_conflicts(roster_period_id, is_resolved);
create index idx_conflicts_date on scheduling_conflicts(conflict_date);

alter table scheduling_conflicts enable row level security;

create policy "conflicts_select_authenticated"
  on scheduling_conflicts for select to authenticated using (true);

create policy "conflicts_insert_manager"
  on scheduling_conflicts for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "conflicts_update_manager"
  on scheduling_conflicts for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: tasks
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table tasks (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text,
  assigned_to       uuid not null references employees(id) on delete cascade,
  assigned_by       uuid not null references profiles(id) on delete cascade,
  brand_id          uuid references brands(id) on delete set null,
  process_id        uuid references processes(id) on delete set null,
  priority          task_priority not null default 'medium',
  status            task_status not null default 'assigned',
  start_date        date,
  due_date          date,
  completed_at      timestamptz,
  completion_notes  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_tasks_assigned_to_status on tasks(assigned_to, status);
create index idx_tasks_due_date on tasks(due_date);
create index idx_tasks_brand_id on tasks(brand_id);

create trigger trg_tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

alter table tasks enable row level security;

create policy "tasks_select_assignee_or_manager"
  on tasks for select to authenticated
  using (
    assigned_to in (select id from employees where user_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager','pod_lead'))
  );

create policy "tasks_insert_manager"
  on tasks for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager','pod_lead'))
  );

create policy "tasks_update_assignee_or_manager"
  on tasks for update to authenticated
  using (
    assigned_to in (select id from employees where user_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager','pod_lead'))
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: task_comments
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

create index idx_task_comments_task_id on task_comments(task_id);

alter table task_comments enable row level security;

create policy "task_comments_select"
  on task_comments for select to authenticated
  using (
    task_id in (
      select id from tasks
      where assigned_to in (select id from employees where user_id = auth.uid())
        or true  -- managers handled below
    )
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager','pod_lead'))
  );

create policy "task_comments_insert"
  on task_comments for insert to authenticated
  with check (author_id = auth.uid());

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: notifications
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table notifications (
  id                uuid primary key default gen_random_uuid(),
  recipient_id      uuid not null references profiles(id) on delete cascade,
  notification_type notification_type not null,
  title             text not null,
  message           text,
  related_id        uuid,
  related_type      text,
  is_read           boolean not null default false,
  created_at        timestamptz not null default now()
);

create index idx_notifications_recipient_read on notifications(recipient_id, is_read);
create index idx_notifications_created_at on notifications(created_at desc);

alter table notifications enable row level security;

create policy "notifications_select_own"
  on notifications for select to authenticated
  using (recipient_id = auth.uid());

create policy "notifications_update_own"
  on notifications for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy "notifications_insert_manager"
  on notifications for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
    or recipient_id = auth.uid()
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: email_logs
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table email_logs (
  id                  uuid primary key default gen_random_uuid(),
  recipient_email     text not null,
  recipient_name      text,
  email_type          text not null,
  subject             text not null,
  related_id          uuid,
  related_type        text,
  status              text not null default 'sent' check (status in ('sent','failed','skipped')),
  provider_message_id text,
  error_message       text,
  sent_at             timestamptz,
  created_at          timestamptz not null default now()
);

create index idx_email_logs_related on email_logs(related_id, related_type);
create index idx_email_logs_created_at on email_logs(created_at desc);

alter table email_logs enable row level security;

create policy "email_logs_select_admin"
  on email_logs for select to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "email_logs_insert_service"
  on email_logs for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: activity_logs
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table activity_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references profiles(id) on delete set null,
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  description  text,
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create index idx_activity_entity on activity_logs(entity_type, entity_id);
create index idx_activity_created_at on activity_logs(created_at desc);
create index idx_activity_actor_id on activity_logs(actor_id);

alter table activity_logs enable row level security;

create policy "activity_logs_select_manager"
  on activity_logs for select to authenticated
  using (
    actor_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','operations_manager'))
  );

create policy "activity_logs_insert"
  on activity_logs for insert to authenticated
  with check (true);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- TABLE: app_settings
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table app_settings (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  value       jsonb not null default 'null',
  description text,
  updated_by  uuid references profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);

create index idx_app_settings_key on app_settings(key);

alter table app_settings enable row level security;

create policy "app_settings_select_authenticated"
  on app_settings for select to authenticated using (true);

create policy "app_settings_insert_admin"
  on app_settings for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "app_settings_update_admin"
  on app_settings for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- =========================================================
-- PROFILES: Link demo auth users to profiles table
-- =========================================================
INSERT INTO profiles (id, email, full_name, role) VALUES
  ('313e4ee6-1102-4e77-9384-8eaefd9fab90', 'admin@rosterflow.demo', 'Admin User', 'admin'),
  ('eedd5fb7-7522-4dec-bcc2-e87a3dc08964', 'manager@rosterflow.demo', 'Sarah Chen', 'operations_manager'),
  ('7b824dd5-6eb2-47f2-9866-25ee986b7b43', 'podlead@rosterflow.demo', 'Marcus Johnson', 'pod_lead'),
  ('a9b6b401-0d8f-4d12-ad30-fbcb05cc8848', 'employee@rosterflow.demo', 'Priya Sharma', 'employee')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- Verify
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;