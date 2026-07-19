
-- =========================================================
-- ANONYMOUS SPACES
-- =========================================================

CREATE TABLE public.anonymous_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  title text,
  max_participants int,
  auto_close_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  destroyed_at timestamptz
);

CREATE INDEX idx_anon_spaces_chat ON public.anonymous_spaces(group_chat_id) WHERE destroyed_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anonymous_spaces TO authenticated;
GRANT ALL ON public.anonymous_spaces TO service_role;
ALTER TABLE public.anonymous_spaces ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.anonymous_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.anonymous_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alias text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  UNIQUE(space_id, user_id)
);
CREATE UNIQUE INDEX idx_anon_participants_alias ON public.anonymous_participants(space_id, lower(alias)) WHERE left_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anonymous_participants TO authenticated;
GRANT ALL ON public.anonymous_participants TO service_role;
ALTER TABLE public.anonymous_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.anonymous_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.anonymous_spaces(id) ON DELETE CASCADE,
  sender_participant_id uuid NOT NULL REFERENCES public.anonymous_participants(id) ON DELETE CASCADE,
  content text,
  media_url text,
  message_type text NOT NULL DEFAULT 'text',
  reply_to uuid REFERENCES public.anonymous_messages(id) ON DELETE SET NULL,
  ghost_reveal_seconds int,
  ghost_revealed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_anon_messages_space ON public.anonymous_messages(space_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anonymous_messages TO authenticated;
GRANT ALL ON public.anonymous_messages TO service_role;
ALTER TABLE public.anonymous_messages ENABLE ROW LEVEL SECURITY;

-- Ghost message columns on regular messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS ghost_reveal_seconds int,
  ADD COLUMN IF NOT EXISTS ghost_revealed_at timestamptz;

-- =========================================================
-- SECURITY DEFINER HELPERS (avoid RLS recursion)
-- =========================================================

CREATE OR REPLACE FUNCTION public.is_anon_space_participant(_user uuid, _space uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.anonymous_participants
    WHERE space_id = _space AND user_id = _user AND left_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_anon_space(_user uuid, _space uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.anonymous_spaces s
    JOIN public.chat_members cm ON cm.chat_id = s.group_chat_id
    WHERE s.id = _space AND cm.user_id = _user
  );
$$;

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- Spaces: group members can view + create; creator or last-participant destroys via RPC
CREATE POLICY "Group members can view spaces" ON public.anonymous_spaces
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE chat_id = group_chat_id AND user_id = auth.uid()
  ));

CREATE POLICY "Group members can create spaces" ON public.anonymous_spaces
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_id = group_chat_id AND user_id = auth.uid()
    )
  );

-- Participants: view rows only if you can view the space
CREATE POLICY "Space viewers can view participants" ON public.anonymous_participants
  FOR SELECT TO authenticated
  USING (public.can_view_anon_space(auth.uid(), space_id));

CREATE POLICY "Users can join spaces" ON public.anonymous_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_view_anon_space(auth.uid(), space_id)
  );

CREATE POLICY "Users can leave own participation" ON public.anonymous_participants
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anonymous messages: participants only
CREATE POLICY "Participants can view messages" ON public.anonymous_messages
  FOR SELECT TO authenticated
  USING (public.is_anon_space_participant(auth.uid(), space_id));

CREATE POLICY "Participants can send messages" ON public.anonymous_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_anon_space_participant(auth.uid(), space_id)
    AND EXISTS (
      SELECT 1 FROM public.anonymous_participants
      WHERE id = sender_participant_id AND user_id = auth.uid() AND left_at IS NULL
    )
  );

CREATE POLICY "Senders can delete own messages" ON public.anonymous_messages
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.anonymous_participants
    WHERE id = sender_participant_id AND user_id = auth.uid()
  ));

-- =========================================================
-- ALIAS GENERATION + JOIN RPC
-- =========================================================

CREATE OR REPLACE FUNCTION public._random_alias()
RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT (ARRAY['Echo','Cipher','Ash','Ghost','Nocturne','Obsidian','Drift','Nova','Vesper','Onyx','Ember','Halcyon','Solstice','Rune','Wren','Zephyr','Lyric','Sable','Cinder','Marlow'])[1 + floor(random()*20)::int]
    || floor(random()*90 + 10)::text;
$$;

