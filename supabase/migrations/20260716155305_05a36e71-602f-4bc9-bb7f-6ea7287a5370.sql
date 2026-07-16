-- =========================================
-- MUSIC PRESENCE + LISTEN TOGETHER SYSTEM
-- =========================================

-- 1. music_connections: OAuth tokens per provider per user
CREATE TABLE public.music_connections (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  display_name text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_connections TO authenticated;
GRANT ALL ON public.music_connections TO service_role;
ALTER TABLE public.music_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own connection r" ON public.music_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own connection w" ON public.music_connections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER music_connections_touch BEFORE UPDATE ON public.music_connections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. music_settings: privacy toggles
CREATE TABLE public.music_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_provider text NOT NULL DEFAULT 'spotify',
  show_current_song boolean NOT NULL DEFAULT true,
  show_album_art boolean NOT NULL DEFAULT true,
  allow_friends_see boolean NOT NULL DEFAULT true,
  allow_listen_together boolean NOT NULL DEFAULT true,
  auto_share boolean NOT NULL DEFAULT false,
  hide_activity boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_settings TO authenticated;
GRANT ALL ON public.music_settings TO service_role;
ALTER TABLE public.music_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings r" ON public.music_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own settings w" ON public.music_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER music_settings_touch BEFORE UPDATE ON public.music_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Privacy helper: can viewer see this user's music?
CREATE OR REPLACE FUNCTION public.can_view_music(_viewer uuid, _author uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hide boolean;
  _allow_friends boolean;
  _show boolean;
BEGIN
  IF _viewer = _author THEN RETURN true; END IF;
  IF public.is_blocked(_author, _viewer) THEN RETURN false; END IF;
  SELECT hide_activity, allow_friends_see, show_current_song
    INTO _hide, _allow_friends, _show
  FROM public.music_settings WHERE user_id = _author;
  IF _hide THEN RETURN false; END IF;
  IF COALESCE(_show, true) = false THEN RETURN false; END IF;
  IF COALESCE(_allow_friends, true) = false THEN RETURN false; END IF;
  -- Must share a DM to see music
  RETURN public.users_share_dm(_viewer, _author);
END;
$$;

-- 4. music_presence: live now-playing
CREATE TABLE public.music_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  track_id text NOT NULL,
  track_name text NOT NULL,
  artist text NOT NULL,
  album text,
  album_art_url text,
  external_url text,
  uri text,
  is_playing boolean NOT NULL DEFAULT false,
  progress_ms integer,
  duration_ms integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_presence TO authenticated;
GRANT ALL ON public.music_presence TO service_role;
ALTER TABLE public.music_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presence own w" ON public.music_presence FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "presence read allowed" ON public.music_presence FOR SELECT TO authenticated USING (public.can_view_music(auth.uid(), user_id));
CREATE TRIGGER music_presence_touch BEFORE UPDATE ON public.music_presence FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_presence;

-- 5. music_recent_tracks: last N plays
CREATE TABLE public.music_recent_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  track_id text NOT NULL,
  track_name text NOT NULL,
  artist text NOT NULL,
  album text,
  album_art_url text,
  external_url text,
  played_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX music_recent_user_time ON public.music_recent_tracks(user_id, played_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_recent_tracks TO authenticated;
GRANT ALL ON public.music_recent_tracks TO service_role;
ALTER TABLE public.music_recent_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recent own w" ON public.music_recent_tracks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recent read allowed" ON public.music_recent_tracks FOR SELECT TO authenticated USING (public.can_view_music(auth.uid(), user_id));

-- 6. listen_together_sessions
CREATE TABLE public.listen_together_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id uuid REFERENCES public.chats(id) ON DELETE SET NULL,
  provider text NOT NULL,
  track_id text NOT NULL,
  track_name text NOT NULL,
  artist text NOT NULL,
  album_art_url text,
  external_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','ended','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lt_host ON public.listen_together_sessions(host_id, created_at DESC);
CREATE INDEX lt_guest ON public.listen_together_sessions(guest_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listen_together_sessions TO authenticated;
GRANT ALL ON public.listen_together_sessions TO service_role;
ALTER TABLE public.listen_together_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lt participants r" ON public.listen_together_sessions FOR SELECT TO authenticated USING (auth.uid() = host_id OR auth.uid() = guest_id);
CREATE POLICY "lt host insert" ON public.listen_together_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "lt participants update" ON public.listen_together_sessions FOR UPDATE TO authenticated USING (auth.uid() = host_id OR auth.uid() = guest_id) WITH CHECK (auth.uid() = host_id OR auth.uid() = guest_id);
CREATE TRIGGER lt_touch BEFORE UPDATE ON public.listen_together_sessions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER PUBLICATION supabase_realtime ADD TABLE public.listen_together_sessions;

-- 7. rooms: currently_playing_track jsonb
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS current_track jsonb;

-- 8. messages.metadata for rich cards (music_share / listen_together_invite / etc.)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS metadata jsonb;