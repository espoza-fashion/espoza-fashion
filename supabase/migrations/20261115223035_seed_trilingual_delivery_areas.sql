insert into public.delivery_areas(area_name,area_name_ar,area_name_en,area_name_he,price,active,sort_order)
select v.area_name,v.area_name_ar,v.area_name_en,v.area_name_he,v.price,true,v.sort_order
from (values
 ('الضفة الغربية','الضفة الغربية','West Bank','הגדה המערבית',20::numeric,1),
 ('القدس','القدس','Jerusalem','ירושלים',30::numeric,2),
 ('الداخل (48)','الداخل (48)','Inside (48)','אזורי 48',70::numeric,3)
) as v(area_name,area_name_ar,area_name_en,area_name_he,price,sort_order)
where not exists (select 1 from public.delivery_areas);
