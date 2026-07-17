
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_configured boolean NOT NULL DEFAULT false;

-- Backfill: any existing user that signed up via email/password already has one
UPDATE public.profiles p
SET password_configured = true
FROM auth.users u
WHERE p.id = u.id
  AND (
    EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email')
    OR u.encrypted_password IS NOT NULL
  );

-- Secure setter: called from client after supabase.auth.updateUser({password}) succeeds
CREATE OR REPLACE FUNCTION public.mark_password_configured()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  UPDATE public.profiles SET password_configured = true, updated_at = now() WHERE id = _uid;
END;
$$;

-- Ensure newly created rows via handle_new_user reflect whether the signup already had a password
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _wanted text; _has_pw boolean;
BEGIN
  _wanted := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'username', '')), '');
  _has_pw := NEW.encrypted_password IS NOT NULL;

  IF _wanted IS NOT NULL
     AND _wanted ~ '^[a-zA-Z0-9_]{3,32}$'
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(_wanted))
  THEN
    INSERT INTO public.profiles (id, username, display_name, avatar_url, password_configured)
    VALUES (
      NEW.id,
      _wanted,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', _wanted),
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
      _has_pw
    );
  ELSE
    INSERT INTO public.profiles (id, display_name, avatar_url, password_configured)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
      _has_pw
    );
  END IF;
  RETURN NEW;
END;
$$;
