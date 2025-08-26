-- ENVANTER YÖNETİM SİSTEMİ - VERİTABANI GÜNCELLEMESİ
-- Bu dosyayı Supabase SQL Editor'da çalıştır

-- 1. MEVCUT TABLOLARI SIL (eğer varsa) - GÜVENLİ SIRA
DROP TABLE IF EXISTS public.inventory_maintenance CASCADE;
DROP TABLE IF EXISTS public.technician_inventory CASCADE;
DROP TABLE IF EXISTS public.inventory_categories CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;

-- 2. MEVCUT TETİKLEYİCİLERİ SIL (eğer varsa)
DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON public.inventory_items;
DROP TRIGGER IF EXISTS update_technician_inventory_updated_at ON public.technician_inventory;
DROP TRIGGER IF EXISTS update_inventory_maintenance_updated_at ON public.inventory_maintenance;
DROP TRIGGER IF EXISTS update_inventory_categories_updated_at ON public.inventory_categories;

-- 3. YENİ INVENTORY_ITEMS TABLOSU (Gelişmiş Envanter - Stok Destekli)
CREATE TABLE public.inventory_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('cable', 'safety', 'tool', 'device', 'vehicle', 'consumable', 'other')) DEFAULT 'other',
    brand TEXT,
    model TEXT,
    serial_number TEXT UNIQUE,
    purchase_date DATE,
    purchase_price DECIMAL(10,2),
    status TEXT NOT NULL CHECK (status IN ('available', 'assigned', 'maintenance', 'lost', 'retired', 'partial_assigned')) DEFAULT 'available',
    location TEXT,
    notes TEXT,
    total_quantity INTEGER NOT NULL DEFAULT 1, -- Toplam miktar
    available_quantity INTEGER NOT NULL DEFAULT 1, -- Müsait miktar
    assigned_quantity INTEGER NOT NULL DEFAULT 0, -- Atanmış miktar
    unit_type TEXT DEFAULT 'adet', -- birim türü (adet, metre, kg, vb.)
    is_consumable BOOLEAN DEFAULT false, -- Sarf malzeme mi?
    min_stock_level INTEGER DEFAULT 0, -- Minimum stok seviyesi
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_quantities CHECK (
        available_quantity >= 0 AND 
        assigned_quantity >= 0 AND 
        available_quantity + assigned_quantity <= total_quantity
    )
);

-- 4. TECHNICIAN_INVENTORY TABLOSU (Atama Sistemi - Çoklu Atama Destekli)
CREATE TABLE public.technician_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    technician_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1, -- Atanan miktar
    assigned_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    return_date TIMESTAMP WITH TIME ZONE,
    expected_return_date TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('assigned', 'returned', 'lost', 'partial_returned')) DEFAULT 'assigned',
    assigned_by UUID REFERENCES public.profiles(id) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    -- Aynı teknisyene aynı öğe birden fazla kez atanabilir (farklı tarih/miktar ile)
);

-- 5. INVENTORY_MAINTENANCE TABLOSU (Bakım Geçmişi)
CREATE TABLE public.inventory_maintenance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
    maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('scheduled', 'repair', 'calibration', 'inspection')),
    description TEXT NOT NULL,
    cost DECIMAL(10,2),
    maintenance_date DATE NOT NULL,
    next_maintenance_date DATE,
    technician_id UUID REFERENCES public.profiles(id),
    performed_by TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. INVENTORY_CATEGORIES TABLOSU (Kategori Yönetimi)
CREATE TABLE public.inventory_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#6B7280',
    icon TEXT DEFAULT 'package',
    parent_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. UPDATED_AT TETİKLEYİCİLERİ
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Tetikleyicileri ekle
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_technician_inventory_updated_at BEFORE UPDATE ON public.technician_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_maintenance_updated_at BEFORE UPDATE ON public.inventory_maintenance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_categories_updated_at BEFORE UPDATE ON public.inventory_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. RLS (ROW LEVEL SECURITY) ETKİNLEŞTİR
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;

-- 9. INVENTORY_ITEMS RLS POLİTİKALARI
-- Admin tüm envanter öğelerini yönetebilir
CREATE POLICY "Admins can manage all inventory items" ON public.inventory_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Teknisyenler atanmış envanter öğelerini görebilir
CREATE POLICY "Technicians can view assigned inventory" ON public.inventory_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.technician_inventory ti
            WHERE ti.inventory_item_id = inventory_items.id 
            AND ti.technician_id = auth.uid() 
            AND ti.status = 'assigned'
        )
    );

