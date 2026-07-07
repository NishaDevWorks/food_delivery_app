# Owner Dashboard: Phase 2

Four features, one migration, ~10 files. All cloud-synced with RLS.

## 1. Notifications center
- New table `notifications`: `user_id`, `type` (`new_order` | `cancelled` | `system`), `title`, `body`, `link`, `read`, `created_at`
- DB trigger on `orders` INSERT → notify restaurant owners ("New order #1234 · ₹450")
- DB trigger on `orders` UPDATE (status→`cancelled`) → notify owner AND customer
- Bell icon in `OwnerShell` header + existing customer header with unread badge
- New route `/notifications` (customer) already exists — upgrade to read cloud table + mark-read
- New route `/owner/notifications` for owner-side
- Realtime subscription for live badge updates

## 2. Invoices
- Generate invoice on-demand from any `delivered` order (no new table needed — orders already store all line items, totals, tax)
- New route `/orders/$id/invoice` — printable HTML invoice (restaurant name, GST-style breakdown, items, totals, customer info)
- "Download PDF" button uses `window.print()` with print CSS (no new deps)
- Invoices list at `/invoices` shows all delivered orders with download links
- Owner side: invoice link on each delivered order in `/owner/orders`

## 3. Reviews inbox (owner)
- Migrate existing localStorage `reviews` to new `reviews` table: `restaurant_id`, `user_id`, `order_id` (nullable), `rating`, `comment`, `reply` (nullable), `status` (`new` | `replied` | `archived`), `created_at`
- Keep existing customer review UI on restaurant page — write to cloud
- New route `/owner/reviews` with:
  - Filter tabs: All · New · Replied · Archived · by star rating (1–5)
  - Reply textarea inline, saves `reply` + sets status=`replied`
  - Archive button
  - Realtime updates + unread count in nav

## 4. Coupons editor
- New table `coupons`: `restaurant_id` (nullable = global), `code`, `description`, `type` (`flat` | `percent` | `free_delivery`), `value`, `min_order`, `max_discount`, `active`, `expires_at`, `usage_limit`, `used_count`
- New route `/owner/coupons`: CRUD list, toggle active, expiry picker
- Cart apply-coupon flow: replace static `COUPONS` in `src/lib/coupons.ts` with cloud fetch (falls back to static if offline)
- Increment `used_count` on successful order placement

## Technical

- One migration: `notifications`, `reviews`, `coupons` tables + GRANTs + RLS + two triggers on `orders`
- RLS: owners see rows for their restaurants (via `owns_restaurant()`); customers see own notifications/reviews
- Realtime: add all three tables to `supabase_realtime` publication
- No new npm deps — invoices use print CSS
- New nav items in `OwnerShell`: Reviews, Coupons, Notifications
- Update `src/lib/coupons.ts` to async cloud fetch
- Update `src/lib/reviews.ts` to cloud-backed

## Not in scope (defer)
- Email/SMS delivery of notifications
- Real PDF generation lib (print-to-PDF works cross-browser)
- Coupon usage analytics dashboard (basic count only)

Proceed with all four, or trim to a subset?
