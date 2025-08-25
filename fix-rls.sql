-- RLS POLİTİKA HATASI DÜZELTMESİ
-- Sonsuz döngü problemini çözelim

-- 1. Önce problemli politikaları kaldır
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- 2. Basit ve güvenli politikalar oluştur
-- Herkes kendi profilini görebilir (auth.uid() kontrolü yeterli)
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Herkes kendi profilini güncelleyebilir
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admin kontrolü için auth.jwt() kullan (sonsuz döngü olmaz)
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id OR 
        (auth.jwt() ->> 'email')::text = 'admin@alpsistem.com'
    );

-- Admin profil oluşturabilir 
CREATE POLICY "Admins can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        (auth.jwt() ->> 'email')::text = 'admin@alpsistem.com'
    );

-- Admin profil silebilir
CREATE POLICY "Admins can delete profiles" ON public.profiles
    FOR DELETE USING (
        (auth.jwt() ->> 'email')::text = 'admin@alpsistem.com'
    );

-- 3. Storage politikalarını da düzelt
DROP POLICY IF EXISTS "Technicians can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload files anywhere" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete any file" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update any file" ON storage.objects;

-- Basit storage politikaları (önce auth.uid() kontrolü)
CREATE POLICY "Users can upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'technician-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'technician-files' 
    AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        (auth.jwt() ->> 'email')::text = 'admin@alpsistem.com'
    )
);

CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (
    bucket_id = 'technician-files' 
    AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        (auth.jwt() ->> 'email')::text = 'admin@alpsistem.com'
    )
);

-- Kontrol
SELECT 'RLS politikaları düzeltildi!' as status;
