
CREATE POLICY "room-media authenticated read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'room-media');
CREATE POLICY "room-media upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'room-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "room-media update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'room-media' AND owner = auth.uid());
CREATE POLICY "room-media delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'room-media' AND owner = auth.uid());
