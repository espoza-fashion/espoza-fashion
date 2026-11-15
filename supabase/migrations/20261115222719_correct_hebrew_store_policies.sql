update public.store_settings
set value=to_jsonb('ניתן לבקש החלפה בתוך 24 שעות מקבלת ההזמנה, בתנאי שהפריט נשאר במצבו המקורי, לא נעשה בו שימוש והתוויות מחוברות אליו. אין החזרות, למעט במקרה של פגם ייצור ברור.'::text)
where key='exchange_policy_he';

update public.store_settings
set value=to_jsonb('לא ניתן להחזיר מוצרים, למעט במקרה של פגם ייצור ברור בפריט.'::text)
where key='return_policy_he';
