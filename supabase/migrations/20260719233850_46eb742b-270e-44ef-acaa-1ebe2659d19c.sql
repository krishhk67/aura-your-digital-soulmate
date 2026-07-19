
CREATE OR REPLACE FUNCTION public.leave_anonymous_space(_space_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _left_rows int := 0;
  _remaining int;
  _group_chat uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;

  UPDATE public.anonymous_participants
    SET left_at = now()
    WHERE space_id = _space_id AND user_id = _uid AND left_at IS NULL;
  GET DIAGNOSTICS _left_rows = ROW_COUNT;

  -- If this caller was never an active participant, do nothing.
  -- Prevents race conditions (StrictMode double-mount, quick tap-and-close)
  -- from destroying a space the user hadn't actually joined.
  IF _left_rows = 0 THEN
    RETURN;
  END IF;

  SELECT count(*) INTO _remaining
    FROM public.anonymous_participants
    WHERE space_id = _space_id AND left_at IS NULL;

  IF _remaining = 0 THEN
    SELECT group_chat_id INTO _group_chat
      FROM public.anonymous_spaces WHERE id = _space_id;

    DELETE FROM public.anonymous_spaces WHERE id = _space_id;

    IF _group_chat IS NOT NULL THEN
      INSERT INTO public.messages(chat_id, sender_id, content, message_type, metadata)
      VALUES (
        _group_chat, _uid,
        'Anonymous Space ended. All participants left. This space has been permanently destroyed.',
        'anonymous_space_ended',
        jsonb_build_object('space_id', _space_id)
      );
    END IF;
  END IF;
END $function$;
