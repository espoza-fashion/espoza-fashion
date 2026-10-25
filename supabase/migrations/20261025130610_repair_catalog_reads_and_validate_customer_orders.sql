-- Additive policy corrections and a strict order validator; no existing rows are changed.
begin;
alter policy "public read active products" on public.products to anon, authenticated;
alter policy "public read product sizes" on public.product_sizes to anon, authenticated;
alter policy "public read product colors" on public.product_colors to anon, authenticated;
alter policy "public read product images" on public.product_images to anon, authenticated;
alter policy "public read active categories" on public.categories to anon, authenticated;
alter policy "public read active delivery areas" on public.delivery_areas to anon, authenticated;
alter policy "public read active feedback" on public.feedback to anon, authenticated;
alter policy "public read visible site sections" on public.site_sections to anon, authenticated;
alter policy "public read active sliders" on public.sliders to anon, authenticated;

-- RLS does not protect TRUNCATE. Browser roles do not need DDL-like privileges.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
revoke insert,update,delete on public.categories,public.coupons,public.feedback,public.media_library,public.site_sections from anon;
revoke all on public.customers,public.customer_carts from anon;
revoke update,delete on public.wish_requests from anon;

create or replace function public.validate_website_order()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  item jsonb;
  current_product public.products%rowtype;
  item_qty numeric;
  item_price numeric;
  calculated_subtotal numeric := 0;
  expected_delivery numeric;
  is_admin boolean := false;
begin
  if auth.uid() is not null then is_admin := private.is_admin(); end if;
  if not is_admin then
    if new.status <> 'new' or new.payment_status <> 'cod' or new.source <> 'website' or new.internal_notes is not null then
      raise exception 'بيانات حالة الطلب غير مسموحة.';
    end if;
  end if;
  if length(btrim(coalesce(new.customer_name,''))) not between 2 and 150
     or length(btrim(coalesce(new.address,''))) not between 3 and 500
     or coalesce(new.phone,'') !~ '^\+?[0-9 ()-]{7,25}$'
     or length(coalesce(new.notes,'')) > 2000 then
    raise exception 'تحققي من الاسم ورقم الهاتف والعنوان.';
  end if;
  if jsonb_typeof(new.items) is distinct from 'array' then raise exception 'صيغة المنتجات غير صحيحة.'; end if;
  if jsonb_array_length(new.items) not between 1 and 50 then raise exception 'السلة فارغة أو تتجاوز الحد المسموح.'; end if;
  for item in select value from jsonb_array_elements(new.items) loop
    if nullif(item->>'product_id','') is null then raise exception 'حدّثي السلة من كتالوج المتجر قبل الطلب.'; end if;
    item_qty := coalesce((item->>'qty')::numeric,0);
    item_price := coalesce((item->>'price')::numeric,-1);
    if item_qty not between 1 and 4 or item_qty <> trunc(item_qty) or item_price < 0 then raise exception 'كمية أو سعر المنتج غير صالح.'; end if;
    select * into current_product from public.products where id=(item->>'product_id')::uuid for share;
    if not found or not current_product.active or (current_product.stock is not null and current_product.stock <= 0) then raise exception 'أحد المنتجات غير متاح.'; end if;
    if item_price <> current_product.price or coalesce(item->>'name','') <> current_product.name or coalesce(item->>'category','') <> current_product.category then raise exception 'تغيّرت بيانات المنتج. حدّثي السلة قبل الطلب.'; end if;
    if exists(select 1 from public.product_sizes where product_id=current_product.id)
      and not exists(select 1 from public.product_sizes where product_id=current_product.id and size=item->>'size') then raise exception 'المقاس المحدد غير متوفر.'; end if;
    if exists(select 1 from public.product_colors where product_id=current_product.id)
      and not exists(select 1 from public.product_colors where product_id=current_product.id and name=item->>'color') then raise exception 'اللون المحدد غير متوفر.'; end if;
    calculated_subtotal := calculated_subtotal + item_qty*current_product.price;
  end loop;
  if exists(select 1 from jsonb_array_elements(new.items) e group by e->>'product_id' having sum((e->>'qty')::numeric)>4) then raise exception 'الحد الأقصى أربع قطع من نفس الموديل.'; end if;
  if exists(select 1 from jsonb_array_elements(new.items) e join public.products p on p.id=(e->>'product_id')::uuid where p.stock is not null group by p.id,p.stock having sum((e->>'qty')::numeric)>p.stock) then raise exception 'الكمية المطلوبة تتجاوز المخزون.'; end if;
  select price into expected_delivery from public.delivery_areas where active and area_name=new.region order by sort_order,id limit 1;
  if not found or new.delivery_fee <> expected_delivery then raise exception 'منطقة أو رسوم التوصيل غير صحيحة.'; end if;
  if new.subtotal <> calculated_subtotal or new.discount < 0 or new.discount > calculated_subtotal or (new.discount <> 0 and new.coupon_id is null) then raise exception 'مجموع أو خصم الطلب غير صحيح.'; end if;
  if new.total <> calculated_subtotal-new.discount+expected_delivery then raise exception 'إجمالي الطلب غير صحيح.'; end if;
  return new;
