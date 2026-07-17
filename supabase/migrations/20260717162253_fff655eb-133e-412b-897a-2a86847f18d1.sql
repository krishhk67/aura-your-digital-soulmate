
-- ============================================================
-- Group Management Overhaul: invite links + permissions matrix
-- ============================================================

-- 1. Columns on chats
ALTER TABLE public.chats
  ADD COLUMN IF NOT EXISTS invite_code text,
  ADD COLUMN IF NOT EXISTS invite_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT jsonb_build_object(
    'send_messages','everyone',
    'send_media','everyone',
    'send_voice','everyone',
    'add_members','admins',
    'edit_info','admins',
    'pin_messages','admins'
  );

CREATE UNIQUE INDEX IF NOT EXISTS chats_invite_code_unique ON public.chats(invite_code) WHERE invite_code IS NOT NULL;

-- Backfill invite codes for existing groups
UPDATE public.chats
SET invite_code = encode(extensions.gen_random_bytes(6),'hex')
WHERE is_group = true AND invite_code IS NULL;

-- Auto-generate invite code on new group chats
CREATE OR REPLACE FUNCTION public.handle_new_chat_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF COALESCE(NEW.is_group,false) = true AND NEW.invite_code IS NULL THEN
    NEW.invite_code := encode(extensions.gen_random_bytes(6),'hex');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS chats_invite_code_biu ON public.chats;
CREATE TRIGGER chats_invite_code_biu
BEFORE INSERT OR UPDATE ON public.chats
FOR EACH ROW EXECUTE FUNCTION public.handle_new_chat_invite();

