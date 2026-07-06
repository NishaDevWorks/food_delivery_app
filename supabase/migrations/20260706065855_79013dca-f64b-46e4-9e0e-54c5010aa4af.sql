
-- 1) Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'customer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 2) Restaurant owners (restaurant_id is text — matches hardcoded src/lib/data.ts ids)
CREATE TABLE public.restaurant_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, restaurant_id)
);
GRANT SELECT, INSERT, DELETE ON public.restaurant_owners TO authenticated;
GRANT ALL ON public.restaurant_owners TO service_role;
ALTER TABLE public.restaurant_owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads own links" ON public.restaurant_owners FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner inserts own link" ON public.restaurant_owners FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner deletes own link" ON public.restaurant_owners FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.owns_restaurant(_user_id uuid, _restaurant_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.restaurant_owners WHERE user_id = _user_id AND restaurant_id = _restaurant_id)
$$;

-- 3) Restaurant settings (owner-editable)
CREATE TABLE public.restaurant_settings (
  restaurant_id text PRIMARY KEY,
  is_open boolean NOT NULL DEFAULT true,
  prep_time_min int NOT NULL DEFAULT 20,
  min_order int NOT NULL DEFAULT 0,
  cover_image text,
  phone text,
  address text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.restaurant_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.restaurant_settings TO authenticated;
GRANT ALL ON public.restaurant_settings TO service_role;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads settings" ON public.restaurant_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "owner inserts settings" ON public.restaurant_settings FOR INSERT TO authenticated WITH CHECK (public.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "owner updates settings" ON public.restaurant_settings FOR UPDATE TO authenticated USING (public.owns_restaurant(auth.uid(), restaurant_id)) WITH CHECK (public.owns_restaurant(auth.uid(), restaurant_id));

-- 4) Menu items (cloud-synced)
CREATE TABLE public.menu_items (
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
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads menu" ON public.menu_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "owner inserts items" ON public.menu_items FOR INSERT TO authenticated WITH CHECK (public.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "owner updates items" ON public.menu_items FOR UPDATE TO authenticated USING (public.owns_restaurant(auth.uid(), restaurant_id)) WITH CHECK (public.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "owner deletes items" ON public.menu_items FOR DELETE TO authenticated USING (public.owns_restaurant(auth.uid(), restaurant_id));

-- 5) Add restaurant_id to orders + let owners read/update their restaurant's orders
ALTER TABLE public.orders ADD COLUMN restaurant_id text;
CREATE INDEX idx_orders_restaurant_id ON public.orders(restaurant_id);

CREATE POLICY "owner reads restaurant orders" ON public.orders FOR SELECT TO authenticated USING (restaurant_id IS NOT NULL AND public.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "owner updates restaurant orders" ON public.orders FOR UPDATE TO authenticated USING (restaurant_id IS NOT NULL AND public.owns_restaurant(auth.uid(), restaurant_id)) WITH CHECK (restaurant_id IS NOT NULL AND public.owns_restaurant(auth.uid(), restaurant_id));

-- 6) RPC: self-grant owner access for a demo restaurant (any signed-in user)
CREATE OR REPLACE FUNCTION public.claim_restaurant_ownership(_restaurant_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'owner') ON CONFLICT DO NOTHING;
  INSERT INTO public.restaurant_owners (user_id, restaurant_id) VALUES (auth.uid(), _restaurant_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.restaurant_settings (restaurant_id) VALUES (_restaurant_id) ON CONFLICT DO NOTHING;
END $$;
GRANT EXECUTE ON FUNCTION public.claim_restaurant_ownership(text) TO authenticated;
