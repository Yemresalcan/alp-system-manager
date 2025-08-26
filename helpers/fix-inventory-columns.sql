-- MEVCUT INVENTORY_ITEMS TABLOSUNA EKSİK KOLONLARI EKLE
-- Bu dosyayı Supabase SQL Editor'da çalıştır

-- 1. Eksik kolonları ekle (eğer yoksa)
DO $$ 
BEGIN
    -- total_quantity kolonu
    BEGIN
        ALTER TABLE public.inventory_items ADD COLUMN total_quantity INTEGER DEFAULT 1;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    -- available_quantity kolonu
    BEGIN
        ALTER TABLE public.inventory_items ADD COLUMN available_quantity INTEGER DEFAULT 1;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    -- assigned_quantity kolonu
    BEGIN
        ALTER TABLE public.inventory_items ADD COLUMN assigned_quantity INTEGER DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    -- unit_type kolonu
    BEGIN
        ALTER TABLE public.inventory_items ADD COLUMN unit_type TEXT DEFAULT 'adet';
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    -- is_consumable kolonu
    BEGIN
        ALTER TABLE public.inventory_items ADD COLUMN is_consumable BOOLEAN DEFAULT false;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    -- min_stock_level kolonu
    BEGIN
        ALTER TABLE public.inventory_items ADD COLUMN min_stock_level INTEGER DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- 2. NOT NULL ve DEFAULT değerleri ayarla
ALTER TABLE public.inventory_items ALTER COLUMN total_quantity SET NOT NULL;
ALTER TABLE public.inventory_items ALTER COLUMN total_quantity SET DEFAULT 1;

ALTER TABLE public.inventory_items ALTER COLUMN available_quantity SET NOT NULL;
ALTER TABLE public.inventory_items ALTER COLUMN available_quantity SET DEFAULT 1;

ALTER TABLE public.inventory_items ALTER COLUMN assigned_quantity SET NOT NULL;
ALTER TABLE public.inventory_items ALTER COLUMN assigned_quantity SET DEFAULT 0;

ALTER TABLE public.inventory_items ALTER COLUMN unit_type SET DEFAULT 'adet';
ALTER TABLE public.inventory_items ALTER COLUMN is_consumable SET DEFAULT false;
ALTER TABLE public.inventory_items ALTER COLUMN min_stock_level SET DEFAULT 0;

-- 3. Mevcut kayıtları güncelle (eğer NULL ise)
UPDATE public.inventory_items 
SET 
    total_quantity = COALESCE(total_quantity, 1),
    available_quantity = COALESCE(available_quantity, 1),
    assigned_quantity = COALESCE(assigned_quantity, 0),
    unit_type = COALESCE(unit_type, 'adet'),
    is_consumable = COALESCE(is_consumable, false),
    min_stock_level = COALESCE(min_stock_level, 0)
WHERE 
    total_quantity IS NULL OR 
    available_quantity IS NULL OR 
    assigned_quantity IS NULL OR 
    unit_type IS NULL OR 
    is_consumable IS NULL OR 
    min_stock_level IS NULL;

-- 4. Status kolonuna 'partial_assigned' değeri ekle (eğer yoksa)
DO $$
BEGIN
    -- Check constraint'i kaldır
    ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_status_check;
    
    -- Yeni check constraint ekle
    ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_items_status_check 
    CHECK (status IN ('available', 'assigned', 'maintenance', 'lost', 'retired', 'partial_assigned'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 5. Kontrol et
SELECT 'inventory_items tablosu güncellendi!' as status;
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'inventory_items' 
AND table_schema = 'public'
AND column_name IN ('total_quantity', 'available_quantity', 'assigned_quantity', 'unit_type', 'is_consumable', 'min_stock_level')
ORDER BY ordinal_position;
