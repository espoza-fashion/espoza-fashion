alter table public.products
  add column if not exists name_he text,
  add column if not exists description_he text,
  add column if not exists size_chart_he jsonb;
alter table public.product_colors add column if not exists name_he text;
alter table public.categories add column if not exists name_he text;
alter table public.delivery_areas
  add column if not exists area_name_ar text,
  add column if not exists area_name_en text,
  add column if not exists area_name_he text;
alter table public.sliders
  add column if not exists title_ar text,
  add column if not exists title_en text,
  add column if not exists title_he text,
  add column if not exists subtitle_ar text,
  add column if not exists subtitle_en text,
  add column if not exists subtitle_he text,
  add column if not exists button_text_ar text,
  add column if not exists button_text_en text,
  add column if not exists button_text_he text;
alter table public.feedback
  add column if not exists title_he text,
  add column if not exists alt_text_he text;
alter table public.site_sections add column if not exists title_he text;

update public.products
set name_he = case
  when category = 'dresses' then 'שמלת ' || regexp_replace(name_en, '\s+Dress$', '')
  when category in ('sets','winter_sets') then 'חליפת ' || regexp_replace(name_en, '\s+Set$', '')
  else name_en end
where name_he is null and coalesce(name_en,'') <> '';
update public.products
set description_he = 'עיצוב אלגנטי מבית Espoza Fashion.'
where description_he is null
  and coalesce(description,'') <> '';

update public.product_colors
set name_he = case lower(trim(coalesce(name_en,name,'')))
  when 'white' then 'לבן' when 'red' then 'אדום' when 'green' then 'ירוק'
  when 'emerald green' then 'ירוק אמרלד' when 'petrol blue' then 'כחול פטרול'
  when 'dark petrol blue' then 'כחול פטרול כהה' when 'dark royal blue' then 'כחול רויאל כהה'
  when 'indigo blue' then 'כחול אינדיגו' when 'black' then 'שחור' when 'bordeaux' then 'בורדו'
  when 'purple' then 'סגול' when 'dark purple' then 'סגול כהה' when 'brown' then 'חום'
  when 'beige' then 'בז׳' when 'maroon' then 'בורדו' when 'gold' then 'זהב'
  when 'charcoal gray' then 'אפור פחם' when 'mauve gray' then 'אפור סגלגל'
  when 'pink' then 'ורוד' when 'baby pink' then 'ורוד בהיר' when 'mauve pink' then 'ורוד מעושן'
  when 'burgundy' then 'בורדו' when 'navy' then 'כחול נייבי' when 'dark navy' then 'כחול נייבי כהה'
  when 'mocha' then 'מוקה' else null end
where name_he is null;

update public.categories
set name_he = case slug
  when 'dresses' then 'שמלות' when 'sets' then 'חליפות' when 'offers' then 'מבצעים'
  when 'winter_sets' then 'חליפות חורף' when 'winter-sets' then 'חליפות חורף'
  when 'winter-dresses' then 'שמלות חורף' else name_en end
where name_he is null;

update public.delivery_areas
set area_name_ar = coalesce(area_name_ar,area_name),
    area_name_he = coalesce(area_name_he,case
      when area_name ilike '%الضفة%' then 'הגדה המערבית'
      when area_name ilike '%القدس%' then 'ירושלים'
      when area_name ilike '%الداخل%' then 'יישובי פנים הארץ (48)'
      else null end)
where area_name_ar is null or area_name_he is null;

insert into public.store_settings(key,value)
values ('site_content_he','{}'::jsonb),
       ('welcome_he',to_jsonb('ברוכים הבאים ל‑Espoza Fashion'::text))
on conflict (key) do nothing;
