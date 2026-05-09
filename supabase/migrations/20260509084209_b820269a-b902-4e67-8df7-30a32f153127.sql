CREATE OR REPLACE FUNCTION public.get_or_create_direct_chat(_other_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Ensure chats RLS allows authenticated creators (idempotent recreate)
DROP POLICY IF EXISTS "Authenticated users can create chats" ON public.chats;
CREATE POLICY "Authenticated users can create chats" ON public.chats
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Members can view their chats" ON public.chats;
CREATE POLICY "Members can view their chats" ON public.chats
  FOR SELECT TO authenticated
  USING (public.is_chat_member(auth.uid(), id) OR created_by = auth.uid());

-- chat_members: allow self-insert OR insert by chat creator OR by existing member
DROP POLICY IF EXISTS "Users can add members to their chats" ON public.chat_members;
CREATE POLICY "Users can add members to their chats" ON public.chat_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id AND created_by = auth.uid())
    OR public.is_chat_member(auth.uid(), chat_id)
  );

DROP POLICY IF EXISTS "Members can view chat members" ON public.chat_members;
CREATE POLICY "Members can view chat members" ON public.chat_members
  FOR SELECT TO authenticated
  USING (public.is_chat_member(auth.uid(), chat_id));

-- messages policies (idempotent)
DROP POLICY IF EXISTS "Members can send messages" ON public.messages;
CREATE POLICY "Members can send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND public.is_chat_member(auth.uid(), chat_id));

DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
CREATE POLICY "Members can view messages" ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_chat_member(auth.uid(), chat_id));