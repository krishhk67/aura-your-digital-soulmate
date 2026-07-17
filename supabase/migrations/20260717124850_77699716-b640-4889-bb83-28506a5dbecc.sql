
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Per-user hidden flag on chat membership
ALTER TABLE public.chat_members
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_chat_members_user_hidden
  ON public.chat_members(user_id, is_hidden);

-- Hidden Space settings
CREATE TABLE IF NOT EXISTS public.hidden_space_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword_hash text NOT NULL,
  pin_hash text,
  recovery_email text,
  auto_lock_seconds integer NOT NULL DEFAULT 60,
  notification_mode text NOT NULL DEFAULT 'generic', -- 'full' | 'generic' | 'off'
  wallpaper_url text,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hidden_space_settings TO authenticated;
GRANT ALL ON public.hidden_space_settings TO service_role;

ALTER TABLE public.hidden_space_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own hidden space settings"
  ON public.hidden_space_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_hidden_space_settings()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_touch_hidden_space_settings ON public.hidden_space_settings;
CREATE TRIGGER trg_touch_hidden_space_settings
  BEFORE UPDATE ON public.hidden_space_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_hidden_space_settings();

-- Setup / update keyword
CREATE OR REPLACE FUNCTION public.setup_hidden_space(
  _keyword text,
  _recovery_email text DEFAULT NULL,
  _pin text DEFAULT NULL,
  _auto_lock_seconds integer DEFAULT 60,
  _notification_mode text DEFAULT 'generic'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF _keyword IS NULL OR length(trim(_keyword)) < 3 THEN
    RAISE EXCEPTION 'Keyword must be at least 3 characters';
  END IF;
  IF _notification_mode NOT IN ('full','generic','off') THEN
    RAISE EXCEPTION 'Invalid notification mode';
  END IF;

  INSERT INTO public.hidden_space_settings(user_id, keyword_hash, pin_hash, recovery_email, auto_lock_seconds, notification_mode)
  VALUES (
    _uid,
    crypt(lower(trim(_keyword)), gen_salt('bf', 10)),
    CASE WHEN _pin IS NOT NULL AND length(_pin) > 0 THEN crypt(_pin, gen_salt('bf', 10)) ELSE NULL END,
    _recovery_email,
    COALESCE(_auto_lock_seconds, 60),
    _notification_mode
  )
  ON CONFLICT (user_id) DO UPDATE SET
    keyword_hash = EXCLUDED.keyword_hash,
    pin_hash = EXCLUDED.pin_hash,
    recovery_email = EXCLUDED.recovery_email,
    auto_lock_seconds = EXCLUDED.auto_lock_seconds,
    notification_mode = EXCLUDED.notification_mode,
    updated_at = now();
END $$;

-- Verify keyword (returns true/false only, never leaks)
CREATE OR REPLACE FUNCTION public.verify_hidden_keyword(_keyword text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, extensions
AS $$
DECLARE _uid uuid := auth.uid(); _hash text;
BEGIN
  IF _uid IS NULL OR _keyword IS NULL THEN RETURN false; END IF;
  SELECT keyword_hash INTO _hash FROM public.hidden_space_settings WHERE user_id = _uid;
  IF _hash IS NULL THEN RETURN false; END IF;
  RETURN _hash = crypt(lower(trim(_keyword)), _hash);
END $$;

CREATE OR REPLACE FUNCTION public.verify_hidden_pin(_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, extensions
AS $$
DECLARE _uid uuid := auth.uid(); _hash text;
BEGIN
  IF _uid IS NULL OR _pin IS NULL THEN RETURN false; END IF;
  SELECT pin_hash INTO _hash FROM public.hidden_space_settings WHERE user_id = _uid;
  IF _hash IS NULL THEN RETURN true; END IF; -- no pin set
  RETURN _hash = crypt(_pin, _hash);
END $$;

-- Move chat to / from Hidden Space (per-user)
CREATE OR REPLACE FUNCTION public.set_chat_hidden(_chat_id uuid, _hidden boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  UPDATE public.chat_members
    SET is_hidden = _hidden
    WHERE chat_id = _chat_id AND user_id = _uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not a member of this chat'; END IF;
END $$;

-- Update wallpaper / theme
CREATE OR REPLACE FUNCTION public.update_hidden_space_appearance(
  _wallpaper_url text DEFAULT NULL,
  _theme jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  UPDATE public.hidden_space_settings
    SET wallpaper_url = COALESCE(_wallpaper_url, wallpaper_url),
        theme = COALESCE(_theme, theme),
        updated_at = now()
    WHERE user_id = _uid;
END $$;
