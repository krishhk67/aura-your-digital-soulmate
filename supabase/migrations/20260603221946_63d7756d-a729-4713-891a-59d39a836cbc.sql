
-- Columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ghost_mode boolean NOT NULL DEFAULT false;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS disappear_seconds integer;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.chat_members ADD COLUMN IF NOT EXISTS theme text;

CREATE INDEX IF NOT EXISTS messages_expires_at_idx ON public.messages (expires_at) WHERE expires_at IS NOT NULL;

-- Trigger to set expires_at based on chat's disappear_seconds
CREATE OR REPLACE FUNCTION public.set_message_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seconds integer;
BEGIN
  IF NEW.expires_at IS NULL THEN
    SELECT disappear_seconds INTO _seconds FROM public.chats WHERE id = NEW.chat_id;
    IF _seconds IS NOT NULL AND _seconds > 0 THEN
      NEW.expires_at := now() + make_interval(secs => _seconds);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_message_expiry_trg ON public.messages;
CREATE TRIGGER set_message_expiry_trg
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.set_message_expiry();

-- Cleanup function — service role bypasses RLS
CREATE OR REPLACE FUNCTION public.cleanup_expired_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.messages WHERE expires_at IS NOT NULL AND expires_at <= now();
END;
$$;

-- Ensure DELETEs are in the realtime publication for messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Schedule cleanup every minute via pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'aura-cleanup-expired-messages') THEN
    PERFORM cron.unschedule('aura-cleanup-expired-messages');
  END IF;
END $$;

SELECT cron.schedule(
  'aura-cleanup-expired-messages',
  '* * * * *',
  $$SELECT public.cleanup_expired_messages();$$
);

-- Allow members to delete messages in their chats (needed for client-side dissolves and disappear on read; sender can always delete own; admin via service role)
DROP POLICY IF EXISTS "Sender can delete own messages" ON public.messages;
CREATE POLICY "Sender can delete own messages" ON public.messages
  FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);
