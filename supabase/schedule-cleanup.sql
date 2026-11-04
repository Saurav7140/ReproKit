-- Run after the function is deployed and the two named Vault secrets exist.
-- Store the full function URL (without ?op) as reprokit_function_url, and the
-- server REPROKIT_CLEANUP_SECRET as reprokit_cleanup_secret, using the Vault UI.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists(select 1 from vault.decrypted_secrets where name='reprokit_function_url')
     or not exists(select 1 from vault.decrypted_secrets where name='reprokit_cleanup_secret' and length(decrypted_secret)>=32)
  then raise exception 'Configure the ReproKit function URL and cleanup secret in Vault first'; end if;
end $$;

select cron.schedule('reprokit-retention','*/15 * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='reprokit_function_url') || '?op=cleanup',
    headers := jsonb_build_object('Content-Type','application/json','Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='reprokit_cleanup_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
$job$);
-- Inspect Cron history AND Edge Function/pg_net responses: queued HTTP is not
-- proof of successful deletion. Failed work retains metadata for retry.
