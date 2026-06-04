
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS description text;

-- Tighten update policy: only owner or admin role can update group metadata
DROP POLICY IF EXISTS "Members can update chat" ON public.chats;
CREATE POLICY "Owners and admins can update chat"
ON public.chats FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE chat_id = chats.id AND user_id = auth.uid() AND role IN ('owner','admin')
  )
);

-- Allow owners/admins to remove members
DROP POLICY IF EXISTS "Owners and admins can remove members" ON public.chat_members;
CREATE POLICY "Owners and admins can remove members"
ON public.chat_members FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_members.chat_id AND c.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.chat_members cm
    WHERE cm.chat_id = chat_members.chat_id AND cm.user_id = auth.uid() AND cm.role IN ('owner','admin')
  )
);
