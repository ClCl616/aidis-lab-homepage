begin;
create table public.site_pages (
 page text primary key check (page ~ '^[a-z0-9-]+\.html$'),
 kind text not null check(kind in ('member','content')),
 values jsonb not null default '{}' check(jsonb_typeof(values)='object' and octet_length(values::text)<=150000),
 updated_at timestamptz not null default now()
);
alter table public.site_pages enable row level security;
revoke all on public.site_pages from anon, authenticated;
grant select on public.site_pages to anon, authenticated;
grant update(values) on public.site_pages to authenticated;
create policy pages_public_read on public.site_pages for select to anon,authenticated using(true);
create table public.member_requests (
 user_id uuid primary key default auth.uid() references auth.users on delete cascade,
 email text not null default (auth.jwt()->>'email'),
 requested_page text not null references public.site_pages(page),
 message text not null default '' check(char_length(message)<=1000),
 member_page text unique references public.site_pages(page),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check ((status='approved' and member_page is not null) or (status<>'approved' and member_page is null))
);
alter table public.member_requests enable row level security;
revoke all on public.member_requests from anon,authenticated;
grant select on public.member_requests to authenticated;
grant insert(requested_page,message) on public.member_requests to authenticated;
grant update(member_page,status) on public.member_requests to authenticated;
create policy requests_read on public.member_requests for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.activity_admins where user_id=(select auth.uid())));
create policy requests_insert on public.member_requests for insert to authenticated with check(user_id=(select auth.uid()) and status='pending' and member_page is null and exists(select 1 from public.site_pages where page=requested_page and kind='member'));
create policy requests_admin_update on public.member_requests for update to authenticated using(exists(select 1 from public.activity_admins where user_id=(select auth.uid()))) with check(exists(select 1 from public.activity_admins where user_id=(select auth.uid())) and (member_page is null or exists(select 1 from public.site_pages where page=member_page and kind='member')));
create policy pages_update on public.site_pages for update to authenticated using(
 exists(select 1 from public.activity_admins where user_id=(select auth.uid())) or (kind='member' and exists(select 1 from public.member_requests where user_id=(select auth.uid()) and status='approved' and member_page=page))
) with check(
 exists(select 1 from public.activity_admins where user_id=(select auth.uid())) or (kind='member' and exists(select 1 from public.member_requests where user_id=(select auth.uid()) and status='approved' and member_page=page))
);
create trigger site_pages_updated before update on public.site_pages for each row execute function public.touch_lab_activity();
create trigger member_requests_updated before update on public.member_requests for each row execute function public.touch_lab_activity();
alter table public.lab_activities add column author_id uuid default auth.uid() references auth.users on delete set null;
alter table public.lab_activities add column status text not null default 'published' check(status in ('pending','published','rejected'));
alter table public.lab_activities alter column status set default 'pending';
alter table public.lab_activities add column review_note text not null default '' check(char_length(review_note)<=1000);
grant insert(status) on public.lab_activities to authenticated;
grant update(status,review_note) on public.lab_activities to authenticated;
drop policy activity_public_read on public.lab_activities;
create policy activity_public_read on public.lab_activities for select to anon,authenticated using(deleted_at is null and status='published');
create policy activity_author_read on public.lab_activities for select to authenticated using(author_id=(select auth.uid()) and deleted_at is null);
create policy activity_member_insert on public.lab_activities for insert to authenticated with check(author_id=(select auth.uid()) and status='pending' and deleted_at is null and exists(select 1 from public.member_requests where user_id=(select auth.uid()) and status='approved'));
create index activity_author on public.lab_activities(author_id,created_at desc);
create index activity_moderation on public.lab_activities(status,created_at desc) where deleted_at is null;
-- Images use new immutable object names, avoiding public-cache replacement issues.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('profile-photos','profile-photos',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy profile_photo_read on storage.objects for select to anon,authenticated using(bucket_id='profile-photos');
create policy profile_photo_insert on storage.objects for insert to authenticated with check(bucket_id='profile-photos' and (
 exists(select 1 from public.activity_admins where user_id=(select auth.uid())) or exists(select 1 from public.member_requests where user_id=(select auth.uid()) and status='approved' and member_page=(storage.foldername(name))[1])
));
commit;
