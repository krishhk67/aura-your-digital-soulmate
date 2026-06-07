
-- 1. Extend stories table
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image';
ALTER TABLE public.stories ADD CONSTRAINT stories_media_type_chk CHECK (media_type IN ('image','video'));

-- 2. story_views
CREATE TABLE IF NOT EXISTS public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);
GRANT SELECT, INSERT, DELETE ON public.story_views TO authenticated;
GRANT ALL ON public.story_views TO service_role;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- 3. story_reactions
CREATE TABLE IF NOT EXISTS public.story_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id, reaction)
);
GRANT SELECT, INSERT, DELETE ON public.story_reactions TO authenticated;
GRANT ALL ON public.story_reactions TO service_role;
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

-- 4. user_settings privacy
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS stories_privacy text NOT NULL DEFAULT 'everyone';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS story_replies_privacy text NOT NULL DEFAULT 'everyone';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS story_hidden_from uuid[] NOT NULL DEFAULT '{}';

-- 5. helper: do two users share a DM?
CREATE OR REPLACE FUNCTION public.users_share_dm(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chats c
    JOIN public.chat_members m1 ON m1.chat_id = c.id AND m1.user_id = _a
    JOIN public.chat_members m2 ON m2.chat_id = c.id AND m2.user_id = _b
    WHERE COALESCE(c.is_group,false)=false
  );
$$;

-- 6. helper: can viewer see author's stories?
CREATE OR REPLACE FUNCTION public.can_view_stories(_viewer uuid, _author uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _privacy text;
  _hidden uuid[];
BEGIN
  IF _viewer = _author THEN RETURN true; END IF;
  SELECT stories_privacy, story_hidden_from INTO _privacy, _hidden
  FROM public.user_settings WHERE user_id = _author;
  _privacy := COALESCE(_privacy,'everyone');
  IF _viewer = ANY(COALESCE(_hidden,'{}'::uuid[])) THEN RETURN false; END IF;
  IF _privacy = 'nobody' THEN RETURN false; END IF;
  IF _privacy = 'everyone' THEN RETURN true; END IF;
  IF _privacy = 'contacts' THEN RETURN public.users_share_dm(_viewer, _author); END IF;
  RETURN false;
END $$;

-- 7. Replace stories SELECT policy with privacy-aware version
DROP POLICY IF EXISTS "Authenticated users can view stories" ON public.stories;
CREATE POLICY "View allowed stories" ON public.stories FOR SELECT TO authenticated
  USING (public.can_view_stories(auth.uid(), user_id));

-- 8. story_views policies
CREATE POLICY "Owner sees views, viewer sees own" ON public.story_views FOR SELECT TO authenticated
  USING (
    viewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Authenticated can record view" ON public.story_views FOR INSERT TO authenticated
  WITH CHECK (
    viewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.stories s WHERE s.id = story_id
        AND public.can_view_stories(auth.uid(), s.user_id)
    )
  );

-- 9. story_reactions policies
CREATE POLICY "Owner & reactor see reactions" ON public.story_reactions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Authenticated can react" ON public.story_reactions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.stories s WHERE s.id = story_id
        AND public.can_view_stories(auth.uid(), s.user_id)
    )
  );
CREATE POLICY "Reactor can remove own" ON public.story_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 10. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_reactions;
