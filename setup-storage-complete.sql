-- ALP SISTEM - STORAGE BUCKET VE POLİTİKALAR (TEK SEFERDE)
-- Bu script bucket'ı ve tüm politikaları tek seferde oluşturur

-- 1. BUCKET OLUŞTUR
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('technician-files', 'technician-files', false, 52428800, null)
ON CONFLICT (id) DO NOTHING;

-- 2. ESKİ POLİTİKALARI TEMİZLE (varsa)
DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Admin can view all files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete all files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update files" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload files anywhere" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete any file" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update any file" ON storage.objects;

-- 3. YENİ POLİTİKALAR (PROFILES TABLOSUNA BAĞIMLI)
-- Teknisyenler kendi klasörlerine dosya yükleyebilir
CREATE POLICY "Technicians can upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'technician-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'technician'
    )
);

-- Teknisyenler kendi dosyalarını görebilir
CREATE POLICY "Technicians can view own files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'technician-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'technician'
    )
);

-- Teknisyenler kendi dosyalarını silebilir
CREATE POLICY "Technicians can delete own files" ON storage.objects
FOR DELETE USING (
    bucket_id = 'technician-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'technician'
    )
);

-- Admin tüm dosyaları görebilir
CREATE POLICY "Admins can view all files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'technician-files' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Admin dosya yükleyebilir
CREATE POLICY "Admins can upload files anywhere" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'technician-files' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Admin dosya silebilir
CREATE POLICY "Admins can delete any file" ON storage.objects
FOR DELETE USING (
    bucket_id = 'technician-files' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Admin dosya güncelleyebilir
CREATE POLICY "Admins can update any file" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'technician-files' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 4. KONTROL
SELECT 
    'Storage bucket ve politikalar oluşturuldu!' as status,
    'Bucket: technician-files' as bucket,
    '7 adet politika eklendi' as policies;

-- Bucket kontrolü
SELECT id, name, public FROM storage.buckets WHERE name = 'technician-files';
