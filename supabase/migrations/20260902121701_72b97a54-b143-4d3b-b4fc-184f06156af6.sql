ALTER TABLE public.saved_addresses
  ADD CONSTRAINT saved_addresses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;