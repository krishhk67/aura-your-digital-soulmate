
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_chat_member(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_chat_timestamp() FROM anon;