CREATE OR REPLACE FUNCTION public.create_anonymous_space(
  _group_chat_id uuid,
  _title text DEFAULT NULL,
  _max_participants int DEFAULT NULL,
  _auto_close_minutes int DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _sid uuid; _is_group boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;

  SELECT COALESCE(is_group,false) INTO _is_group FROM public.chats WHERE id = _group_chat_id;
  IF NOT _is_group THEN RAISE EXCEPTION 'Anonymous spaces require a group chat'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.chat_members WHERE chat_id = _group_chat_id AND user_id = _uid) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  INSERT INTO public.anonymous_spaces(group_chat_id, title, max_participants, auto_close_at, created_by)
  VALUES (
    _group_chat_id,
    NULLIF(trim(coalesce(_title,'')), ''),
    _max_participants,
    CASE WHEN _auto_close_minutes IS NOT NULL AND _auto_close_minutes > 0
         THEN now() + make_interval(mins => _auto_close_minutes) ELSE NULL END,
    _uid
  )
  RETURNING id INTO _sid;

  -- Post an invite marker in the group
  INSERT INTO public.messages(chat_id, sender_id, content, message_type, metadata)
  VALUES (
    _group_chat_id, _uid,
    COALESCE(NULLIF(trim(coalesce(_title,'')),''),'Anonymous Space'),
    'anonymous_space_invite',
    jsonb_build_object('space_id', _sid)
  );

  RETURN _sid;
END $$;

CREATE OR REPLACE FUNCTION public.join_anonymous_space(_space_id uuid, _custom_alias text DEFAULT NULL)
RETURNS TABLE(participant_id uuid, alias text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _clean text; _try text; _cap int; _current int; _existing uuid; _existing_alias text;
  _attempt int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF NOT public.can_view_anon_space(_uid, _space_id) THEN
    RAISE EXCEPTION 'You are not a member of this group';
  END IF;

  -- Already joined? Return existing.
  SELECT id, alias INTO _existing, _existing_alias
    FROM public.anonymous_participants
    WHERE space_id = _space_id AND user_id = _uid AND left_at IS NULL;
  IF _existing IS NOT NULL THEN
    participant_id := _existing; alias := _existing_alias; RETURN NEXT; RETURN;
  END IF;

  SELECT max_participants INTO _cap FROM public.anonymous_spaces WHERE id = _space_id AND destroyed_at IS NULL;
  IF _cap IS NOT NULL THEN
    SELECT count(*) INTO _current FROM public.anonymous_participants WHERE space_id = _space_id AND left_at IS NULL;
    IF _current >= _cap THEN RAISE EXCEPTION 'Space is full'; END IF;
  END IF;

  IF _custom_alias IS NOT NULL AND length(trim(_custom_alias)) > 0 THEN
    _clean := trim(_custom_alias);
    IF _clean !~ '^[A-Za-z][A-Za-z0-9_]{1,15}$' THEN
      RAISE EXCEPTION 'Alias must be 2-16 characters, letters/numbers/underscore, starting with a letter';
    END IF;
    IF EXISTS (SELECT 1 FROM public.anonymous_participants WHERE space_id = _space_id AND lower(alias) = lower(_clean) AND left_at IS NULL) THEN
      RAISE EXCEPTION 'Alias already taken';
    END IF;
    _try := _clean;
  ELSE
    LOOP
      _try := public._random_alias();
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.anonymous_participants
        WHERE space_id = _space_id AND lower(alias) = lower(_try) AND left_at IS NULL
      );
      _attempt := _attempt + 1;
      IF _attempt > 20 THEN _try := _try || floor(random()*900+100)::text; EXIT; END IF;
    END LOOP;
  END IF;

  INSERT INTO public.anonymous_participants(space_id, user_id, alias)
  VALUES (_space_id, _uid, _try)
  RETURNING id INTO _existing;

  participant_id := _existing; alias := _try; RETURN NEXT; RETURN;
END $$;

CREATE OR REPLACE FUNCTION public.leave_anonymous_space(_space_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _remaining int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  UPDATE public.anonymous_participants
    SET left_at = now()
    WHERE space_id = _space_id AND user_id = _uid AND left_at IS NULL;

  SELECT count(*) INTO _remaining FROM public.anonymous_participants
    WHERE space_id = _space_id AND left_at IS NULL;

  IF _remaining = 0 THEN
    -- Hard destroy everything. Cascades take care of messages + participants.
    DELETE FROM public.anonymous_spaces WHERE id = _space_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.reveal_ghost_message(_message_id uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _chat uuid; _sender uuid; _revealed timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  SELECT chat_id, sender_id, ghost_revealed_at INTO _chat, _sender, _revealed
    FROM public.messages WHERE id = _message_id;
  IF _chat IS NULL THEN RAISE EXCEPTION 'Message not found'; END IF;
  IF _sender = _uid THEN RETURN _revealed; END IF;
  IF NOT public.is_chat_member(_uid, _chat) THEN RAISE EXCEPTION 'Not a member'; END IF;
  IF _revealed IS NULL THEN
    UPDATE public.messages SET ghost_revealed_at = now() WHERE id = _message_id RETURNING ghost_revealed_at INTO _revealed;
  END IF;
  RETURN _revealed;
END $$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.anonymous_spaces;
ALTER PUBLICATION supabase_realtime ADD TABLE public.anonymous_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.anonymous_messages;
