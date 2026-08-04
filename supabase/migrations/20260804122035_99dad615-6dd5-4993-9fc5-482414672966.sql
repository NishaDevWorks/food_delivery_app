REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.notify_new_order() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.notify_order_status() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM anon, authenticated, public;

REVOKE ALL ON FUNCTION public.claim_restaurant_ownership(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_restaurant_ownership(text) TO authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.owns_restaurant(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.owns_restaurant(uuid, text) TO authenticated;