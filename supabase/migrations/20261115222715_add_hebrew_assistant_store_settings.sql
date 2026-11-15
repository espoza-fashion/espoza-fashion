insert into public.store_settings(key,value)
values
('exchange_policy_he',to_jsonb('ניתן לבקש החלפה בתוך 24 שעות מקבלת ההזמנה, בתנאי שהפריט נשאר במצבו המקורי, לא נעשה בו שימוש והתוויות מחוברות אליו. אין החזרות, למעט במקרה של פגם ייצור ברור.'::text)),
('return_policy_he',to_jsonb('לא ניתן להחזיר מוצרים, למעט במקרה של פגם ייצור ברור בפריט.'::text)),
('delivery_time_he',to_jsonb('2–3 ימי עסקים'::text)),
('payment_policy_he',to_jsonb('התשלום מתבצע במזומן בעת המסירה בלבד.'::text))
on conflict (key) do update set value=excluded.value;
