
CREATE OR REPLACE FUNCTION public.join_anonymous_space(_space_id uuid, _custom_alias text DEFAULT NULL::text)
 RETURNS TABLE(participant_id uuid, alias text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _clean text; _try text; _cap int; _current int;
  _existing_id uuid; _existing_alias text; _existing_left timestamptz;
  _attempt int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF NOT public.can_view_anon_space(_uid, _space_id) THEN
    RAISE EXCEPTION 'You are not a member of this group';
  END IF;

  -- Space must still exist and not be destroyed
  IF NOT EXISTS (
    SELECT 1 FROM public.anonymous_spaces s
    WHERE s.id = _space_id AND s.destroyed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'This Anonymous Space has ended';
  END IF;

  -- Idempotent rejoin: if this user already has ANY participant row for this
  -- space (active or previously left), restore it and reuse their identity.
  SELECT ap.id, ap.alias, ap.left_at
    INTO _existing_id, _existing_alias, _existing_left
    FROM public.anonymous_participants ap
    WHERE ap.space_id = _space_id AND ap.user_id = _uid
    LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    IF _existing_left IS NOT NULL THEN
      UPDATE public.anonymous_participants
        SET left_at = NULL, joined_at = joined_at
        WHERE id = _existing_id;
    END IF;
    participant_id := _existing_id;
    alias := _existing_alias;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Enforce capacity only for brand-new joiners
  SELECT s.max_participants INTO _cap
    FROM public.anonymous_spaces s
    WHERE s.id = _space_id AND s.destroyed_at IS NULL;
  IF _cap IS NOT NULL THEN
    SELECT count(*) INTO _current
      FROM public.anonymous_participants ap
      WHERE ap.space_id = _space_id AND ap.left_at IS NULL;
    IF _current >= _cap THEN RAISE EXCEPTION 'Space is full'; END IF;
  END IF;

  IF _custom_alias IS NOT NULL AND length(trim(_custom_alias)) > 0 THEN
    _clean := trim(_custom_alias);
    IF _clean !~ '^[A-Za-z][A-Za-z0-9_]{1,15}$' THEN
      RAISE EXCEPTION 'Alias must be 2-16 characters, letters/numbers/underscore, starting with a letter';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.anonymous_participants ap
      WHERE ap.space_id = _space_id AND lower(ap.alias) = lower(_clean) AND ap.left_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Alias already taken';
    END IF;
    _try := _clean;
  ELSE
    LOOP
      _try := public._random_alias();
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.anonymous_participants ap
        WHERE ap.space_id = _space_id AND lower(ap.alias) = lower(_try) AND ap.left_at IS NULL
      );
      _attempt := _attempt + 1;
      IF _attempt > 20 THEN _try := _try || floor(random()*900+100)::text; EXIT; END IF;
    END LOOP;
  END IF;

  INSERT INTO public.anonymous_participants(space_id, user_id, alias)
  VALUES (_space_id, _uid, _try)
  RETURNING id INTO _existing_id;

  participant_id := _existing_id;
  alias := _try;
  RETURN NEXT;
  RETURN;
END $function$;
