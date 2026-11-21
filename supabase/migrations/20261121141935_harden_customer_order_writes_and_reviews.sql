begin;
set local lock_timeout = '5s';

revoke insert on table public.orders from anon, authenticated;
grant insert (
  customer_id, customer_name, phone, region, address, items, coupon_id, subtotal,
  discount, delivery_fee, total, status, notes, payment_status, source
) on table public.orders to anon, authenticated;

revoke insert, update on table public.customers from authenticated;
grant insert (user_id, name, email, phone, address) on table public.customers to authenticated;
grant update (name, email, phone, address, updated_at) on table public.customers to authenticated;

create or replace function private.sync_order_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := auth.uid();
  profile_id uuid;
  clean_phone text := nullif(btrim(coalesce(new.phone, '')), '');
begin
  if caller_id is not null and private.is_admin() then
    return new;
  end if;

  if caller_id is not null and new.customer_id is not null then
    select id into profile_id
    from public.customers
    where id = new.customer_id and user_id = caller_id;

    if found then
      update public.customers as customer
      set name = coalesce(nullif(btrim(new.customer_name), ''), customer.name),
          address = coalesce(nullif(btrim(new.address), ''), customer.address),
          phone = case
            when clean_phone is not null and not exists (
              select 1 from public.customers as other_customer
              where other_customer.phone = clean_phone and other_customer.id <> profile_id
            ) then clean_phone
            else customer.phone
          end,
          updated_at = now()
      where customer.id = profile_id;

      return new;
    end if;
  end if;

  new.customer_id := null;
  if clean_phone is null then
    return new;
  end if;

  -- An unverified phone number may group guest orders, but never overwrites contact data.
  insert into public.customers (name, phone, address, updated_at)
  values (coalesce(nullif(btrim(new.customer_name), ''), 'زبون'), clean_phone, new.address, now())
  on conflict (phone) where phone is not null and phone <> '' do nothing
  returning id into profile_id;

  if profile_id is null then
    select id into profile_id
    from public.customers
    where phone = clean_phone and user_id is null;
  end if;

  new.customer_id := profile_id;
  return new;
end;
$function$;

create view public.admin_customer_overview
with (security_invoker = true)
as
select customer.id, customer.user_id, customer.name, customer.email, customer.phone, customer.created_at,
       totals.total_orders, coalesce(totals.total_spend, 0) as total_spend
from public.customers as customer
cross join lateral (
  select count(*) as total_orders,
         sum(customer_order.total) filter (where customer_order.status = 'completed') as total_spend
  from public.orders as customer_order
  where customer_order.customer_id = customer.id
) as totals
where (select private.is_admin());

revoke all on table public.admin_customer_overview from public, anon, authenticated;
grant select on table public.admin_customer_overview to authenticated;

create table private.customer_reviewed_orders (
  order_id uuid primary key references public.orders (id) on delete cascade
);
alter table private.customer_reviewed_orders enable row level security;
revoke all on table private.customer_reviewed_orders from public, anon, authenticated;

create function private.enforce_customer_review_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := auth.uid();
  eligible_order_id uuid;
begin
  -- Service writes without a user and authorized staff retain moderation controls.
  if caller_id is null or private.is_admin() then
    return new;
  end if;

  select customer_order.id into eligible_order_id
  from public.orders as customer_order
  join public.customers as customer on customer.id = customer_order.customer_id
  where customer.user_id = caller_id
    and customer_order.status = 'completed'
    and not exists (
      select 1 from private.customer_reviewed_orders as reviewed_order
      where reviewed_order.order_id = customer_order.id
    )
  order by customer_order.created_at desc, customer_order.id
  limit 1
  for update of customer_order skip locked;

  if eligible_order_id is not null then
    insert into private.customer_reviewed_orders (order_id)
    values (eligible_order_id)
    on conflict do nothing;
  end if;
  if eligible_order_id is null or not found then
    raise exception 'customer_review_requires_order';
  end if;

  new.id := gen_random_uuid();
  new.reviewer_name := 'عميلة إسبوزا';
  new.active := true;
  new.sort_order := 0;
  new.created_at := now();
  new.updated_at := new.created_at;
  return new;
end;
$function$;

revoke execute on function private.enforce_customer_review_order() from public, anon, authenticated;
create trigger trg_enforce_customer_review_order
before insert on public.customer_reviews
for each row execute function private.enforce_customer_review_order();

revoke insert on table public.customer_reviews from anon;
drop policy "public submit customer reviews" on public.customer_reviews;
create policy "verified customers publish reviews"
on public.customer_reviews for insert to authenticated
with check (
  (select auth.uid()) is not null
  and active = true
  and sort_order = 0
  and rating between 1 and 5
  and language in ('ar', 'en', 'he')
);

notify pgrst, 'reload schema';
commit;
