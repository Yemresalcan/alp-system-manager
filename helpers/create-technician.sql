-- ALP SISTEM - TEKNİSYEN KULLANICISI OLUŞTURMA
-- Bu script ile test teknisyeni oluşturabiliriz

-- NOT: Bu kullanıcı önce Supabase Auth'da kayıt olmalı!
-- 1. Uygulamayı çalıştır
-- 2. Sign Up ile kayıt ol (teknisyen@alpsistem.com)
-- 3. Bu script'i çalıştırarak kullanıcıyı teknisyen yap

-- Önce auth.users tablosuna bakarak ID'yi al
-- Bu sorguyu çalıştırıp user ID'yi öğren:
-- SELECT id, email FROM auth.users WHERE email = 'teknisyen@alpsistem.com';

-- Teknisyen kullanıcısı ekleme/güncelleme
-- ID'yi gerçek değerle değiştir!

INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    phone,
    city,
    department,
    created_at,
    updated_at
) VALUES (
    'TEKNISYEN_USER_ID_BURAYA'::uuid,             -- Gerçek auth.users.id buraya yazılacak
    'teknisyen@alpsistem.com',                     -- Teknisyen email
    'Test Teknisyeni',                             -- Teknisyen adı
    'technician',                                  -- Rol: technician
    '+90 555 987 6543',                           -- Telefon (opsiyonel)
    'Ankara',                                     -- Şehir (opsiyonel)
    'Saha Ekibi',                                 -- Departman (opsiyonel)
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
) ON CONFLICT (id) DO UPDATE SET
    role = 'technician',
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    city = EXCLUDED.city,
    department = EXCLUDED.department,
    updated_at = timezone('utc'::text, now());

-- Kontrolü yap
SELECT 
    id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles 
WHERE role = 'technician'
ORDER BY created_at DESC;
