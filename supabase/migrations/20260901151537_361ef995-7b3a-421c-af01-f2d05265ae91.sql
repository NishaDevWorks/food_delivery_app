CREATE TABLE public.saved_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_addresses TO authenticated;
GRANT ALL ON public.saved_addresses TO service_role;
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved addresses" ON public.saved_addresses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX saved_addresses_user_created_idx ON public.saved_addresses (user_id, created_at DESC);
CREATE INDEX saved_addresses_user_default_idx ON public.saved_addresses (user_id, is_default);
CREATE TRIGGER trg_saved_addresses_touch BEFORE UPDATE ON public.saved_addresses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  method_type text NOT NULL,
  provider text,
  display_name text NOT NULL,
  masked_identifier text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own payment methods" ON public.payment_methods FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX payment_methods_user_created_idx ON public.payment_methods (user_id, created_at DESC);
CREATE INDEX payment_methods_user_default_idx ON public.payment_methods (user_id, is_default);
CREATE TRIGGER trg_payment_methods_touch BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();