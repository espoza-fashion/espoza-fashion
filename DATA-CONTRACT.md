# Espoza Store Data Contract v1.0

This is the stable boundary between Espoza Admin, Supabase, and the public Espoza Fashion website.

## Source of truth
- Admin writes store data to Supabase.
- Customer website reads public store data from Supabase.
- Admin never edits or replaces the customer site's HTML.
- Existing product UUIDs remain stable.

## Entities
products: name, category, price, old_price, description, active, featured, sku, stock, tags.
product_images: product_id, image_url, optional media_id, sort_order, alt_text.
product_sizes: product_id, size, sort_order.
product_colors: product_id, name, hex, sort_order.
categories: slug, name_ar, name_en, active, sort_order.
media_library: reusable image/video assets.
sliders: hero/slider media and text.
feedback: customer review screenshots.
delivery_areas: area name, price, active, sort order.
store_settings: key/value JSON for WhatsApp, social links, policies and store identity.
site_sections: ordered public sections/configuration.
orders: customer/order snapshot, items JSON, subtotal, delivery fee, total, status, notes.
customers: customer profile and aggregate totals.
coupons: promotion rules.

## Compatibility rules
1. Never reuse an existing product UUID for another product.
2. Never make the public site depend on Admin HTML/JS.
3. New fields should be additive and have safe defaults where possible.
4. Child records are updated by stable IDs/values; edits must not blindly delete and recreate everything.
5. Public visibility is controlled by active/visible flags.
6. Prices are numeric shekels. Discount percentage is derived from old_price > price.
7. Admin-only tables never receive anonymous SELECT access.
8. Existing COD + WhatsApp checkout remains compatible.
9. Existing customer-site design, links, policies and WhatsApp flow are preserved.
10. Contract changes require a migration and compatibility check.

## Flow
Admin edit -> Supabase -> public website reads the new state.

The two applications therefore share a data contract, not copied HTML.
