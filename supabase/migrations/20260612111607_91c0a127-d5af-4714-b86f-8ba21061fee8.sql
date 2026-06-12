
-- Group management RPCs (all SECURITY DEFINER)

-- Transfer chat ownership to another member
CREATE OR REPLACE FUNCTION public.transfer_chat_ownership(_chat_id uuid, _new_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.chats WHERE id = _chat_id AND created_by = _uid) THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.chat_members WHERE chat_id = _chat_id AND user_id = _new_owner_id) THEN
    RAISE EXCEPTION 'Target user is not a member of this group';
  END IF;
  UPDATE public.chats SET created_by = _new_owner_id, updated_at = now() WHERE id = _chat_id;
  UPDATE public.chat_members SET role = 'owner' WHERE chat_id = _chat_id AND user_id = _new_owner_id;
  UPDATE public.chat_members SET role = 'admin' WHERE chat_id = _chat_id AND user_id = _uid;
END;
$$;

-- Delete a group chat entirely (owner only). Cascade removes members & messages.
CREATE OR REPLACE FUNCTION public.delete_chat(_chat_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.chats WHERE id = _chat_id AND created_by = _uid) THEN
    RAISE EXCEPTION 'Only the owner can delete this group';
  END IF;
  DELETE FROM public.chats WHERE id = _chat_id;
END;
$$;

-- Add members to a group (owner/admin) and send notifications
CREATE OR REPLACE FUNCTION public.add_chat_members(_chat_id uuid, _user_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_admin boolean;
  _chat_name text;
  _added integer := 0;
  _uid_to_add uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  SELECT (created_by = _uid OR EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE chat_id = _chat_id AND user_id = _uid AND role = ANY (ARRAY['owner','admin'])
  )), name
  INTO _is_admin, _chat_name
  FROM public.chats WHERE id = _chat_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Chat not found'; END IF;
  IF NOT _is_admin THEN RAISE EXCEPTION 'Only owner or admins can add members'; END IF;

  FOREACH _uid_to_add IN ARRAY _user_ids LOOP
    INSERT INTO public.chat_members(chat_id, user_id, role)
    VALUES (_chat_id, _uid_to_add, 'member')
    ON CONFLICT (chat_id, user_id) DO NOTHING;
    IF FOUND THEN
      _added := _added + 1;
      INSERT INTO public.notifications(user_id, type, title, body, data)
      VALUES (
        _uid_to_add, 'group_added',
        'Added to group',
        COALESCE(_chat_name, 'a group') || ' added you',
        jsonb_build_object('chat_id', _chat_id)
      );
    END IF;
  END LOOP;
  RETURN _added;
END;
$$;
