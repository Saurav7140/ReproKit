-- Public keys route writes; they never authorize private reads. Intake is opt-in per project.
create table public.website_intakes (
  project_id uuid primary key references public.projects(id) on delete cascade,
  id uuid not null unique default gen_random_uuid(),
  public_key uuid not null unique default gen_random_uuid(),
  origin text not null check (char_length(origin)<=300 and (origin ~ '^https://[a-z0-9][a-z0-9.-]*(:[0-9]{1,5})?$' or origin ~ '^http://(localhost|127\.0\.0\.1)(:[0-9]{1,5})?$')),
  enabled boolean not null default false
);
create table public.website_ingest_limits (
  intake_id uuid not null references public.website_intakes(id) on delete cascade,
  hour timestamptz not null,
  attempts integer not null check (attempts between 1 and 10),
  primary key(intake_id,hour)
);
alter table public.website_intakes enable row level security;
alter table public.website_ingest_limits enable row level security;
revoke all on public.website_intakes,public.website_ingest_limits from anon,authenticated;
grant select on public.website_intakes to authenticated;
grant all on public.website_intakes,public.website_ingest_limits to service_role;
create policy website_intakes_owner on public.website_intakes for select to authenticated using (
  exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid()))
);

create function public.configure_website_intake(p_project uuid,p_origin text,p_enabled boolean,p_rotate boolean default false)
returns public.website_intakes language plpgsql security definer set search_path='' as $$
declare u uuid := auth.uid(); r public.website_intakes;
begin
  if u is null then raise exception 'unauthorized'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,0));
  if not exists(select 1 from public.projects where id=p_project and owner_id=u) then raise exception 'not_found'; end if;
  insert into public.website_intakes(project_id,origin,enabled) values(p_project,p_origin,p_enabled)
    on conflict(project_id) do update set origin=excluded.origin,enabled=excluded.enabled,
      public_key=case when p_rotate then gen_random_uuid() else public.website_intakes.public_key end returning * into r;
  return r;
end $$;
revoke all on function public.configure_website_intake(uuid,text,boolean,boolean) from public,anon;
grant execute on function public.configure_website_intake(uuid,text,boolean,boolean) to authenticated;

create function public.charge_public_ingest(p_key uuid,p_origin text) returns void
language plpgsql security definer set search_path='' as $$
declare r public.website_intakes; h timestamptz := date_trunc('hour',now());
begin
  select * into r from public.website_intakes where public_key=p_key and origin=p_origin and enabled for update;
  if not found then raise exception 'intake_unavailable'; end if;
  if exists(select 1 from public.website_ingest_limits where intake_id=r.id and hour=h and attempts>=10) then raise exception 'public_rate_limit'; end if;
  insert into public.website_ingest_limits(intake_id,hour,attempts) values(r.id,h,1)
    on conflict(intake_id,hour) do update set attempts=public.website_ingest_limits.attempts+1;
end $$;

create function public.begin_public_upload(p_key uuid,p_origin text,p_report uuid,p_title text,p_hash text,p_size integer)
returns setof public.reports language plpgsql security definer set search_path='' as $$
declare r public.website_intakes; u uuid;
begin
  select p.owner_id into u from public.website_intakes i join public.projects p on p.id=i.project_id where i.public_key=p_key;
  if u is null then raise exception 'intake_unavailable'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,0));
  select * into r from public.website_intakes where public_key=p_key and origin=p_origin and enabled for update;
  if not found then raise exception 'intake_unavailable'; end if;
  if not exists(select 1 from public.reports where project_id=r.project_id and report_id=p_report) and
    (select count(*) from public.reports where project_id=r.project_id)>=20 then raise exception 'public_report_limit'; end if;
  return query select * from public.begin_upload(u,r.project_id,p_report,p_title,'web',p_hash,p_size);
end $$;
revoke all on function public.charge_public_ingest(uuid,text),public.begin_public_upload(uuid,text,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.charge_public_ingest(uuid,text),public.begin_public_upload(uuid,text,uuid,text,text,integer) to service_role;

create or replace function public.claim_cleanup() returns setof public.reports
language plpgsql security definer set search_path='' as $$
begin
  delete from public.ingest_limits where hour<now()-interval '2 days';
  delete from public.website_ingest_limits where hour<now()-interval '2 days';
  return query with candidates as (
    select id from public.reports where (lease_until is null or lease_until<=now()) and
      ((lifecycle='ready' and expires_at<=now()) or lifecycle='deleting' or (lifecycle='pending' and created_at<now()-interval '1 hour'))
    order by created_at limit 50 for update skip locked
  ) update public.reports r set lifecycle='deleting',lease_id=gen_random_uuid(),lease_until=now()+interval '15 minutes'
    from candidates c where r.id=c.id returning r.*;
end $$;
