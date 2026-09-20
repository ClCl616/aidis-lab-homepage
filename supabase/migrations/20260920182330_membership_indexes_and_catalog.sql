create index member_requests_requested_page on public.member_requests(requested_page);
drop policy activity_public_read on public.lab_activities;
drop policy activity_admin_read on public.lab_activities;
drop policy activity_author_read on public.lab_activities;
create policy activity_anon_read on public.lab_activities for select to anon using(deleted_at is null and status='published');
create policy activity_authenticated_read on public.lab_activities for select to authenticated using(
(deleted_at is null and status='published') or (deleted_at is null and author_id=(select auth.uid())) or exists(select 1 from public.activity_admins where user_id=(select auth.uid())));
drop policy activity_admin_insert on public.lab_activities;
drop policy activity_member_insert on public.lab_activities;
create policy activity_authorized_insert on public.lab_activities for insert to authenticated with check(
exists(select 1 from public.activity_admins where user_id=(select auth.uid())) or (
author_id=(select auth.uid()) and status='pending' and deleted_at is null and exists(select 1 from public.member_requests where user_id=(select auth.uid()) and status='approved')));
insert into public.site_pages(page,kind) values ('about.html','content'),('activities.html','content'),('activity-kpaas.html','content'),('contact.html','content'),('index.html','content'),('member-ahn-chiwoo.html','member'),('member-choi-seoyeong.html','member'),('member-choi-suyeon.html','member'),('member-jeong-jaehyeong.html','member'),('member-jeong-seonju.html','member'),('member-lee-taegyu.html','member'),('member-yoon-jongmin.html','member'),('member-yu-nagyeong.html','member'),('members.html','content'),('professor.html','content'),('research.html','content'),('member-kim-jinwon.html','member'),('member-song-daeyoung.html','member'),('member-park-seonga.html','member'),('member-park-siyoung.html','member') on conflict(page) do nothing;
