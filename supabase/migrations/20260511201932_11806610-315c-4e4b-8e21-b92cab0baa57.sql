-- RLS policies for chat-media bucket so chat members can upload/read media
-- Files are stored under path: {chat_id}/{filename}

DROP POLICY IF EXISTS "Chat members can view chat media" ON storage.objects;
DROP POLICY IF EXISTS "Chat members can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Chat members can delete own chat media" ON storage.objects;

CREATE POLICY "Chat members can view chat media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-media'
  AND public.is_chat_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Chat members can upload chat media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND owner = auth.uid()
  AND public.is_chat_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Chat members can delete own chat media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-media' AND owner = auth.uid()
);