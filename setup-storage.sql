-- SUPABASE STORAGE KURULUMU
-- Dosya yükleme için bucket ve politikalar

-- 1. Storage bucket oluştur (Bu kısım manuel yapılacak)
-- Supabase Dashboard > Storage > "New bucket" 
-- Bucket name: "technician-files"
-- Public bucket: false (güvenlik için)

-- 2. Storage politikaları
-- Kullanıcılar kendi dosyalarını yükleyebilir
INSERT INTO storage.buckets (id, name, public)
VALUES ('technician-files', 'technician-files', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Dosya yükleme politikası
CREATE POLICY "Users can upload own files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'technician-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Dosya görüntüleme politikası
CREATE POLICY "Users can view own files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'technician-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Admin tüm dosyaları görebilir
CREATE POLICY "Admin can view all files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'technician-files' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 6. Dosya silme politikası
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'technician-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 7. Admin dosya silme
CREATE POLICY "Admin can delete all files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'technician-files' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 8. Kontrol
SELECT 'Storage politikaları hazır!' as status;
