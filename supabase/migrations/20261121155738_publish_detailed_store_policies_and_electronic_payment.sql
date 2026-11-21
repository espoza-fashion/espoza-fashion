insert into public.store_settings as existing (key, value)
values
  ('site_content_ar', $policy$
{
  "policies": "سياسات المتجر",
  "cod": "الدفع الإلكتروني عند الاستلام فقط",
  "paymentPolicyText": "الدفع إلكتروني عند استلام الطلب فقط، بعد معاينة القطعة، دون دفعة مسبقة.",
  "exchangePolicyText": "يمكن طلب الاستبدال خلال 24 ساعة من استلام الطلب، بشرط أن تبقى القطعة بحالتها الأصلية، غير مستخدمة، وبطاقاتها الأصلية مثبتة عليها.",
  "policyItems": [
    ["01","الاستبدال","يمكنكِ طلب استبدال القطعة خلال 24 ساعة من وقت استلام الطلب. يُشترط أن تبقى القطعة بحالتها الأصلية، غير مستخدمة، وأن تظل بطاقاتها الأصلية (التاجات) مثبتة عليها.\n\nلطلب الاستبدال، راسلينا عبر واتساب. اذكري القطعة التي ترغبين باستبدالها والمقاس أو الموديل المطلوب حتى نساعدكِ بالخيارات المتاحة."],
    ["02","المعاينة عند الاستلام","خذي وقتكِ لمعاينة القطعة عند وصول الطلب وقبل إتمام الدفع. تأكدي من المقاس واللون وتفاصيل القطعة، وقارنيها بما اخترتِه عند الطلب. إذا لاحظتِ مشكلة أو اختلافًا، تواصلي معنا عبر واتساب لنساعدكِ."],
    ["03","رسوم التوصيل","تعتمد رسوم التوصيل على المنطقة التي تختارينها عند إتمام الطلب. تظهر الرسوم كبند مستقل في ملخص الطلب، وتُضاف إلى الإجمالي قبل إرسال الطلب."],
    ["04","مدة الوصول","يصل الطلب عادةً خلال 2–3 أيام عمل، بحسب منطقة التوصيل. اكتبي عنوانًا واضحًا ورقم هاتف يمكن التواصل معكِ عليه لتنسيق التسليم. للاستفسار عن موعد وصول طلبكِ، راسلينا عبر واتساب."],
    ["05","إلغاء الطلب","يمكنكِ إلغاء الطلب مجانًا قبل خروج الشحنة من المتجر. إذا رغبتِ بالإلغاء، راسلينا عبر واتساب في أقرب وقت واذكري تفاصيل الطلب حتى نتمكن من التحقق من حالته. إذا خرجت الشحنة بالفعل، تواصلي معنا للاستفسار عن الخيارات المتاحة."],
    ["06","الإرجاع","يُقبل إرجاع القطعة فقط في حال وجود عيب مصنعي واضح. إذا لاحظتِ عيبًا، راسلينا عبر واتساب مع وصف المشكلة وتفاصيل الطلب حتى نراجع الحالة ونوضح لكِ الخطوة التالية."],
    ["07","الخصوصية","نستخدم اسمكِ ورقم هاتفكِ وعنوانكِ لأغراض معالجة الطلب وتوصيله فقط. يساعدنا الاسم في التعرف على الطلب، ويُستخدم الهاتف لتنسيق التسليم، ويحدد العنوان وجهة التوصيل. نحافظ على خصوصية هذه البيانات، ويمكنكِ التواصل معنا عبر واتساب للاستفسار عن بيانات طلبكِ."],
    ["08","الدفع الإلكتروني","الدفع إلكتروني عند استلام الطلب فقط، بعد معاينة القطعة ودون دفعة مسبقة. راجعي إجمالي المبلغ شاملًا رسوم التوصيل في ملخص الطلب قبل إرساله عبر واتساب. للاستفسار عن طريقة الدفع الإلكتروني عند التسليم، راسلينا عبر واتساب."]
  ]
}
$policy$::jsonb),
  ('site_content_en', $policy$
{
  "policies": "Store Policies",
  "cod": "Electronic payment on delivery only",
  "paymentPolicyText": "Payment is made electronically only upon delivery, after you inspect the item, with no advance payment required.",
  "exchangePolicyText": "An exchange may be requested within 24 hours of receiving the order. The item must remain in its original condition, unused and undamaged.",
  "policyItems": [
    ["01","Exchanges","You can request an exchange within 24 hours of receiving your order. The item must be unused, in its original condition, with its original tags still attached.\n\nTo request an exchange, message us on WhatsApp with the item you received and the size or style you would like so we can help you check the available options."],
    ["02","Inspection on Delivery","Take a moment to inspect your item when it arrives, before you pay. Check the size, color and details against what you ordered. If something differs or you notice a problem, contact us on WhatsApp for help."],
    ["03","Delivery Fees","Your delivery fee depends on the area you select at checkout. The fee appears separately in your order summary and is included in the total before you send the order."],
    ["04","Delivery Time","Orders typically arrive within 2–3 business days, depending on the delivery area. Provide a clear address and a phone number we can use to coordinate delivery. For questions about your delivery date, message us on WhatsApp."],
    ["05","Order Cancellation","You can cancel your order free of charge before the parcel leaves the store. If you need to cancel, message us on WhatsApp as soon as possible with your order details so we can check its status. If the parcel has already shipped, contact us about the available options."],
    ["06","Returns","We accept returns only when an item has a clear manufacturing defect. If you notice a defect, contact us on WhatsApp with a description of the problem and your order details so we can review it and explain the next step."],
    ["07","Privacy","We use your name, phone number and address only to process and deliver your order. Your name helps us find your order, your phone number helps us coordinate delivery, and your address tells us where to deliver it. We protect the privacy of these details. Contact us on WhatsApp with questions about your order information."],
    ["08","Electronic Payment","Payment is made electronically only upon delivery, after you inspect the item, with no advance payment required. Review your total, including the delivery fee, before you send your order through WhatsApp. Message us on WhatsApp with questions about the electronic payment method at delivery."]
  ]
}
$policy$::jsonb),
  ('site_content_he', $policy$
{
  "policies": "מדיניות החנות",
  "cod": "תשלום אלקטרוני בעת המסירה בלבד",
  "paymentPolicyText": "התשלום מתבצע באופן אלקטרוני בעת המסירה בלבד, לאחר בדיקת הפריט וללא תשלום מראש.",
  "exchangePolicyText": "ניתן לבצע החלפה בתוך 24 שעות מקבלת ההזמנה, בתנאי שהפריט במצבו המקורי, לא נעשה בו שימוש ולא ניזוק.",
  "policyItems": [
    ["01","החלפות","אפשר לבקש להחליף פריט בתוך 24 שעות מרגע קבלת ההזמנה. על הפריט להישאר במצבו המקורי, ללא שימוש ועם התוויות המקוריות מחוברות אליו.\n\nלבקשת החלפה, כתבי לנו בוואטסאפ עם פרטי הפריט שקיבלת והמידה או הדגם שאת מבקשת, ונעזור לך לבדוק את האפשרויות הזמינות."],
    ["02","בדיקה בעת המסירה","קחי רגע לבדוק את הפריט כשהמשלוח מגיע ולפני התשלום. ודאי שהמידה, הצבע והפרטים תואמים להזמנה שלך. אם גילית בעיה או אי התאמה, פני אלינו בוואטסאפ ונשמח לעזור."],
    ["03","דמי משלוח","דמי המשלוח נקבעים לפי אזור המשלוח שתבחרי בעת ההזמנה. הם מופיעים בנפרד בסיכום ההזמנה ונכללים בסכום הכולל לפני שתשלחי אותה."],
    ["04","זמן אספקה","ההזמנה מגיעה בדרך כלל בתוך 2–3 ימי עסקים, בהתאם לאזור המשלוח. כדי שנוכל לתאם את המסירה, הזיני כתובת ברורה ומספר טלפון זמין. לבירור מועד ההגעה, כתבי לנו בוואטסאפ."],
    ["05","ביטול הזמנה","אפשר לבטל את ההזמנה ללא תשלום לפני שהמשלוח יוצא מהחנות. אם ברצונך לבטל, פני אלינו בהקדם בוואטסאפ עם פרטי ההזמנה כדי שנוכל לבדוק את מצבה. אם המשלוח כבר יצא, פני אלינו לבירור האפשרויות הזמינות."],
    ["06","החזרות","אפשר להחזיר פריט רק במקרה של פגם ייצור ברור. אם הבחנת בפגם, כתבי לנו בוואטסאפ עם תיאור הבעיה ופרטי ההזמנה כדי שנוכל לבדוק את המקרה ולהסביר לך מה הצעד הבא."],
    ["07","פרטיות","אנו משתמשים בשם, במספר הטלפון ובכתובת שלך רק כדי לטפל בהזמנה ולספק אותה. השם עוזר לנו לאתר את ההזמנה, הטלפון משמש לתיאום המסירה, והכתובת מציינת היכן למסור את ההזמנה. אנו שומרים על פרטיות הפרטים האלה. לשאלות על פרטי ההזמנה אפשר לפנות אלינו בוואטסאפ."],
    ["08","תשלום אלקטרוני","התשלום מתבצע באופן אלקטרוני בעת המסירה בלבד, לאחר בדיקת הפריט וללא תשלום מראש. אפשר לבדוק את הסכום לתשלום, כולל דמי המשלוח, לפני שליחת ההזמנה בוואטסאפ. לשאלות על אמצעי התשלום בעת המסירה, כתבי לנו בוואטסאפ."]
  ]
}
$policy$::jsonb),
  ('payment_policy_he', to_jsonb($policy$התשלום מתבצע באופן אלקטרוני בעת המסירה בלבד, לאחר בדיקת הפריט וללא תשלום מראש.$policy$::text))
on conflict (key) do update
set value = case
  when jsonb_typeof(existing.value) = 'object'
    and jsonb_typeof(excluded.value) = 'object'
  then existing.value || excluded.value
  else excluded.value
end;
