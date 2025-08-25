-- ALP SISTEM - İLK ADMİN KULLANICISI OLUŞTURMA
-- Bu script ile ilk admin kullanıcısını manuel olarak ekleyebiliriz

-- NOT: Bu kullanıcı önce Supabase Auth'da kayıt olmalı!
-- 1. Uygulamayı çalıştır
-- 2. Sign Up ile kayıt ol
-- 3. Bu script'i çalıştırarak kullanıcıyı admin yap

-- KULLANICI BİLGİLERİNİ DEĞİŞTİR:
-- Email ve diğer bilgileri gerçek değerlerle değiştir

-- Örnek admin kullanıcısı ekleme (auth tablosunda olmalı)
-- Bu sadece profiles tablosuna admin kaydı ekler

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
    'f4ce1dd3-77c5-4223-8d83-64f44430fab6'::uuid, -- Gerçek auth.users.id
    'admin@alpsistem.com',                         -- Admin email
    'Sistem Yöneticisi',                          -- Admin adı
    'admin',                                       -- Rol: admin
    '+90 555 123 4567',                           -- Telefon (opsiyonel)
    'İstanbul',                                   -- Şehir (opsiyonel)
    'BT Departmanı',                              -- Departman (opsiyonel)
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
) ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
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
WHERE role = 'admin';

-- Başarı mesajı
SELECT 'Admin kullanıcısı oluşturuldu/güncellendi!' as status;
