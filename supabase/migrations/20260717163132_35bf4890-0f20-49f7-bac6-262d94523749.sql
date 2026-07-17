
-- Case-insensitive unique username
DROP INDEX IF EXISTS public.profiles_username_lower_key;
CREATE UNIQUE INDEX profiles_username_lower_key ON public.profiles (lower(username)) WHERE username IS NOT NULL;

-- Lookup email by username (for username login)
CREATE OR REPLACE FUNCTION public.get_email_for_username(_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE _email text;
BEGIN
  IF _username IS NULL OR length(trim(_username)) = 0 THEN RETURN NULL; END IF;
  SELECT u.email INTO _email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(p.username) = lower(trim(_username))
  LIMIT 1;
  RETURN _email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_for_username(text) TO anon, authenticated;

-- Check whether a username is available (case-insensitive)
CREATE OR REPLACE FUNCTION public.is_username_available(_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF _username IS NULL OR length(trim(_username)) < 3 THEN RETURN false; END IF;
  IF trim(_username) !~ '^[a-zA-Z0-9_]+$' THEN RETURN false; END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(username) = lower(trim(_username))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;

-- Claim/change username for current user (with atomic uniqueness)
CREATE OR REPLACE FUNCTION public.set_my_username(_username text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _clean text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF _username IS NULL THEN RAISE EXCEPTION 'Username required'; END IF;
  _clean := trim(_username);
  IF length(_clean) < 3 OR length(_clean) > 32 THEN
    RAISE EXCEPTION 'Username must be 3-32 characters';
  END IF;
  IF _clean !~ '^[a-zA-Z0-9_]+$' THEN
    RAISE EXCEPTION 'Username may only contain letters, numbers, and underscores';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(_clean) AND id <> _uid) THEN
    RAISE EXCEPTION 'Username already taken';
  END IF;
  UPDATE public.profiles SET username = _clean, updated_at = now() WHERE id = _uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_my_username(text) TO authenticated;

-- Update handle_new_user to seed username from metadata when possible
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _wanted text;
BEGIN
  _wanted := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'username', '')), '');
  -- Only seed username when it's clean and free
  IF _wanted IS NOT NULL
     AND _wanted ~ '^[a-zA-Z0-9_]{3,32}$'
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(_wanted))
  THEN
    INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (
      NEW.id,
      _wanted,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', _wanted),
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
    );
  ELSE
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
    );
  END IF;
  RETURN NEW;
END;
$$;
