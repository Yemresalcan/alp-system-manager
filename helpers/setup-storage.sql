-- ALP SISTEM - SUPABASE STORAGE KURULUMU
-- Dosya yükleme için bucket ve güvenlik politikaları

-- ÖNEMLİ: Önce Dashboard'dan "technician-files" bucket'ını oluştur!
-- Storage > Create bucket > Name: technician-files, Public: false

-- 1. Storage bucket'ı program ile de oluşturabiliriz (opsiyonel)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('technician-files', 'technician-files', false, 52428800, null)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS (Row Level Security) politikalarını temizle (varsa)
DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Admin can view all files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete all files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update files" ON storage.objects;

-- 3. TEKNİSYEN DOSYA YÜKLEME POLİTİKASI
-- Teknisyenler sadece kendi klasörlerine dosya yükleyebilir
-- Klasör yapısı: /technician_id/dosya.pdf
CREATE POLICY "Technicians can upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'technician-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'technician'
    )
);

-- 4. TEKNİSYEN DOSYA GÖRÜNTÜLEME POLİTİKASI
-- Teknisyenler sadece kendi dosyalarını görebilir
CREATE POLICY "Technicians can view own files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'technician-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'technician'
    )
);

-- 5. TEKNİSYEN DOSYA SİLME POLİTİKASI
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

-- 6. ADMİN TÜM YETKİLER
-- Admin tüm dosyaları görebilir, yükleyebilir, silebilir
CREATE POLICY "Admins can view all files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'technician-files' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can upload files anywhere" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'technician-files' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can delete any file" ON storage.objects
FOR DELETE USING (
    bucket_id = 'technician-files' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can update any file" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'technician-files' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 7. KONTROL
SELECT 
    'Storage kurulumu tamamlandı!' as status,
    'Bucket: technician-files' as bucket_info,
    'Politikalar: Teknisyen/Admin ayrımı' as security_info;
