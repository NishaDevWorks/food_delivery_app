-- QuickBite database schema
--
-- Apply this file in a Supabase SQL editor on a fresh project. It is
-- intentionally idempotent so it can also be used to bring an existing
-- project up to the schema expected by the React app. The auth.users table is
-- managed by Supabase and is referenced, never created, here.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'customer');

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles self select" ON public.profiles;
DROP POLICY IF EXISTS "profiles self upsert" ON public.profiles;
DROP POLICY IF EXISTS "profiles self update" ON public.profiles;
CREATE POLICY "profiles self select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles self upsert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.restaurant_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, restaurant_id)
);
GRANT SELECT, INSERT, DELETE ON public.restaurant_owners TO authenticated;
GRANT ALL ON public.restaurant_owners TO service_role;
ALTER TABLE public.restaurant_owners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner reads own links" ON public.restaurant_owners;
DROP POLICY IF EXISTS "owner inserts own link" ON public.restaurant_owners;
DROP POLICY IF EXISTS "owner deletes own link" ON public.restaurant_owners;
CREATE POLICY "owner reads own links" ON public.restaurant_owners FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner inserts own link" ON public.restaurant_owners FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner deletes own link" ON public.restaurant_owners FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
CREATE OR REPLACE FUNCTION private.owns_restaurant(_user_id uuid, _restaurant_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_owners
    WHERE user_id = _user_id AND restaurant_id = _restaurant_id
  )
