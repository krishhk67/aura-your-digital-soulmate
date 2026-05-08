
-- Fix: Allow chat creator to add initial members (the old policy required being a member already)
DROP POLICY IF EXISTS "Chat creator can add members" ON public.chat_members;
CREATE POLICY "Users can add members to their chats" ON public.chat_members
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Either you are the chat creator
    EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id AND created_by = auth.uid())
    OR
    -- Or you are already a member (for adding others later)
    is_chat_member(auth.uid(), chat_id)
  );

-- Add last_read_at for unread counts
ALTER TABLE public.chat_members ADD COLUMN IF NOT EXISTS last_read_at timestamptz DEFAULT now();

-- Allow members to update their own membership (e.g., last_read_at)
CREATE POLICY "Members can update own membership" ON public.chat_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Allow members to update chat details (name, avatar)
CREATE POLICY "Members can update chat" ON public.chats
  FOR UPDATE TO authenticated
  USING (is_chat_member(auth.uid(), id));
