select vault.update_secret(
  id,
  jsonb_set(
    decrypted_secret::jsonb,
    '{dispatchToken}',
    to_jsonb(encode(extensions.gen_random_bytes(32), 'hex'))
  )::text
)
from vault.decrypted_secrets
where name = 'espoza_update_push';

select cron.schedule(
  'espoza-app-release-notifications',
  '* * * * *',
  $schedule$
    with credentials as (
      select floor(extract(epoch from clock_timestamp()))::bigint::text as timestamp,
             decrypted_secret::jsonb ->> 'dispatchToken' as signing_key
      from vault.decrypted_secrets
      where name = 'espoza_update_push'
    )
    select net.http_post(
      url := 'https://opqbcfxqtmyebxsafeea.supabase.co/functions/v1/espoza-updates',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Espoza-Dispatch-Time', timestamp,
        'X-Espoza-Dispatch-Signature',
          encode(extensions.hmac('espoza-release:' || timestamp, signing_key, 'sha256'), 'hex')
      ),
      timeout_milliseconds := 50000
    )
    from credentials;

    delete from cron.job_run_details
    where jobid = (select jobid from cron.job where jobname = 'espoza-app-release-notifications')
      and end_time < now() - interval '7 days';
  $schedule$
);