-- 10. TECHNICIAN_INVENTORY RLS POLİTİKALARI
-- Admin tüm atamaları yönetebilir
CREATE POLICY "Admins can manage all assignments" ON public.technician_inventory
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Teknisyenler kendi atamalarını görebilir
CREATE POLICY "Technicians can view own assignments" ON public.technician_inventory
    FOR SELECT USING (auth.uid() = technician_id);

-- 11. INVENTORY_MAINTENANCE RLS POLİTİKALARI
-- Admin tüm bakım kayıtlarını yönetebilir
CREATE POLICY "Admins can manage all maintenance" ON public.inventory_maintenance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Teknisyenler kendi sorumlu olduğu bakımları görebilir
CREATE POLICY "Technicians can view own maintenance" ON public.inventory_maintenance
    FOR SELECT USING (auth.uid() = technician_id);

-- 12. INVENTORY_CATEGORIES RLS POLİTİKALARI
-- Herkes kategorileri okuyabilir
CREATE POLICY "Everyone can view categories" ON public.inventory_categories
    FOR SELECT USING (true);

-- Admin kategorileri yönetebilir
CREATE POLICY "Admins can manage categories" ON public.inventory_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 13. İNDEKSLER (Performans için)
CREATE INDEX idx_inventory_items_category ON public.inventory_items(category);
CREATE INDEX idx_inventory_items_status ON public.inventory_items(status);
CREATE INDEX idx_inventory_items_serial_number ON public.inventory_items(serial_number);
CREATE INDEX idx_technician_inventory_technician_id ON public.technician_inventory(technician_id);
CREATE INDEX idx_technician_inventory_item_id ON public.technician_inventory(inventory_item_id);
CREATE INDEX idx_technician_inventory_status ON public.technician_inventory(status);
CREATE INDEX idx_inventory_maintenance_item_id ON public.inventory_maintenance(inventory_item_id);
CREATE INDEX idx_inventory_maintenance_technician_id ON public.inventory_maintenance(technician_id);

-- 14. VARSAYILAN KATEGORİLERİ EKLE
INSERT INTO public.inventory_categories (name, description, color, icon, sort_order) VALUES
('Kablo ve Bağlantı', 'Kablolar, konnektörler ve bağlantı elemanları', '#3B82F6', 'cable', 1),
('Güvenlik Ekipmanları', 'İş güvenliği ve koruyucu ekipmanlar', '#EF4444', 'shield', 2),
('El Aletleri', 'Manuel aletler ve takımlar', '#10B981', 'wrench', 3),
('Elektronik Cihazlar', 'Ölçüm aletleri ve elektronik cihazlar', '#8B5CF6', 'monitor', 4),
('Araçlar', 'Servis araçları ve taşıtlar', '#F59E0B', 'car', 5),
('Sarf Malzemeler', 'Tüketilen ve yenilenen malzemeler', '#F97316', 'shopping-cart', 6),
('Diğer', 'Diğer envanter öğeleri', '#6B7280', 'package', 7);

-- 15. ÖRNEK ENVANTER ÖĞELERİ (Test için - Çoklu Miktar)
-- Bu kısmı isterseniz kaldırabilirsiniz
INSERT INTO public.inventory_items (name, description, category, brand, model, status, total_quantity, available_quantity, unit_type, created_by) 
SELECT 
    'Test Multimetre',
    'Dijital multimetre test cihazı',
    'device',
    'Fluke',
    '87V',
    'available',
    1,
    1,
    'adet',
    id
FROM public.profiles 
WHERE role = 'admin' 
LIMIT 1;

INSERT INTO public.inventory_items (name, description, category, brand, status, total_quantity, available_quantity, unit_type, is_consumable, created_by) 
SELECT 
    'Güvenlik Kaskı',
    'Standart güvenlik kaskı',
    'safety',
    'MSA',
    'available',
    10,
    10,
    'adet',
    false,
    id
FROM public.profiles 
WHERE role = 'admin' 
LIMIT 1;

INSERT INTO public.inventory_items (name, description, category, status, total_quantity, available_quantity, unit_type, is_consumable, min_stock_level, created_by) 
SELECT 
    'Fiber Optik Kablo',
    'Single mode fiber optik kablo',
    'cable',
    'available',
    1000,
    1000,
    'metre',
    true,
    100,
    id
FROM public.profiles 
WHERE role = 'admin' 
LIMIT 1;

-- 16. KONTROL
SELECT 'Envanter yönetim sistemi başarıyla güncellendi!' as status;
SELECT 'Toplam ' || count(*) || ' kategori eklendi.' as categories_added FROM public.inventory_categories;
SELECT 'Toplam ' || count(*) || ' test öğesi eklendi.' as items_added FROM public.inventory_items;
