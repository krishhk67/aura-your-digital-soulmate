ALTER TABLE public.chat_members
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS chat_members_user_favorite_idx ON public.chat_members(user_id) WHERE is_favorite;
CREATE INDEX IF NOT EXISTS chat_members_user_archived_idx ON public.chat_members(user_id) WHERE is_archived;