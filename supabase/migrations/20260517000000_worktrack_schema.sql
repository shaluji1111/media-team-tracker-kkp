create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('super_admin', 'manager', 'team_lead', 'employee');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_status as enum ('active', 'inactive', 'pending');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_status as enum ('done', 'in_progress', 'pending');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.approval_status as enum ('pending_tl', 'pending_manager', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.leave_type as enum ('sick', 'personal', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum ('proposal', 'leave', 'task_edit_warning', 'broadcast', 'security');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.audit_action as enum (
    'user_created',
    'user_deactivated',
    'user_reactivated',
    'password_reset',
    'task_library_changed',
    'proposal_reviewed',
    'leave_reviewed',
    'override',
    'broadcast_sent',
    'exported_report',
    'hierarchy_reassigned'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete restrict,
  jsid text not null unique check (jsid ~ '^JS[0-9]{4,5}$'),
  auth_email text not null unique,
  name text not null,
  role public.app_role not null,
  department text not null,
  manager_id uuid references public.users(id) on delete restrict,
  team_lead_id uuid references public.users(id) on delete restrict,
  status public.user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_login_done boolean not null default false,
  deactivated_at timestamptz,
  constraint worktrack_hierarchy_shape check (
    (role = 'super_admin' and manager_id is null and team_lead_id is null)
    or (role = 'manager' and manager_id is null and team_lead_id is null)
    or (role = 'team_lead' and manager_id is not null and team_lead_id is null)
    or (role = 'employee' and manager_id is null and team_lead_id is not null)
  )
);

create table if not exists public.task_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.task_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  platform_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false
);

create table if not exists public.task_time_values (
  id uuid primary key default gen_random_uuid(),
  task_library_id uuid not null references public.task_library(id) on delete restrict,
  time_minutes integer not null check (time_minutes > 0),
  effective_from_date date not null,
  created_at timestamptz not null default now(),
  unique (task_library_id, effective_from_date)
);

create table if not exists public.approved_custom_tasks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.users(id) on delete restrict,
  task_name text not null,
  category text not null,
  time_minutes integer not null check (time_minutes > 0),
  proposal_id uuid,
  approved_at timestamptz not null default now(),
  is_deleted boolean not null default false
);

create table if not exists public.task_logs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.users(id) on delete restrict,
  task_library_id uuid references public.task_library(id) on delete restrict,
  approved_custom_task_id uuid references public.approved_custom_tasks(id) on delete restrict,
  task_time_snapshot integer not null check (task_time_snapshot > 0),
  status public.task_status not null,
  notes text,
  proof_url text,
  project_tag text,
  logged_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_custom boolean not null default false,
  constraint task_log_single_source check (
    (task_library_id is not null and approved_custom_task_id is null and is_custom = false)
    or (task_library_id is null and approved_custom_task_id is not null and is_custom = true)
  )
);