end;
$$;
revoke all on function public.validate_website_order() from public,anon,authenticated;

-- Only customer-supplied columns can be inserted. Anonymous order reads remain forbidden.
grant insert(customer_id,customer_name,phone,region,address,items,coupon_id,subtotal,discount,delivery_fee,total,status,notes,payment_status,source)
on public.orders to anon,authenticated;
alter policy "public create orders" on public.orders with check(status='new' and payment_status='cod' and source='website' and internal_notes is null);
CREATE OR REPLACE FUNCTION public.apply_coupon_usage_on_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  chosen_coupon public.coupons%rowtype;
  eligible_quantity numeric := 0;
  eligible_subtotal numeric := 0;
  expected_discount numeric := 0;
begin
  if new.coupon_id is null then
    return new;
  end if;

  select * into chosen_coupon
  from public.coupons
  where id = new.coupon_id
  for update;

  if not found or not chosen_coupon.active then
    raise exception 'هذا العرض لم يعد متاحًا.';
  end if;
  if chosen_coupon.starts_at is not null and chosen_coupon.starts_at > now() then
    raise exception 'لم يبدأ العرض بعد.';
  end if;
  if chosen_coupon.ends_at is not null and chosen_coupon.ends_at < now() then
    raise exception 'انتهى العرض.';
  end if;
  if chosen_coupon.usage_limit is not null and chosen_coupon.used_count >= chosen_coupon.usage_limit then
    raise exception 'وصل العرض إلى حد الاستخدام.';
  end if;
  if chosen_coupon.first_order_only and (auth.uid() is null or not exists(select 1 from public.customers c where c.id=new.customer_id and c.user_id=auth.uid())) then
    raise exception 'عرض أول طلب متاح للحسابات المسجلة فقط.';
  end if;
  if chosen_coupon.first_order_only and (
    new.customer_id is null or exists (
      select 1 from public.orders prior
      where (
        prior.customer_id = new.customer_id
        or (
          nullif(btrim(coalesce(new.phone, '')), '') is not null
          and btrim(coalesce(prior.phone, '')) = btrim(new.phone)
        )
      )
      and prior.status <> 'cancelled'
    )
  ) then
    raise exception 'عرض أول طلب متاح للحسابات التي لم تطلب سابقًا فقط.';
  end if;

  select
    coalesce(sum(greatest(0, coalesce((item->>'qty')::numeric, 0))), 0),
    coalesce(sum(greatest(0, coalesce((item->>'price')::numeric, 0)) * greatest(0, coalesce((item->>'qty')::numeric, 0))), 0)
  into eligible_quantity, eligible_subtotal
  from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) item
  where
    (cardinality(chosen_coupon.product_ids) = 0
      or nullif(item->>'product_id', '')::uuid = any(chosen_coupon.product_ids))
    and
    (cardinality(chosen_coupon.category_slugs) = 0
      or coalesce(item->>'category', '') = any(chosen_coupon.category_slugs));

  if eligible_quantity < greatest(1, chosen_coupon.min_quantity) then
    raise exception 'لم تتحقق كمية المنتجات المطلوبة لهذا العرض.';
  end if;
  if eligible_subtotal < greatest(0, chosen_coupon.min_order) then
    raise exception 'لم يصل الطلب إلى الحد الأدنى لهذا العرض.';
  end if;

  if chosen_coupon.discount_type = 'percent' then
    expected_discount := round(eligible_subtotal * least(100, greatest(0, chosen_coupon.discount_value)) / 100, 2);
  else
    expected_discount := least(eligible_subtotal, greatest(0, chosen_coupon.discount_value));
  end if;

  if expected_discount <= 0 or abs(coalesce(new.discount, 0) - expected_discount) > 0.02 then
    raise exception 'قيمة الخصم لا تطابق شروط العرض.';
  end if;
  if abs(coalesce(new.total, 0) - (coalesce(new.subtotal, 0) - coalesce(new.discount, 0) + coalesce(new.delivery_fee, 0))) > 0.02 then
    raise exception 'إجمالي الطلب غير مطابق للحسابات.';
  end if;

  update public.coupons
  set used_count = used_count + 1,
      updated_at = now()
  where id = new.coupon_id;

  return new;
end;
$function$
;

notify pgrst,'reload schema';
commit;
