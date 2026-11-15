update public.delivery_areas
set area_name_en = case
  when area_name = 'الضفة الغربية' then 'West Bank'
  when area_name = 'القدس' then 'Jerusalem'
  when area_name in ('الداخل (48)','الداخل') then 'Inside (48)'
  else area_name_en
end
where area_name_en is null;