-- 2. Permission helper (security definer, reads chat + membership)
CREATE OR REPLACE FUNCTION public.chat_permission_ok(_user_id uuid, _chat_id uuid, _key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _scope text;
  _role text;
  _owner uuid;
  _is_group boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  SELECT COALESCE(permissions->>_key,'everyone'), created_by, COALESCE(is_group,false)
    INTO _scope, _owner, _is_group
  FROM public.chats WHERE id = _chat_id;
  IF NOT FOUND THEN RETURN false; END IF;

  -- 1:1 chats are not permission-gated
  IF NOT _is_group THEN RETURN true; END IF;

  IF _user_id = _owner THEN RETURN true; END IF;

  SELECT role INTO _role FROM public.chat_members
    WHERE chat_id = _chat_id AND user_id = _user_id;
  IF _role IS NULL THEN RETURN false; END IF;

  IF _scope = 'everyone' THEN RETURN true; END IF;
  IF _scope = 'admins' THEN RETURN _role IN ('owner','admin'); END IF;
  IF _scope = 'owner' THEN RETURN _user_id = _owner; END IF;
  RETURN false;
END $$;

-- 3. RPC: set permissions (single key)
CREATE OR REPLACE FUNCTION public.set_chat_permission(_chat_id uuid, _key text, _value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF _key NOT IN ('send_messages','send_media','send_voice','add_members','edit_info','pin_messages') THEN
    RAISE EXCEPTION 'Invalid permission key';
  END IF;
  IF _value NOT IN ('everyone','admins','owner') THEN
    RAISE EXCEPTION 'Invalid permission value';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = _chat_id AND (
      c.created_by = _uid
      OR EXISTS (SELECT 1 FROM public.chat_members m WHERE m.chat_id=_chat_id AND m.user_id=_uid AND m.role IN ('owner','admin'))
    )
  ) THEN RAISE EXCEPTION 'Only owner or admins can change permissions'; END IF;

  UPDATE public.chats
    SET permissions = permissions || jsonb_build_object(_key, _value),
        updated_at = now()
    WHERE id = _chat_id;
END $$;

-- 4. RPC: rotate invite code
CREATE OR REPLACE FUNCTION public.rotate_chat_invite(_chat_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE _uid uuid := auth.uid(); _new text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = _chat_id AND (
      c.created_by = _uid
      OR EXISTS (SELECT 1 FROM public.chat_members m WHERE m.chat_id=_chat_id AND m.user_id=_uid AND m.role IN ('owner','admin'))
    )
  ) THEN RAISE EXCEPTION 'Only owner or admins can rotate the invite'; END IF;
  _new := encode(extensions.gen_random_bytes(6),'hex');
  UPDATE public.chats SET invite_code = _new, updated_at = now() WHERE id = _chat_id;
  RETURN _new;
END $$;

-- 5. RPC: toggle invite enabled
CREATE OR REPLACE FUNCTION public.set_chat_invite_enabled(_chat_id uuid, _enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = _chat_id AND (
      c.created_by = _uid
      OR EXISTS (SELECT 1 FROM public.chat_members m WHERE m.chat_id=_chat_id AND m.user_id=_uid AND m.role IN ('owner','admin'))
    )
  ) THEN RAISE EXCEPTION 'Only owner or admins can change invite settings'; END IF;
  UPDATE public.chats SET invite_enabled = _enabled, updated_at = now() WHERE id = _chat_id;
END $$;

-- 6. RPC: join a chat by invite code
CREATE OR REPLACE FUNCTION public.join_chat_by_invite(_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _cid uuid; _enabled boolean; _is_group boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF _invite_code IS NULL OR length(trim(_invite_code)) = 0 THEN RAISE EXCEPTION 'Invalid invite'; END IF;

  SELECT id, invite_enabled, COALESCE(is_group,false) INTO _cid, _enabled, _is_group
  FROM public.chats WHERE invite_code = trim(_invite_code);
  IF _cid IS NULL THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  IF NOT _is_group THEN RAISE EXCEPTION 'This invite is not for a group'; END IF;
  IF NOT _enabled THEN RAISE EXCEPTION 'This invite link has been disabled'; END IF;

  INSERT INTO public.chat_members(chat_id, user_id, role)
  VALUES (_cid, _uid, 'member')
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  RETURN _cid;
END $$;

-- 7. RPC: lookup invite (preview before joining)
CREATE OR REPLACE FUNCTION public.preview_chat_invite(_invite_code text)
RETURNS TABLE(chat_id uuid, name text, description text, avatar_url text, member_count bigint, already_member boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _cid uuid;
BEGIN
  SELECT id INTO _cid FROM public.chats
    WHERE invite_code = trim(_invite_code) AND COALESCE(is_group,false) = true AND invite_enabled = true;
  IF _cid IS NULL THEN RETURN; END IF;
  RETURN QUERY
    SELECT c.id, c.name, c.description, c.avatar_url,
      (SELECT count(*) FROM public.chat_members m WHERE m.chat_id=c.id),
      EXISTS(SELECT 1 FROM public.chat_members m WHERE m.chat_id=c.id AND m.user_id=_uid)
    FROM public.chats c WHERE c.id = _cid;
END $$;

-- 8. Rewrite RLS to enforce permissions

-- messages INSERT
DROP POLICY IF EXISTS "Members can send messages" ON public.messages;
CREATE POLICY "Members can send messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_chat_member(auth.uid(), chat_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.chat_members cm
    JOIN public.blocked_users b ON b.blocker_id = cm.user_id AND b.blocked_id = auth.uid()
    WHERE cm.chat_id = messages.chat_id AND cm.user_id <> auth.uid()
  )
  AND CASE
    WHEN message_type IN ('image','video','file') THEN public.chat_permission_ok(auth.uid(), chat_id, 'send_media')
    WHEN message_type = 'audio' THEN public.chat_permission_ok(auth.uid(), chat_id, 'send_voice')
    ELSE public.chat_permission_ok(auth.uid(), chat_id, 'send_messages')
  END
);

-- chats UPDATE (enforce edit_info)
DROP POLICY IF EXISTS "Owners and admins can update chat" ON public.chats;
CREATE POLICY "Owners and admins can update chat"
ON public.chats FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR (
    is_group = true
    AND public.chat_permission_ok(auth.uid(), id, 'edit_info')
  )
  OR EXISTS (
    SELECT 1 FROM public.chat_members m
    WHERE m.chat_id = chats.id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')
  )
);

-- chat_members INSERT (enforce add_members)
DROP POLICY IF EXISTS "Users can add members to their chats" ON public.chat_members;
CREATE POLICY "Users can add members to their chats"
ON public.chat_members FOR INSERT TO authenticated
WITH CHECK (
  -- self-join (initial creator / accept invite path handled by RPC)
  user_id = auth.uid()
  -- creator adding
  OR EXISTS (SELECT 1 FROM public.chats c WHERE c.id = chat_members.chat_id AND c.created_by = auth.uid())
  -- permitted adder
  OR public.chat_permission_ok(auth.uid(), chat_id, 'add_members')
);
