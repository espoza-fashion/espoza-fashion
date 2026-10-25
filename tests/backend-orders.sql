begin;
-- Build test inputs from the real catalog without copying customer records.
select set_config('qa.order',jsonb_build_object(
 'customer_name','ESPOZA QA - rollback only','phone','0000000000','region',d.area_name,'address','Technical test - never ship',
 'items',jsonb_build_array(jsonb_build_object('product_id',p.id,'name',p.name,'category',p.category,'price',p.price,'qty',1,'size',coalesce((select size from public.product_sizes where product_id=p.id order by sort_order limit 1),''),'color',coalesce((select name from public.product_colors where product_id=p.id order by sort_order limit 1),''))),
 'subtotal',p.price,'delivery_fee',d.price,'total',p.price+d.price,'discount',0,'status','new','payment_status','cod','source','website','notes','QA test rolled back in the same transaction')::text,true)
from public.products p cross join public.delivery_areas d where p.active and (p.stock is null or p.stock>0) and d.active order by p.id,d.sort_order limit 1;
set local role anon;
set local request.jwt.claims='{"role":"anon"}';
do $$
declare original jsonb := current_setting('qa.order')::jsonb; payload jsonb; i integer; r public.orders%rowtype;
begin
 for i in 0..7 loop
  payload:=original;
  if i=1 then payload:=jsonb_set(payload,'{items,0,price}','0'); end if;
  if i=2 then payload:=jsonb_set(payload,'{items,0,product_id}','null'); end if;
  if i=3 then payload:=jsonb_set(payload,'{discount}','-10'); end if;
  if i=4 then payload:=jsonb_set(payload,'{status}','"completed"'); end if;
  if i=5 then payload:=jsonb_set(payload,'{items,0,size}','"INVALID-SIZE"'); end if;
  if i=6 then payload:=jsonb_set(payload,'{items,0,qty}','5'); end if;
  if i=7 then payload:=jsonb_set(payload,'{region}','"INVALID-REGION"'); end if;
  r:=jsonb_populate_record(null::public.orders,payload);
  begin
   insert into public.orders(customer_name,phone,region,address,items,subtotal,delivery_fee,total,discount,status,payment_status,source,notes)
   values(r.customer_name,r.phone,r.region,r.address,r.items,r.subtotal,r.delivery_fee,r.total,r.discount,r.status,r.payment_status,r.source,r.notes);
   if i>0 then raise exception using errcode='XX001',message='Invalid order accepted: '||i; end if;
  exception when sqlstate 'XX001' then raise; when others then if i=0 then raise; end if;
  end;
 end loop;
 begin perform id from public.orders limit 1; raise exception using errcode='XX001',message='Anonymous orders read was allowed';
 exception when insufficient_privilege then null; end;
 begin update public.products set price=0; raise exception using errcode='XX001',message='Anonymous product update was allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: guest INSERT, 7 invalid payloads rejected, private order reads and product writes blocked' as result,
 (select count(*) from public.orders where phone='0000000000') as test_order_visible_to_admin,
 (select count(*) from public.products) as products_preserved;
rollback;
