CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.handle_new_room()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := encode(extensions.gen_random_bytes(6),'hex');
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS rooms_handle_new ON public.rooms;
CREATE TRIGGER rooms_handle_new BEFORE INSERT ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.handle_new_room();

DROP TRIGGER IF EXISTS rooms_add_owner ON public.rooms;
CREATE TRIGGER rooms_add_owner AFTER INSERT ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.add_owner_membership();