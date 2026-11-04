-- Apply to a new Supabase project. Recording objects are removed through Storage API, never storage SQL.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique(id,owner_id)
);
create index projects_owner on public.projects(owner_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete restrict,
  report_id uuid not null,
  title text not null check (char_length(title) between 1 and 160),
  platform text not null check (platform in ('web','desktop','mobile','device')),
  status text not null default 'open' check (status in ('open','investigating','resolved')),
  lifecycle text not null default 'pending' check (lifecycle in ('pending','ready','deleting')),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  storage_path text generated always as (owner_id::text || '/' || id::text || '.reprokit.json') stored,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  lease_id uuid,
  lease_until timestamptz,
  unique(project_id, report_id),
  foreign key(project_id,owner_id) references public.projects(id,owner_id) on delete restrict
);
create index reports_owner_project on public.reports(owner_id,project_id,created_at desc);
create index reports_cleanup on public.reports(lifecycle,expires_at,lease_until);
create table public.ingest_limits (
  owner_id uuid not null references auth.users(id) on delete cascade,
  hour timestamptz not null,
  attempts integer not null check (attempts between 1 and 20),
  primary key(owner_id,hour)
);

alter table public.projects enable row level security;
alter table public.reports enable row level security;
alter table public.ingest_limits enable row level security;
revoke all on public.projects,public.reports,public.ingest_limits from anon,authenticated;
grant select on public.projects,public.reports to authenticated;
grant update(status) on public.reports to authenticated;
grant all on public.projects,public.reports,public.ingest_limits to service_role;
create policy projects_read_own on public.projects for select to authenticated using (owner_id=(select auth.uid()));
create policy reports_read_own on public.reports for select to authenticated using (owner_id=(select auth.uid()));
create policy reports_status_own on public.reports for update to authenticated
  using (owner_id=(select auth.uid()) and lifecycle='ready' and expires_at>now())
  with check (owner_id=(select auth.uid()) and lifecycle='ready' and expires_at>now());

create function public.create_project(p_name text) returns public.projects
language plpgsql security definer set search_path='' as $$
declare p public.projects; u uuid := auth.uid();
begin
  if u is null then raise exception 'unauthorized'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,0));
  if (select count(*) from public.projects where owner_id=u)>=25 then raise exception 'project_limit'; end if;
  insert into public.projects(owner_id,name) values(u,btrim(p_name)) returning * into p;
  return p;
end $$;
revoke all on function public.create_project(text) from public,anon;
grant execute on function public.create_project(text) to authenticated;

-- Only the verified server can invoke these mutations. Client JWTs cannot bypass validated ingestion.
create function public.charge_ingest(p_owner uuid,p_project uuid) returns void
language plpgsql security definer set search_path='' as $$
declare h timestamptz := date_trunc('hour',now());
begin
  if not exists(select 1 from public.projects where id=p_project and owner_id=p_owner) then raise exception 'not_found'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text,0));
  if exists(select 1 from public.ingest_limits where owner_id=p_owner and hour=h and attempts>=20) then raise exception 'rate_limit'; end if;
  insert into public.ingest_limits(owner_id,hour,attempts) values(p_owner,h,1)
    on conflict(owner_id,hour) do update set attempts=public.ingest_limits.attempts+1;
end $$;

create function public.begin_upload(p_owner uuid,p_project uuid,p_report uuid,p_title text,p_platform text,p_hash text,p_size integer)
returns setof public.reports language plpgsql security definer set search_path='' as $$
declare r public.reports;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text,0));
  if not exists(select 1 from public.projects where id=p_project and owner_id=p_owner) then raise exception 'not_found'; end if;
  select * into r from public.reports where project_id=p_project and report_id=p_report for update;
  if found then
    if r.owner_id<>p_owner then raise exception 'not_found'; end if;
    if r.content_hash<>p_hash then raise exception 'report_conflict'; end if;
    if r.expires_at<=now() or r.lifecycle='deleting' then raise exception 'not_found'; end if;
    if r.lifecycle='ready' then return next r; return; end if;
    if r.lease_until>now() then raise exception 'busy'; end if;
    update public.reports set lease_id=gen_random_uuid(),lease_until=now()+interval '15 minutes' where id=r.id returning * into r;
  else
    if (select count(*) from public.reports where owner_id=p_owner)>=100 then raise exception 'report_limit'; end if;
    insert into public.reports(project_id,owner_id,report_id,title,platform,content_hash,size_bytes,lease_id,lease_until)
      values(p_project,p_owner,p_report,p_title,p_platform,p_hash,p_size,gen_random_uuid(),now()+interval '15 minutes') returning * into r;
  end if;
  return next r;
end $$;

create function public.complete_upload(p_owner uuid,p_id uuid,p_lease uuid) returns setof public.reports
language plpgsql security definer set search_path='' as $$
begin
  return query update public.reports set lifecycle='ready',lease_id=null,lease_until=null
    where id=p_id and owner_id=p_owner and lifecycle='pending' and lease_id=p_lease and lease_until>now() returning *;
end $$;

create function public.begin_delete(p_owner uuid,p_id uuid) returns setof public.reports
language plpgsql security definer set search_path='' as $$
declare r public.reports;
begin
  select * into r from public.reports where id=p_id and owner_id=p_owner for update;
  if not found then return; end if;
  if r.lease_until>now() then raise exception 'busy'; end if;
  update public.reports set lifecycle='deleting',lease_id=gen_random_uuid(),lease_until=now()+interval '15 minutes'
    where id=r.id returning * into r;
  return next r;
end $$;

create function public.finish_delete(p_owner uuid,p_id uuid,p_lease uuid) returns void
language sql security definer set search_path='' as $$
  delete from public.reports where id=p_id and owner_id=p_owner and lifecycle='deleting' and lease_id=p_lease;
$$;

create function public.claim_cleanup() returns setof public.reports
language plpgsql security definer set search_path='' as $$
begin
  delete from public.ingest_limits where hour<now()-interval '2 days';
  return query with candidates as (
    select id from public.reports where (lease_until is null or lease_until<=now()) and
      ((lifecycle='ready' and expires_at<=now()) or lifecycle='deleting' or (lifecycle='pending' and created_at<now()-interval '1 hour'))
    order by created_at limit 50 for update skip locked
  ) update public.reports r set lifecycle='deleting',lease_id=gen_random_uuid(),lease_until=now()+interval '15 minutes'
    from candidates c where r.id=c.id returning r.*;
end $$;

revoke all on function public.charge_ingest(uuid,uuid),public.begin_upload(uuid,uuid,uuid,text,text,text,integer),public.complete_upload(uuid,uuid,uuid),public.begin_delete(uuid,uuid),public.finish_delete(uuid,uuid,uuid),public.claim_cleanup() from public,anon,authenticated;
grant execute on function public.charge_ingest(uuid,uuid),public.begin_upload(uuid,uuid,uuid,text,text,text,integer),public.complete_upload(uuid,uuid,uuid),public.begin_delete(uuid,uuid),public.finish_delete(uuid,uuid,uuid),public.claim_cleanup() to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('recordings','recordings',false,5242880,array['application/json']);
create policy recordings_server_only on storage.objects as restrictive for all to anon,authenticated
  using (bucket_id<>'recordings') with check (bucket_id<>'recordings');
-- No client object policies: only the server can upload/delete/sign objects after ownership validation.
-- Supabase Storage's existing RLS default denial protects anon/authenticated direct object access.
