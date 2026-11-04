-- Recording objects must be removed through the existing leased report API first.
create function public.delete_project(p_project uuid) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'unauthorized'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,0));
  perform 1 from public.projects where id=p_project and owner_id=u for update;
  if not found then raise exception 'not_found'; end if;
  if exists(select 1 from public.reports where project_id=p_project) then raise exception 'project_not_empty'; end if;
  delete from public.projects where id=p_project and owner_id=u;
end $$;
revoke all on function public.delete_project(uuid) from public,anon;
grant execute on function public.delete_project(uuid) to authenticated;
