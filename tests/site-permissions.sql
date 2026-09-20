-- Run in Supabase SQL editor or execute_sql. Everything, including synthetic users, rolls back.
begin;
insert into auth.users(id,email) values
 ('11111111-1111-4111-8111-111111111111','rls-member@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','rls-other@example.invalid'),
 ('33333333-3333-4333-8333-333333333333','rls-admin@example.invalid');
insert into public.activity_admins values('33333333-3333-4333-8333-333333333333');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","email":"rls-member@example.invalid","role":"authenticated"}',true);
insert into public.member_requests(requested_page) values('member-lee-taegyu.html');
do $$ begin
  begin
    insert into public.lab_activities(title,category,summary,body) values('RLS verification','development','test','test');
    raise exception 'FAIL: unapproved user submitted';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from public.activity_admins) then raise exception 'FAIL: admin membership exposed'; end if;
  update public.member_requests set status='approved',member_page='member-lee-taegyu.html' where user_id=auth.uid();
  if found then raise exception 'FAIL: self approval'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
update public.member_requests set status='approved',member_page='member-lee-taegyu.html' where user_id='11111111-1111-4111-8111-111111111111';
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
do $$ begin
  update public.site_pages set values='{"test":"own profile"}' where page='member-lee-taegyu.html';
  if not found then raise exception 'FAIL: own profile denied'; end if;
  update public.site_pages set values='{"test":"other"}' where page='member-ahn-chiwoo.html';
  if found then raise exception 'FAIL: other profile editable'; end if;
  update public.site_pages set values='{"test":"site"}' where page='about.html';
  if found then raise exception 'FAIL: site editable by member'; end if;
  begin
    insert into public.lab_activities(title,category,summary,body,status) values('RLS verification','development','test','test','published');
    raise exception 'FAIL: member bypassed moderation';
  exception when insufficient_privilege then null; end;
end $$;
insert into public.lab_activities(title,category,summary,body) values('RLS verification','development','test','test');
do $$ begin
  if not exists(select 1 from public.lab_activities where title='RLS verification' and status='pending') then raise exception 'FAIL: author cannot see pending'; end if;
  update public.lab_activities set status='published' where title='RLS verification';
  if found then raise exception 'FAIL: author self-published'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.lab_activities where title='RLS verification') then raise exception 'FAIL: other user can see pending'; end if;
 if exists(select 1 from public.member_requests) then raise exception 'FAIL: private requests exposed'; end if;
end $$;
set local role anon;
do $$ begin
 if exists(select 1 from public.lab_activities where title='RLS verification') then raise exception 'FAIL: anon can see pending'; end if;
 begin perform * from public.member_requests; raise exception 'FAIL: anon can read requests'; exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
update public.lab_activities set status='published' where title='RLS verification';
update public.site_pages set values='{"test":"admin"}' where page='about.html';
set local role anon;
do $$ begin
 if not exists(select 1 from public.lab_activities where title='RLS verification') then raise exception 'FAIL: approved activity invisible'; end if;
end $$;
set local role authenticated;
update public.lab_activities set deleted_at=now() where title='RLS verification';
set local role anon;
do $$ begin
 if exists(select 1 from public.lab_activities where title='RLS verification') then raise exception 'FAIL: deleted activity exposed'; end if;
end $$;
set local role authenticated;
update public.site_settings set profile_editing=false, activity_submissions=false, membership_open=false, activities_visible=false where id;
update public.lab_activities set deleted_at=null where title='RLS verification';
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
do $$ begin
 update public.site_settings set profile_editing=true where id;
 if found then raise exception 'FAIL: member changed settings'; end if;
 update public.site_pages set values='{}' where page='member-lee-taegyu.html';
 if found then raise exception 'FAIL: disabled profile editing bypass'; end if;
 begin insert into public.lab_activities(title,category,summary,body) values('RLS disabled','development','test','test'); raise exception 'FAIL: disabled submissions bypass'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","email":"rls-other@example.invalid","role":"authenticated"}',true);
do $$ begin
 begin insert into public.member_requests(requested_page) values('member-ahn-chiwoo.html'); raise exception 'FAIL: closed requests bypass'; exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
 if exists(select 1 from public.lab_activities where title='RLS verification') then raise exception 'FAIL: disabled public display bypass'; end if;
end $$;
rollback;
select 'PASS: membership, ownership, moderation, public visibility, privacy, archive' as result;
