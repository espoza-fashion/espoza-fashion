begin;
set local lock_timeout = '5s';

revoke select on table public.orders from authenticated;
grant select (
  id, customer_name, phone, region, address, items, subtotal, delivery_fee, total,
  status, notes, created_at, customer_id, payment_status, source, updated_at, discount, coupon_id
) on table public.orders to authenticated;

notify pgrst, 'reload schema';
commit;
