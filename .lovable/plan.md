
# Restaurant Owner Dashboard

Your list is huge — it's essentially 4 apps (customer, owner, delivery, admin). I'll ship a solid **Phase 1** that covers the ~80% of owner workflows you actually need on day one. Phase 2/3 items are listed at the bottom; we add them once Phase 1 is live.

## Phase 1 — What I'll build now

### 1. Owner role & login gate
- New `app_role` enum: `admin`, `owner`, `customer`
- `user_roles` table (separate from profiles) + `has_role()` security-definer function
- `restaurant_owners` table linking `user_id ↔ restaurant_id` (one owner can own multiple restaurants)
- `/owner` becomes a protected route: only users with `owner` role can access; non-owners see "Request owner access" screen
- If the signed-in user owns multiple restaurants, a switcher at the top

### 2. Dashboard home (`/owner`)
- Today's stats: total orders, revenue, avg order value, pending count
- Status breakdown pills: New · Preparing · Ready · Out for delivery · Delivered · Cancelled
- 7-day revenue sparkline (simple SVG, no chart lib)
- Top 5 selling items this week

### 3. Live orders (`/owner/orders`)
- Realtime feed of incoming orders (Supabase realtime on `orders` table, filtered to owner's restaurant)
- Sound + toast on new order
- Each order card: items, total, payment status, customer name, time
- Action buttons: **Accept → Preparing → Ready → Out for delivery → Delivered**, or **Reject/Cancel** (with reason)
- Status changes push live to the customer's `/track` page (already wired via realtime)
- Filter tabs: All · Active · Completed · Cancelled

### 4. Menu management (`/owner/menu`) — upgrade existing
- Categories (Starters, Mains, Drinks, Desserts) — create/rename/delete
- Items: name, price, description, image, emoji, **veg/non-veg**, **in-stock toggle**
- Move to Supabase-backed tables (currently localStorage-only, so items don't show for customers on other devices)
- Quick "86 this item" toggle to mark out-of-stock instantly

### 5. Restaurant profile (`/owner/settings`)
- Name, cuisine, banner image, address, phone
- Opening/closing hours per day
- **Open/Closed toggle** (busy mode) — hides restaurant from customer listing when off
- Prep time, min order, delivery radius

### 6. Analytics (`/owner/analytics`)
- Daily / Weekly / Monthly revenue chart
- Order count trend
- Best-selling items with quantity + revenue
- Peak hours heatmap (simple grid)

## Phase 2 — later (nice-to-have)
- Coupons manager UI (backend already supports coupons)
- Reviews inbox with reply
- Invoice PDF / print
- Push notifications
- GST/tax settings

## Phase 3 — separate apps (big scope, decide later)
- Delivery partner app + assignment
- Platform admin panel (approve restaurants, commissions)
- Staff sub-accounts with role permissions
- Inventory / raw material tracking

---

## Technical notes

**Database changes (one migration):**
- `app_role` enum, `user_roles`, `restaurant_owners`, `has_role()` function
- `restaurants` table (currently hardcoded in `src/lib/data.ts` — moves to DB so owners can edit)
- `menu_categories`, `menu_items` tables (replaces localStorage `owner.ts`)
- Add `restaurant_id` FK to `orders` so realtime filter works per-owner
- RLS: owners can read/update only their restaurants' data; customers keep existing self-scoped policies
- GRANTs on every new public table

**Realtime:** `orders` is already on `supabase_realtime` publication; owner order feed subscribes with `filter: restaurant_id=eq.<id>`.

**No new dependencies.** Charts use inline SVG. Design matches existing violet/pink gradient system.

**Seeding owner access:** After the migration approves, I'll add a one-shot self-service "Become owner of demo restaurant" button (dev only) so you can test without manually inserting rows.

---

**Scope check:** Phase 1 is roughly 6–8 new/updated files + 1 migration. Want me to proceed with all of Phase 1, or narrow it further (e.g. just role gate + live orders first)?
