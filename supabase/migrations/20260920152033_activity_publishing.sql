-- Administrators are assigned by a project owner, never by browser sign-up.
create table public.activity_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.activity_admins enable row level security;
revoke all on public.activity_admins from anon, authenticated;
grant select on public.activity_admins to authenticated;
create policy activity_admin_self_read on public.activity_admins
  for select to authenticated using (user_id = (select auth.uid()));

create table public.lab_activities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  category text not null check (category in ('development', 'competition', 'education', 'presentation')),
  activity_date date,
  summary text not null check (char_length(btrim(summary)) between 1 and 300),
  body text not null check (char_length(btrim(body)) between 1 and 30000),
  link_url text check (link_url is null or (char_length(link_url) <= 2000 and link_url ~ '^https?://[^[:space:]]+$')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index lab_activities_recent on public.lab_activities (created_at desc, id desc) where deleted_at is null;
create index lab_activities_category_recent on public.lab_activities (category, created_at desc, id desc) where deleted_at is null;
alter table public.lab_activities enable row level security;
revoke all on public.lab_activities from anon, authenticated;
grant select on public.lab_activities to anon, authenticated;
grant insert (title, category, activity_date, summary, body, link_url) on public.lab_activities to authenticated;
grant update (title, category, activity_date, summary, body, link_url, deleted_at) on public.lab_activities to authenticated;
create policy activity_public_read on public.lab_activities
  for select to anon, authenticated using (deleted_at is null);
create policy activity_admin_read on public.lab_activities
  for select to authenticated using (exists (select 1 from public.activity_admins where user_id = (select auth.uid())));
create policy activity_admin_insert on public.lab_activities
  for insert to authenticated with check (exists (select 1 from public.activity_admins where user_id = (select auth.uid())));
create policy activity_admin_update on public.lab_activities
  for update to authenticated
  using (exists (select 1 from public.activity_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.activity_admins where user_id = (select auth.uid())));

create function public.touch_lab_activity() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.touch_lab_activity() from public, anon, authenticated;
create trigger lab_activity_updated before update on public.lab_activities
  for each row execute function public.touch_lab_activity();

-- The dashboard's automatic-RLS event trigger is not a public RPC endpoint.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
