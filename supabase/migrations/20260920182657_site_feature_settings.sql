create table public.site_settings(
 id boolean primary key default true check(id),
 membership_open boolean not null default true,
 profile_editing boolean not null default true,
 activity_submissions boolean not null default true,
 activities_visible boolean not null default true,
 updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon,authenticated;
grant select on public.site_settings to anon,authenticated;
grant update(membership_open,profile_editing,activity_submissions,activities_visible) on public.site_settings to authenticated;
create policy settings_read on public.site_settings for select to anon,authenticated using(true);
create policy settings_admin_update on public.site_settings for update to authenticated using(exists(select 1 from public.activity_admins where user_id=(select auth.uid()))) with check(exists(select 1 from public.activity_admins where user_id=(select auth.uid())));
create trigger site_settings_updated before update on public.site_settings for each row execute function public.touch_lab_activity();
insert into public.site_settings(id) values(true);
create policy requests_feature_gate on public.member_requests as restrictive for insert to authenticated with check((select membership_open from public.site_settings where id));
create policy profiles_feature_gate on public.site_pages as restrictive for update to authenticated using(
 (select profile_editing from public.site_settings where id) or exists(select 1 from public.activity_admins where user_id=(select auth.uid()))
) with check((select profile_editing from public.site_settings where id) or exists(select 1 from public.activity_admins where user_id=(select auth.uid())));
create policy submissions_feature_gate on public.lab_activities as restrictive for insert to authenticated with check(
 (select activity_submissions from public.site_settings where id) or exists(select 1 from public.activity_admins where user_id=(select auth.uid())));
create policy visibility_anon_gate on public.lab_activities as restrictive for select to anon using((select activities_visible from public.site_settings where id));
create policy visibility_authenticated_gate on public.lab_activities as restrictive for select to authenticated using(
 (select activities_visible from public.site_settings where id) or author_id=(select auth.uid()) or exists(select 1 from public.activity_admins where user_id=(select auth.uid())));
