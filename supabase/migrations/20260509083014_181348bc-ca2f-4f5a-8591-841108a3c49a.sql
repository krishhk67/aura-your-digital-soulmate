CREATE OR REPLACE FUNCTION public.get_or_create_direct_chat(_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _current_user_id uuid := auth.uid();
  _chat_id uuid;
  _lock_key text;
BEGIN
  IF _current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _other_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user is required';
  END IF;

  IF _other_user_id = _current_user_id THEN
    RAISE EXCEPTION 'Cannot create a direct chat with yourself';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _other_user_id) THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  _lock_key := LEAST(_current_user_id::text, _other_user_id::text) || ':' || GREATEST(_current_user_id::text, _other_user_id::text);
  PERFORM pg_advisory_xact_lock(hashtext(_lock_key));

  SELECT c.id INTO _chat_id
  FROM public.chats c
  JOIN public.chat_members cm_self ON cm_self.chat_id = c.id AND cm_self.user_id = _current_user_id
  JOIN public.chat_members cm_other ON cm_other.chat_id = c.id AND cm_other.user_id = _other_user_id
  WHERE COALESCE(c.is_group, false) = false
  LIMIT 1;

  IF _chat_id IS NOT NULL THEN
    RETURN _chat_id;
  END IF;

  INSERT INTO public.chats (created_by, is_group)
  VALUES (_current_user_id, false)
  RETURNING id INTO _chat_id;

  INSERT INTO public.chat_members (chat_id, user_id, role)
  VALUES
    (_chat_id, _current_user_id, 'member'),
    (_chat_id, _other_user_id, 'member');

  RETURN _chat_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_direct_chat(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_chat(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_chat_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_chat_member(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.update_chat_timestamp() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;