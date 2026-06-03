REVOKE EXECUTE ON FUNCTION public.cleanup_expired_messages() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_message_expiry() FROM PUBLIC, anon, authenticated;