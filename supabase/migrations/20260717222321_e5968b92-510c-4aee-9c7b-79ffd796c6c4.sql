
-- 1. Backfill NULL roles to 'member' so existing group members satisfy permission checks.
UPDATE public.chat_members SET role = 'member' WHERE role IS NULL;

-- 2. Ensure future rows always have a role.
ALTER TABLE public.chat_members ALTER COLUMN role SET DEFAULT 'member';
ALTER TABLE public.chat_members ALTER COLUMN role SET NOT NULL;

-- 3. Harden chat_permission_ok: any member (regardless of legacy null role) passes 'everyone';
--    admin/owner scopes still require the correct role.
CREATE OR REPLACE FUNCTION public.chat_permission_ok(_user_id uuid, _chat_id uuid, _key text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _scope text;
  _role text;
  _owner uuid;
  _is_group boolean;
  _is_member boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  SELECT COALESCE(permissions->>_key,'everyone'), created_by, COALESCE(is_group,false)
    INTO _scope, _owner, _is_group
  FROM public.chats WHERE id = _chat_id;
  IF NOT FOUND THEN RETURN false; END IF;

  -- 1:1 chats are not permission-gated
  IF NOT _is_group THEN RETURN true; END IF;

  IF _user_id = _owner THEN RETURN true; END IF;

  SELECT role, true INTO _role, _is_member FROM public.chat_members
    WHERE chat_id = _chat_id AND user_id = _user_id;
  IF NOT COALESCE(_is_member, false) THEN RETURN false; END IF;

  IF _scope = 'everyone' THEN RETURN true; END IF;
  IF _scope = 'admins' THEN RETURN COALESCE(_role,'member') IN ('owner','admin'); END IF;
  IF _scope = 'owner' THEN RETURN _user_id = _owner; END IF;
  RETURN false;
END $function$;
