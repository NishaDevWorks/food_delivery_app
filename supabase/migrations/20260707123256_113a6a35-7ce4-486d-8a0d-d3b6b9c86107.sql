
-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('new_order','cancelled','system','review','delivered')),
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at desc);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REVIEWS
CREATE TABLE public.reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  author text,
  rating int not null check (rating between 1 and 5),
  comment text,
  reply text,
  status text not null default 'new' check (status in ('new','replied','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_reviews_restaurant ON public.reviews(restaurant_id, created_at desc);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users insert own review" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own review" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners update reviews of their restaurants" ON public.reviews FOR UPDATE TO authenticated USING (public.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "Users delete own review" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- COUPONS
CREATE TABLE public.coupons (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text,
  code text not null unique,
  description text not null default '',
  type text not null check (type in ('flat','percent','free_delivery')),
  value numeric not null default 0,
  min_order numeric not null default 0,
  max_discount numeric,
  active boolean not null default true,
  expires_at timestamptz,
  usage_limit int,
  used_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_coupons_restaurant ON public.coupons(restaurant_id);
GRANT SELECT ON public.coupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active coupons" ON public.coupons FOR SELECT USING (active = true OR public.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "Owners insert coupons" ON public.coupons FOR INSERT TO authenticated WITH CHECK (restaurant_id IS NULL OR public.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "Owners update coupons" ON public.coupons FOR UPDATE TO authenticated USING (public.owns_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "Owners delete coupons" ON public.coupons FOR DELETE TO authenticated USING (public.owns_restaurant(auth.uid(), restaurant_id));

-- updated_at trigger fn
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER trg_reviews_touch BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_coupons_touch BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ORDER NOTIFICATION TRIGGERS
CREATE OR REPLACE FUNCTION public.notify_new_order() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_row RECORD;
BEGIN
  IF NEW.restaurant_id IS NULL THEN RETURN NEW; END IF;
  FOR owner_row IN SELECT user_id FROM public.restaurant_owners WHERE restaurant_id = NEW.restaurant_id LOOP
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (owner_row.user_id, 'new_order',
            'New order · ₹' || round(NEW.total)::text,
            coalesce(NEW.restaurant_name,'') || ' · #' || substring(NEW.id::text, 1, 8),
            '/owner/orders');
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_new_order AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_new_order();

CREATE OR REPLACE FUNCTION public.notify_order_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_row RECORD;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status = 'cancelled' THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (NEW.user_id, 'cancelled', 'Order cancelled', 'Your order #' || substring(NEW.id::text,1,8) || ' was cancelled', '/orders');
    IF NEW.restaurant_id IS NOT NULL THEN
      FOR owner_row IN SELECT user_id FROM public.restaurant_owners WHERE restaurant_id = NEW.restaurant_id LOOP
        INSERT INTO public.notifications(user_id, type, title, body, link)
        VALUES (owner_row.user_id, 'cancelled', 'Order cancelled', '#' || substring(NEW.id::text,1,8) || ' cancelled', '/owner/orders');
      END LOOP;
    END IF;
  ELSIF NEW.status = 'delivered' THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (NEW.user_id, 'delivered', 'Order delivered', 'Enjoy your meal! Rate your experience.', '/orders');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_order_status AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_order_status();

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;
