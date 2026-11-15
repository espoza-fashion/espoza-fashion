update public.store_settings
set value=jsonb_set(
  value,
  '{footerStoryText}',
  to_jsonb('Espoza Fashion was founded in 2019 from a genuine love of fashion and a desire to offer distinctive pieces that combine quality with refined design. Over the years, our collection has grown alongside our customers’ trust. We continue to offer carefully selected dresses, sets and elegant pieces, with attention to every detail.'::text),
  true
)
where key='site_content_en';
