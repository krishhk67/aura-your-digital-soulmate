
ALTER TABLE public.chat_members
  ADD COLUMN IF NOT EXISTS last_delivered_at timestamptz;

UPDATE public.chat_members
  SET last_delivered_at = COALESCE(last_delivered_at, last_read_at, joined_at);

CREATE OR REPLACE FUNCTION public.mark_chat_delivered(_chat_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  UPDATE public.chat_members
    SET last_delivered_at = now()
    WHERE chat_id = _chat_id AND user_id = _uid
      AND (last_delivered_at IS NULL OR last_delivered_at < now());
END $$;

CREATE OR REPLACE FUNCTION public.mark_chat_read(_chat_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  UPDATE public.chat_members
    SET last_delivered_at = now(),
        last_read_at = now()
    WHERE chat_id = _chat_id AND user_id = _uid;
END $$;

CREATE OR REPLACE FUNCTION public.get_message_receipts(_message_id uuid)
RETURNS TABLE(user_id uuid, delivered_at timestamptz, read_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _chat uuid;
  _sender uuid;
  _created timestamptz;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT m.chat_id, m.sender_id, m.created_at
    INTO _chat, _sender, _created
    FROM public.messages m WHERE m.id = _message_id;
  IF _chat IS NULL THEN RETURN; END IF;
  IF _sender <> _uid THEN RETURN; END IF;
  IF NOT public.is_chat_member(_uid, _chat) THEN RETURN; END IF;

  RETURN QUERY
    SELECT cm.user_id,
      CASE WHEN cm.last_delivered_at IS NOT NULL AND cm.last_delivered_at >= _created THEN cm.last_delivered_at ELSE NULL END,
      CASE WHEN cm.last_read_at IS NOT NULL AND cm.last_read_at >= _created THEN cm.last_read_at ELSE NULL END
    FROM public.chat_members cm
    WHERE cm.chat_id = _chat AND cm.user_id <> _sender;
END $$;