$$;
REVOKE ALL ON FUNCTION private.owns_restaurant(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.owns_restaurant(uuid, text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  restaurant_id text PRIMARY KEY,
  is_open boolean NOT NULL DEFAULT true,
  prep_time_min integer NOT NULL DEFAULT 20,
  min_order integer NOT NULL DEFAULT 0,
  cover_image text,
  phone text,
  address text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.restaurant_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.restaurant_settings TO authenticated;
GRANT ALL ON public.restaurant_settings TO service_role;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone reads settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "owner inserts settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "owner updates settings" ON public.restaurant_settings;
CREATE POLICY "anyone reads settings" ON public.restaurant_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "owner inserts settings" ON public.restaurant_settings FOR INSERT TO authenticated WITH CHECK (private.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "owner updates settings" ON public.restaurant_settings FOR UPDATE TO authenticated USING (private.owns_restaurant(auth.uid(), restaurant_id)) WITH CHECK (private.owns_restaurant(auth.uid(), restaurant_id));

CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id text NOT NULL,
  category text NOT NULL DEFAULT 'Mains',
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  image text,
  emoji text DEFAULT '🍽️',
  is_veg boolean NOT NULL DEFAULT true,
  in_stock boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS menu_items_restaurant_category_idx ON public.menu_items (restaurant_id, category, name);
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone reads menu" ON public.menu_items;
DROP POLICY IF EXISTS "owner inserts items" ON public.menu_items;
DROP POLICY IF EXISTS "owner updates items" ON public.menu_items;
DROP POLICY IF EXISTS "owner deletes items" ON public.menu_items;
CREATE POLICY "anyone reads menu" ON public.menu_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "owner inserts items" ON public.menu_items FOR INSERT TO authenticated WITH CHECK (private.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "owner updates items" ON public.menu_items FOR UPDATE TO authenticated USING (private.owns_restaurant(auth.uid(), restaurant_id)) WITH CHECK (private.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "owner deletes items" ON public.menu_items FOR DELETE TO authenticated USING (private.owns_restaurant(auth.uid(), restaurant_id));

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL,
  subtotal numeric NOT NULL,
  delivery_fee numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL,
  payment_method text NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  transaction_id text,
  razorpay_order_id text,
  razorpay_payment_id text,
  coupon_code text,
  restaurant_name text,
  status text NOT NULL DEFAULT 'preparing',
  placed_at timestamptz NOT NULL DEFAULT now(),
  restaurant_id text
);
CREATE INDEX IF NOT EXISTS orders_user_placed_idx ON public.orders (user_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS orders_restaurant_idx ON public.orders (restaurant_id, placed_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders self select" ON public.orders;
DROP POLICY IF EXISTS "orders self insert" ON public.orders;
DROP POLICY IF EXISTS "orders self update" ON public.orders;
DROP POLICY IF EXISTS "owner reads restaurant orders" ON public.orders;
DROP POLICY IF EXISTS "owner updates restaurant orders" ON public.orders;
CREATE POLICY "orders self select" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "orders self insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders self update" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner reads restaurant orders" ON public.orders FOR SELECT TO authenticated USING (restaurant_id IS NOT NULL AND private.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "owner updates restaurant orders" ON public.orders FOR UPDATE TO authenticated USING (restaurant_id IS NOT NULL AND private.owns_restaurant(auth.uid(), restaurant_id)) WITH CHECK (restaurant_id IS NOT NULL AND private.owns_restaurant(auth.uid(), restaurant_id));
ALTER TABLE public.orders REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('new_order', 'cancelled', 'system', 'review', 'delivered')),
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  author text,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  reply text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'replied', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_restaurant_created_idx ON public.reviews (restaurant_id, created_at DESC);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users insert own review" ON public.reviews;
DROP POLICY IF EXISTS "Users update own review" ON public.reviews;
DROP POLICY IF EXISTS "Owners update reviews of their restaurants" ON public.reviews;
DROP POLICY IF EXISTS "Users delete own review" ON public.reviews;
CREATE POLICY "Anyone reads reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users insert own review" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own review" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update reviews of their restaurants" ON public.reviews FOR UPDATE TO authenticated USING (private.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "Users delete own review" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id text,
  code text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  type text NOT NULL CHECK (type IN ('flat', 'percent', 'free_delivery')),
  value numeric NOT NULL DEFAULT 0,
  min_order numeric NOT NULL DEFAULT 0,
  max_discount numeric,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coupons_restaurant_idx ON public.coupons (restaurant_id);
GRANT SELECT ON public.coupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Owners insert coupons" ON public.coupons;
DROP POLICY IF EXISTS "Owners update coupons" ON public.coupons;
DROP POLICY IF EXISTS "Owners delete coupons" ON public.coupons;
CREATE POLICY "Anyone reads active coupons" ON public.coupons FOR SELECT TO anon, authenticated USING (active = true OR private.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "Owners insert coupons" ON public.coupons FOR INSERT TO authenticated WITH CHECK (restaurant_id IS NULL OR private.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "Owners update coupons" ON public.coupons FOR UPDATE TO authenticated USING (private.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "Owners delete coupons" ON public.coupons FOR DELETE TO authenticated USING (private.owns_restaurant(auth.uid(), restaurant_id));

CREATE TABLE IF NOT EXISTS public.saved_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  house_number text,
  building_name text,
  society text,
  road text,
  area text,
  suburb text,
  city text,
  district text,
  state text,
  postal_code text,
  country text,
  formatted_address text NOT NULL,
  latitude double precision,
  longitude double precision,
  raw_geocode jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saved_addresses_user_created_idx ON public.saved_addresses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS saved_addresses_user_default_idx ON public.saved_addresses (user_id, is_default);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_addresses TO authenticated;
GRANT ALL ON public.saved_addresses TO service_role;
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own saved addresses" ON public.saved_addresses;
CREATE POLICY "Users manage own saved addresses" ON public.saved_addresses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_type text NOT NULL,
  provider text,
  display_name text NOT NULL,
  masked_identifier text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_methods_user_created_idx ON public.payment_methods (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_methods_user_default_idx ON public.payment_methods (user_id, is_default);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own payment methods" ON public.payment_methods;
CREATE POLICY "Users manage own payment methods" ON public.payment_methods FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_reviews_touch ON public.reviews;
DROP TRIGGER IF EXISTS trg_coupons_touch ON public.coupons;
DROP TRIGGER IF EXISTS trg_saved_addresses_touch ON public.saved_addresses;
DROP TRIGGER IF EXISTS trg_payment_methods_touch ON public.payment_methods;
CREATE TRIGGER trg_reviews_touch BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_coupons_touch BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_saved_addresses_touch BEFORE UPDATE ON public.saved_addresses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_payment_methods_touch BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    NEW.email,
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone), '')
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE owner_row record;
BEGIN
  IF NEW.restaurant_id IS NULL THEN RETURN NEW; END IF;
  FOR owner_row IN SELECT user_id FROM public.restaurant_owners WHERE restaurant_id = NEW.restaurant_id LOOP
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (owner_row.user_id, 'new_order', 'New order · ₹' || round(NEW.total)::text,
            coalesce(NEW.restaurant_name, '') || ' · #' || substring(NEW.id::text, 1, 8), '/owner/orders');
  END LOOP;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_new_order() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_notify_new_order ON public.orders;
CREATE TRIGGER trg_notify_new_order AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_new_order();

CREATE OR REPLACE FUNCTION public.notify_order_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE owner_row record;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status = 'cancelled' THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (NEW.user_id, 'cancelled', 'Order cancelled', 'Your order #' || substring(NEW.id::text, 1, 8) || ' was cancelled', '/orders');
    IF NEW.restaurant_id IS NOT NULL THEN
      FOR owner_row IN SELECT user_id FROM public.restaurant_owners WHERE restaurant_id = NEW.restaurant_id LOOP
        INSERT INTO public.notifications(user_id, type, title, body, link)
        VALUES (owner_row.user_id, 'cancelled', 'Order cancelled', '#' || substring(NEW.id::text, 1, 8) || ' cancelled', '/owner/orders');
      END LOOP;
    END IF;
  ELSIF NEW.status = 'delivered' THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (NEW.user_id, 'delivered', 'Order delivered', 'Enjoy your meal! Rate your experience.', '/orders');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_order_status() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_notify_order_status ON public.orders;
CREATE TRIGGER trg_notify_order_status AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_order_status();

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;