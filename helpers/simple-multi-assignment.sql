-- BASIT ÇOKLU ATAMA SİSTEMİ
-- Bu dosyayı Supabase SQL Editor'da çalıştır

-- 1. Mevcut technician_inventory tablosunda unique constraint varsa kaldır
-- (Eğer tabloda unique constraint yoksa hata vermez)
ALTER TABLE public.technician_inventory DROP CONSTRAINT IF EXISTS technician_inventory_technician_id_inventory_item_id_key;

-- 2. Quantity kolonu yoksa ekle (eğer varsa hata vermez)
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE public.technician_inventory ADD COLUMN quantity INTEGER DEFAULT 1;
    EXCEPTION
        WHEN duplicate_column THEN
            -- Kolon zaten var, güncelle
            UPDATE public.technician_inventory SET quantity = 1 WHERE quantity IS NULL;
    END;
END $$;

-- 3. Quantity kolonunu NOT NULL yap
ALTER TABLE public.technician_inventory ALTER COLUMN quantity SET NOT NULL;
ALTER TABLE public.technician_inventory ALTER COLUMN quantity SET DEFAULT 1;

-- 4. Kontrol et
SELECT 'Çoklu atama sistemi aktif!' as status;
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'technician_inventory' 
AND table_schema = 'public'
ORDER BY ordinal_position;
