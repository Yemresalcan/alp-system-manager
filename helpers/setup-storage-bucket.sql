-- Storage bucket oluştur
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-photos',
  'task-photos',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
);

-- Storage policy oluştur - Herkes okuyabilir
CREATE POLICY "Public read access for task photos" ON storage.objects
FOR SELECT USING (bucket_id = 'task-photos');

-- Storage policy oluştur - Sadece auth kullanıcılar yükleyebilir
CREATE POLICY "Authenticated users can upload task photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'task-photos' 
  AND auth.role() = 'authenticated'
);

-- Storage policy oluştur - Sadece yükleyen silebilir
CREATE POLICY "Users can delete their own task photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'task-photos' 
  AND auth.uid() = owner
);
