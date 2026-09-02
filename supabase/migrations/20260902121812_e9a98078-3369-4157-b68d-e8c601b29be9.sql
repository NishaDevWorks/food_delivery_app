CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.owns_restaurant(_user_id uuid, _restaurant_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurant_owners
    WHERE user_id = _user_id
      AND restaurant_id = _restaurant_id
  )
$$;
REVOKE ALL ON FUNCTION private.owns_restaurant(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.owns_restaurant(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "owner inserts settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "owner updates settings" ON public.restaurant_settings;
CREATE POLICY "owner inserts settings" ON public.restaurant_settings
  FOR INSERT TO authenticated
  WITH CHECK (private.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "owner updates settings" ON public.restaurant_settings
  FOR UPDATE TO authenticated
  USING (private.owns_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (private.owns_restaurant(auth.uid(), restaurant_id));

DROP POLICY IF EXISTS "owner inserts items" ON public.menu_items;
DROP POLICY IF EXISTS "owner updates items" ON public.menu_items;
DROP POLICY IF EXISTS "owner deletes items" ON public.menu_items;
CREATE POLICY "owner inserts items" ON public.menu_items
  FOR INSERT TO authenticated
  WITH CHECK (private.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "owner updates items" ON public.menu_items
  FOR UPDATE TO authenticated
  USING (private.owns_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (private.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "owner deletes items" ON public.menu_items
  FOR DELETE TO authenticated
  USING (private.owns_restaurant(auth.uid(), restaurant_id));

DROP POLICY IF EXISTS "owner reads restaurant orders" ON public.orders;
DROP POLICY IF EXISTS "owner updates restaurant orders" ON public.orders;
CREATE POLICY "owner reads restaurant orders" ON public.orders
  FOR SELECT TO authenticated
  USING (restaurant_id IS NOT NULL AND private.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "owner updates restaurant orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (restaurant_id IS NOT NULL AND private.owns_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (restaurant_id IS NOT NULL AND private.owns_restaurant(auth.uid(), restaurant_id));

DROP POLICY IF EXISTS "Owners update reviews of their restaurants" ON public.reviews;
CREATE POLICY "Owners update reviews of their restaurants" ON public.reviews
  FOR UPDATE TO authenticated
  USING (private.owns_restaurant(auth.uid(), restaurant_id));

DROP POLICY IF EXISTS "Anyone reads active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Owners insert coupons" ON public.coupons;
DROP POLICY IF EXISTS "Owners update coupons" ON public.coupons;
DROP POLICY IF EXISTS "Owners delete coupons" ON public.coupons;
CREATE POLICY "Anyone reads active coupons" ON public.coupons
  FOR SELECT
  USING (active = true OR private.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "Owners insert coupons" ON public.coupons
  FOR INSERT TO authenticated
  WITH CHECK (restaurant_id IS NULL OR private.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "Owners update coupons" ON public.coupons
  FOR UPDATE TO authenticated
  USING (private.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "Owners delete coupons" ON public.coupons
  FOR DELETE TO authenticated
  USING (private.owns_restaurant(auth.uid(), restaurant_id));

DROP FUNCTION public.owns_restaurant(uuid, text);
DROP FUNCTION public.has_role(uuid, public.app_role);
REVOKE ALL ON FUNCTION public.claim_restaurant_ownership(text) FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.claim_restaurant_ownership(text);