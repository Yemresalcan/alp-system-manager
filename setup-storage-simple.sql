-- BASIT STORAGE KURULUMU (GEÇICI)
-- Önce temel storage kurulumu, sonra gelişmiş politikalar

-- 1. Bucket oluştur (manuel zaten yaptın)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('technician-files', 'technician-files', false, 52428800, null)
ON CONFLICT (id) DO NOTHING;

-- 2. Temel politikalar (profiles tablosu olmadan)
-- Herkes kendi klasörüne dosya yükleyebilir
CREATE POLICY "Users can upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'technician-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Herkes kendi dosyalarını görebilir
CREATE POLICY "Users can view own files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'technician-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Herkes kendi dosyalarını silebilir
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (
    bucket_id = 'technician-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

SELECT 'Temel Storage kurulumu tamamlandı!' as status;
