create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table public.espoza_update_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique check (octet_length(endpoint) <= 1024),
  p256dh text not null check (p256dh ~ '^B[A-Za-z0-9_-]{86}$'),
  client_auth text not null check (client_auth ~ '^[A-Za-z0-9_-]{22}$'),
  locale text not null check (locale in ('ar', 'en', 'he')),
  last_release bigint not null check (last_release > 0),
  retry_after timestamptz not null default now()
);
create index espoza_update_subscriptions_delivery_idx
  on public.espoza_update_subscriptions (last_release, retry_after);

alter table public.espoza_update_subscriptions enable row level security;
revoke all on public.espoza_update_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on public.espoza_update_subscriptions to service_role;

create function public.claim_espoza_update_notifications(target_release bigint)
returns table (id uuid, endpoint text, p256dh text, client_auth text, locale text)
language sql
set search_path = ''
as $$
  with due as (
    select subscription.id
    from public.espoza_update_subscriptions as subscription
    where subscription.last_release < target_release and subscription.retry_after <= now()
    order by subscription.retry_after, subscription.id
    limit 48
    for update skip locked
  )
  update public.espoza_update_subscriptions as subscription
     set retry_after = now() + interval '5 minutes'
    from due
   where subscription.id = due.id
  returning subscription.id, subscription.endpoint, subscription.p256dh,
            subscription.client_auth, subscription.locale;
$$;
revoke all on function public.claim_espoza_update_notifications(bigint) from public, anon, authenticated;
grant execute on function public.claim_espoza_update_notifications(bigint) to service_role;

create schema espoza_updates_private;
revoke all on schema espoza_updates_private from public, anon, authenticated;
grant usage on schema espoza_updates_private to service_role;

create function espoza_updates_private.credentials()
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select decrypted_secret::jsonb
  from vault.decrypted_secrets
  where name = 'espoza_update_push' and auth.jwt() ->> 'role' = 'service_role';
$$;
revoke all on function espoza_updates_private.credentials() from public, anon, authenticated;
grant execute on function espoza_updates_private.credentials() to service_role;

create function public.espoza_update_credentials()
returns jsonb
language sql stable
set search_path = ''
as $$ select espoza_updates_private.credentials(); $$;
revoke all on function public.espoza_update_credentials() from public, anon, authenticated;
grant execute on function public.espoza_update_credentials() to service_role;

revoke all on net.http_request_queue, net._http_response from public, anon, authenticated;

select cron.schedule(
  'espoza-app-release-notifications',
  '* * * * *',
  $schedule$
    select net.http_post(
      url := 'https://opqbcfxqtmyebxsafeea.supabase.co/functions/v1/espoza-updates',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Espoza-Dispatch-Token', decrypted_secret::jsonb ->> 'dispatchToken'
      ),
      timeout_milliseconds := 50000
    )
    from vault.decrypted_secrets
    where name = 'espoza_update_push';

    delete from cron.job_run_details
    where jobid = (select jobid from cron.job where jobname = 'espoza-app-release-notifications')
      and end_time < now() - interval '7 days';
  $schedule$
);