create table if not exists public.custom_task_proposals (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.users(id) on delete restrict,
  task_name text not null,
  description text not null,
  category text not null,
  proposed_time integer not null check (proposed_time > 0),
  status public.approval_status not null default 'pending_tl',
  reviewed_by uuid references public.users(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.users(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  leave_type public.leave_type not null,
  reason text not null,
  status public.approval_status not null default 'pending_tl',
  reviewed_by uuid references public.users(id) on delete set null,
  override_by uuid references public.users(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  message text not null,
  type public.notification_type not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  date date not null,
  score numeric,
  calculated_from text not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.self_registration_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text not null,
  requested_role public.app_role not null default 'employee',
  status public.approval_status not null default 'pending_tl',
  created_at timestamptz not null default now(),
  decided_by uuid references public.users(id) on delete set null,
  decided_at timestamptz,
  note text
);

create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  jsid text not null,
  user_id uuid references public.users(id) on delete restrict,
  status public.approval_status not null default 'pending_tl',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.users(id) on delete set null
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  target_id uuid,
  action public.audit_action not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.task_categories (name)
values ('Graphic Design'), ('Video Editing'), ('Copywriting'), ('Social Media Management'), ('Strategy'), ('Admin Work')
on conflict (name) do nothing;

insert into public.platform_tags (name)
values ('Instagram'), ('YouTube'), ('Facebook'), ('LinkedIn'), ('TikTok'), ('Twitter/X'), ('General')
on conflict (name) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('task-proofs', 'task-proofs', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false;

create or replace function public.current_app_user()
returns public.users
language sql
stable
security definer
set search_path = public
as $$
  select * from public.users where id = auth.uid()
$$;

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid() and status = 'active'
$$;

create or replace function public.is_active_app_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and status = 'active'
  )
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'super_admin'
$$;

create or replace function public.can_view_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_app_user() and (
    public.is_super_admin()
    or target_user_id = auth.uid()
    or exists (
      select 1 from public.users viewer
      join public.users target on target.id = target_user_id
      where viewer.id = auth.uid()
      and viewer.role = 'team_lead'
      and target.team_lead_id = viewer.id
    )
    or exists (
      select 1
      from public.users viewer
      join public.users tl on tl.manager_id = viewer.id
      join public.users target on target.id = target_user_id
      where viewer.id = auth.uid()
      and viewer.role = 'manager'
      and (target.id = tl.id or target.team_lead_id = tl.id)
    )
  )
$$;

create or replace function public.resolve_jsid_login(input_jsid text)
returns table(auth_email text)
language sql
security definer
set search_path = public
as $$
  select u.auth_email
  from public.users u
  where u.jsid = upper(input_jsid)
  and u.status = 'active'
  limit 1
$$;

create or replace function public.mark_first_login_done()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set first_login_done = true, updated_at = now()
  where id = auth.uid() and status = 'active';
end;
$$;

create or replace function public.request_password_reset_by_jsid(input_jsid text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user public.users;
begin
  select * into target_user from public.users where jsid = upper(input_jsid) and status = 'active';
  if target_user.id is null then
    return;
  end if;

  if exists (
    select 1 from public.password_reset_requests
    where user_id = target_user.id and resolved_at is null
  ) then
    return;
  end if;

  insert into public.password_reset_requests(jsid, user_id) values (target_user.jsid, target_user.id);

  insert into public.notifications(user_id, message, type)
  select id, 'Password reset requested for ' || target_user.jsid, 'security'
  from public.users
  where role = 'super_admin' and status = 'active';
end;
$$;

create or replace function public.submit_self_registration(
  input_name text,
  input_department text,
  input_requested_role text default 'employee'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  requested public.app_role;
begin
  requested := coalesce(nullif(input_requested_role, '')::public.app_role, 'employee'::public.app_role);
  insert into public.self_registration_requests(name, department, requested_role, status)
  values (input_name, input_department, requested, 'pending_tl');
  insert into public.notifications(user_id, message, type)
  select id, 'New self-registration pending approval', 'security'
  from public.users
  where role = 'super_admin' and status = 'active';
end;
$$;

create or replace function public.generate_jsid()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number integer;
begin
  select coalesce(max(substring(jsid from 3)::integer), 0) + 1 into next_number from public.users;
  return 'JS' || lpad(next_number::text, 4, '0');
end;
$$;

create or replace function public.current_task_minutes(input_task_id uuid, input_date date default ((now() at time zone 'Asia/Kolkata')::date))
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select time_minutes
  from public.task_time_values
  where task_library_id = input_task_id
  and effective_from_date <= input_date
  order by effective_from_date desc
  limit 1
$$;

create or replace function public.set_task_time_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.task_library_id is not null then
    new.task_time_snapshot := public.current_task_minutes(new.task_library_id, (new.logged_at at time zone 'Asia/Kolkata')::date);
  elsif new.approved_custom_task_id is not null then
    select time_minutes into new.task_time_snapshot
    from public.approved_custom_tasks
    where id = new.approved_custom_task_id and employee_id = new.employee_id and is_deleted = false;
  end if;

  if new.task_time_snapshot is null then
    raise exception 'No task time value is available';
  end if;
  return new;
end;
$$;

drop trigger if exists task_logs_snapshot_before_insert on public.task_logs;
create trigger task_logs_snapshot_before_insert
before insert on public.task_logs
for each row execute function public.set_task_time_snapshot();

create or replace function public.prevent_task_log_late_edit()
returns trigger
language plpgsql
as $$
begin
  if old.logged_at < now() - interval '24 hours' then
    raise exception 'Task logs can only be edited within 24 hours';
  end if;
  new.employee_id := old.employee_id;
  new.task_library_id := old.task_library_id;
  new.approved_custom_task_id := old.approved_custom_task_id;
  new.task_time_snapshot := old.task_time_snapshot;
  new.logged_at := old.logged_at;
  new.is_custom := old.is_custom;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists task_logs_prevent_late_edit on public.task_logs;
create trigger task_logs_prevent_late_edit
before update on public.task_logs
for each row execute function public.prevent_task_log_late_edit();

create or replace function public.employee_on_approved_leave(input_employee_id uuid, input_date date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.leave_requests
    where employee_id = input_employee_id
    and status = 'approved'
    and input_date between start_date and end_date
  )
$$;

create or replace function public.employee_daily_score(input_employee_id uuid, input_date date)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  total_minutes integer;
begin
  if public.employee_on_approved_leave(input_employee_id, input_date) then
    return null;
  end if;

  select coalesce(sum(task_time_snapshot), 0) into total_minutes
  from public.task_logs
  where employee_id = input_employee_id
  and (logged_at at time zone 'Asia/Kolkata')::date = input_date;

  if total_minutes = 0 then
    return null;
  end if;

  return least((total_minutes::numeric / 60 / 6) * 100, 100);
end;
$$;

create or replace function public.user_daily_score(input_user_id uuid, input_date date)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target public.users;
begin
  select * into target from public.users where id = input_user_id;
  if target.role = 'super_admin' then
    return null;
  elsif target.role = 'employee' then
    return public.employee_daily_score(input_user_id, input_date);
  elsif target.role = 'team_lead' then
    return (
      select avg(public.employee_daily_score(id, input_date))
      from public.users
      where team_lead_id = input_user_id and status = 'active'
    );
  else
    return (
      select avg(public.user_daily_score(id, input_date))
      from public.users
      where manager_id = input_user_id and status = 'active'
    );
  end if;
end;
$$;

create or replace function public.can_read_proof_object(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  owner_id uuid;
begin
  owner_id := (storage.foldername(object_name))[1]::uuid;
  return public.can_view_user(owner_id);
exception when others then
  return false;
end;
$$;

create or replace function public.revoke_user_sessions(input_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.refresh_tokens
  where session_id in (
    select id::text from auth.sessions where user_id = input_user_id
  );
  delete from auth.sessions where user_id = input_user_id;
end;
$$;

alter table public.users enable row level security;
alter table public.task_categories enable row level security;
alter table public.platform_tags enable row level security;
alter table public.task_library enable row level security;
alter table public.task_time_values enable row level security;
alter table public.approved_custom_tasks enable row level security;
alter table public.task_logs enable row level security;
alter table public.custom_task_proposals enable row level security;
alter table public.leave_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.performance_snapshots enable row level security;
alter table public.self_registration_requests enable row level security;
alter table public.password_reset_requests enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists users_select_tree on public.users;
create policy users_select_tree on public.users
for select using (public.can_view_user(id));

drop policy if exists users_super_admin_all on public.users;
create policy users_super_admin_all on public.users
for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists active_read_task_categories on public.task_categories;
create policy active_read_task_categories on public.task_categories for select using (public.is_active_app_user());
drop policy if exists active_read_platform_tags on public.platform_tags;
create policy active_read_platform_tags on public.platform_tags for select using (public.is_active_app_user());

drop policy if exists task_library_select on public.task_library;
create policy task_library_select on public.task_library
for select using (public.is_active_app_user());
drop policy if exists task_library_super_admin_write on public.task_library;
create policy task_library_super_admin_write on public.task_library
for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists task_time_values_select on public.task_time_values;
create policy task_time_values_select on public.task_time_values
for select using (public.is_active_app_user());
drop policy if exists task_time_values_super_admin_write on public.task_time_values;
create policy task_time_values_super_admin_write on public.task_time_values
for insert with check (public.is_super_admin());

drop policy if exists approved_custom_tasks_select on public.approved_custom_tasks;
create policy approved_custom_tasks_select on public.approved_custom_tasks
for select using (public.can_view_user(employee_id));

drop policy if exists task_logs_select_tree on public.task_logs;
create policy task_logs_select_tree on public.task_logs
for select using (public.can_view_user(employee_id));

drop policy if exists task_logs_employee_insert on public.task_logs;
create policy task_logs_employee_insert on public.task_logs
for insert with check (
  employee_id = auth.uid()
  and public.current_role() = 'employee'
);

drop policy if exists task_logs_employee_edit on public.task_logs;
create policy task_logs_employee_edit on public.task_logs
for update using (
  employee_id = auth.uid()
  and public.current_role() = 'employee'
  and logged_at >= now() - interval '24 hours'
) with check (
  employee_id = auth.uid()
  and public.current_role() = 'employee'
);

drop policy if exists proposal_select_tree on public.custom_task_proposals;
create policy proposal_select_tree on public.custom_task_proposals
for select using (public.can_view_user(employee_id));
drop policy if exists proposal_employee_insert on public.custom_task_proposals;
create policy proposal_employee_insert on public.custom_task_proposals
for insert with check (employee_id = auth.uid() and public.current_role() = 'employee');
drop policy if exists proposal_manager_update on public.custom_task_proposals;
create policy proposal_manager_update on public.custom_task_proposals
for update using (public.can_view_user(employee_id) and public.current_role() in ('team_lead', 'manager', 'super_admin'));

drop policy if exists leave_select_tree on public.leave_requests;
create policy leave_select_tree on public.leave_requests
for select using (public.can_view_user(employee_id));
drop policy if exists leave_employee_insert on public.leave_requests;
create policy leave_employee_insert on public.leave_requests
for insert with check (employee_id = auth.uid() and public.current_role() = 'employee');
drop policy if exists leave_manager_update on public.leave_requests;
create policy leave_manager_update on public.leave_requests
for update using (public.can_view_user(employee_id) and public.current_role() in ('team_lead', 'manager', 'super_admin'));

drop policy if exists notifications_own_select on public.notifications;
create policy notifications_own_select on public.notifications
for select using (user_id = auth.uid() and public.is_active_app_user());
drop policy if exists notifications_own_update on public.notifications;
create policy notifications_own_update on public.notifications
for update using (user_id = auth.uid() and public.is_active_app_user())
with check (user_id = auth.uid());
drop policy if exists notifications_admin_insert on public.notifications;
create policy notifications_admin_insert on public.notifications
for insert with check (public.is_super_admin());

drop policy if exists performance_select_tree on public.performance_snapshots;
create policy performance_select_tree on public.performance_snapshots
for select using (public.can_view_user(user_id));

drop policy if exists audit_super_admin_read on public.audit_events;
create policy audit_super_admin_read on public.audit_events
for select using (public.is_super_admin());

drop policy if exists proof_read_tree on storage.objects;
create policy proof_read_tree on storage.objects
for select using (
  bucket_id = 'task-proofs'
  and public.can_read_proof_object(name)
);

drop policy if exists proof_employee_insert on storage.objects;
create policy proof_employee_insert on storage.objects
for insert with check (
  bucket_id = 'task-proofs'
  and (storage.foldername(name))[1]::uuid = auth.uid()
  and public.current_role() = 'employee'
);

drop policy if exists proof_employee_update on storage.objects;
create policy proof_employee_update on storage.objects
for update using (
  bucket_id = 'task-proofs'
  and (storage.foldername(name))[1]::uuid = auth.uid()
  and public.current_role() = 'employee'
);
