
-- ROOMS
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_private boolean NOT NULL DEFAULT false,
  invite_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_members TO authenticated;
GRANT ALL ON public.room_members TO service_role;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  message_type text NOT NULL DEFAULT 'text',
  media_url text,
  reply_to uuid REFERENCES public.room_messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_messages TO authenticated;
GRANT ALL ON public.room_messages TO service_role;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.room_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.room_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_message_reactions TO authenticated;
GRANT ALL ON public.room_message_reactions TO service_role;
ALTER TABLE public.room_message_reactions ENABLE ROW LEVEL SECURITY;

-- helpers
CREATE OR REPLACE FUNCTION public.is_room_member(_user uuid, _room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.room_members WHERE user_id=_user AND room_id=_room);
$$;

CREATE OR REPLACE FUNCTION public.room_role(_user uuid, _room uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.room_members WHERE user_id=_user AND room_id=_room LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.join_room(_room_id uuid, _invite_code text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _priv boolean; _code text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  SELECT is_private, invite_code INTO _priv, _code FROM public.rooms WHERE id=_room_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;
  IF _priv AND (_invite_code IS NULL OR _invite_code <> _code) THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  INSERT INTO public.room_members(room_id, user_id, role) VALUES (_room_id, _uid, 'member')
    ON CONFLICT (room_id, user_id) DO NOTHING;
  RETURN _room_id;
END $$;

CREATE OR REPLACE FUNCTION public.join_room_by_code(_invite_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _rid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  SELECT id INTO _rid FROM public.rooms WHERE invite_code=_invite_code;
  IF _rid IS NULL THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  INSERT INTO public.room_members(room_id, user_id, role) VALUES (_rid, _uid, 'member')
    ON CONFLICT (room_id, user_id) DO NOTHING;
  RETURN _rid;
END $$;

-- auto add owner as member; auto invite code; updated_at
CREATE OR REPLACE FUNCTION public.handle_new_room()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := encode(gen_random_bytes(6),'hex');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rooms_before_insert BEFORE INSERT ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_room();

CREATE OR REPLACE FUNCTION public.add_owner_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.room_members(room_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER rooms_after_insert AFTER INSERT ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_membership();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER rooms_touch BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
CREATE POLICY "view public or joined rooms" ON public.rooms FOR SELECT TO authenticated
  USING (NOT is_private OR public.is_room_member(auth.uid(), id) OR owner_id = auth.uid());
CREATE POLICY "create rooms" ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner updates room" ON public.rooms FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner deletes room" ON public.rooms FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "view members of accessible rooms" ON public.room_members FOR SELECT TO authenticated
  USING (
    public.is_room_member(auth.uid(), room_id)
    OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND NOT r.is_private)
  );
CREATE POLICY "self join" ON public.room_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "self leave or owner/admin remove" ON public.room_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.room_role(auth.uid(), room_id) IN ('owner','admin')
  );
CREATE POLICY "owner updates role" ON public.room_members FOR UPDATE TO authenticated
  USING (public.room_role(auth.uid(), room_id) = 'owner')
  WITH CHECK (public.room_role(auth.uid(), room_id) = 'owner');

CREATE POLICY "members read messages" ON public.room_messages FOR SELECT TO authenticated
  USING (public.is_room_member(auth.uid(), room_id));
CREATE POLICY "members send messages" ON public.room_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_room_member(auth.uid(), room_id));
CREATE POLICY "sender or mods delete messages" ON public.room_messages FOR DELETE TO authenticated
  USING (
    sender_id = auth.uid()
    OR public.room_role(auth.uid(), room_id) IN ('owner','admin')
  );

CREATE POLICY "members read reactions" ON public.room_message_reactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.room_messages m WHERE m.id = message_id AND public.is_room_member(auth.uid(), m.room_id)));
CREATE POLICY "members add reaction" ON public.room_message_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.room_messages m WHERE m.id = message_id AND public.is_room_member(auth.uid(), m.room_id)));
CREATE POLICY "remove own reaction" ON public.room_message_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_message_reactions;
