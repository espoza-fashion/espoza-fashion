# Saved / abandoned carts

The admin dashboard now reads the existing `customer_carts` table and customer profiles under existing admin-only RLS. No schema, grants or existing records were changed.

- Navigation: السلات المتروكة. Search name/email/phone; filter inactivity at 1 hour (default), 24 hours, 72 hours, or all nonempty carts.
- Shows items, quantities, variants, stored price estimate excluding delivery, last cart modification and available customer contact information. An inactivity threshold is a heuristic, not proof the customer left. Prices are snapshots, not guaranteed current prices.
- Reads all pages (500 records each); errors are visible and retained results marked stale. Refresh button reloads actual server data; elapsed status re-renders every minute while the section is open.
- Empty carts are excluded. Guest carts remain local to the device and are explicitly outside this account-cart view. No guest identity is inferred or exposed and no automated messages are sent.
- Customer cart writes are serialized and checked against the current session. Successful checkout awaits the empty-cart write; failure is disclosed without claiming the successfully saved order failed. Restoring a saved cart no longer touches its modification timestamp merely by reading it.
- Limit: multiple browser tabs/devices still use last-write-wins. If the browser is closed before a pending save reaches the server, its newest snapshot may not be saved. The admin view refreshes on entry or manually; it does not stream realtime changes.

Validation: 26 Node tests passed, including age/empty/invalid timestamp classification, serialized write completion, cross-account session guard and escaped rendering. Live SQL role simulation confirmed existing admin sees one saved/inactive cart and an unrelated customer sees zero. No cart/customer contents were copied into the repository. Actual authenticated browser and phone visual flows remain unverified.
