-- ALP SISTEM YÖNETİM SİSTEMİ - VERİTABANI ŞEMASI
-- Bu dosyayı Supabase SQL Editor'da çalıştır

-- 1. PROFILES TABLOSU (Kullanıcılar)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'technician')) DEFAULT 'technician',
    phone TEXT,
    city TEXT,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. FILES TABLOSU (Tekniksyen Dosyaları)
CREATE TABLE public.files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    technician_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TASKS TABLOSU (Görevler)
CREATE TABLE public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    technician_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. INVENTORY_ITEMS TABLOSU (Envanter)
CREATE TABLE public.inventory_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    technician_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    item_name TEXT NOT NULL,
    item_code TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    condition TEXT NOT NULL CHECK (condition IN ('new', 'good', 'fair', 'poor')) DEFAULT 'good',
    notes TEXT,
    assigned_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. UPDATED_AT TETİKLEYİCİLERİ
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Tetikleyicileri ekle
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. RLS (ROW LEVEL SECURITY) ETKİNLEŞTİR
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- 7. PROFILES RLS POLİTİKALARI
-- Herkes kendi profilini görebilir
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Herkes kendi profilini güncelleyebilir  
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admin tüm profilleri görebilir
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admin profil oluşturabilir
CREATE POLICY "Admins can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admin profil silebilir
CREATE POLICY "Admins can delete profiles" ON public.profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 8. FILES RLS POLİTİKALARI
-- Teknisyenler kendi dosyalarını görebilir
CREATE POLICY "Technicians can view own files" ON public.files
    FOR SELECT USING (auth.uid() = technician_id);

-- Teknisyenler dosya ekleyebilir
CREATE POLICY "Technicians can insert own files" ON public.files
    FOR INSERT WITH CHECK (auth.uid() = technician_id);

-- Admin tüm dosyaları görebilir
CREATE POLICY "Admins can view all files" ON public.files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 9. TASKS RLS POLİTİKALARI
-- Teknisyenler kendi görevlerini görebilir
CREATE POLICY "Technicians can view own tasks" ON public.tasks
    FOR SELECT USING (auth.uid() = technician_id);

-- Teknisyenler kendi görevlerini güncelleyebilir (sadece status)
CREATE POLICY "Technicians can update own task status" ON public.tasks
    FOR UPDATE USING (auth.uid() = technician_id);

-- Admin tüm görevleri yönetebilir
CREATE POLICY "Admins can manage all tasks" ON public.tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 10. INVENTORY_ITEMS RLS POLİTİKALARI
-- Teknisyenler kendi envanterini görebilir
CREATE POLICY "Technicians can view own inventory" ON public.inventory_items
    FOR SELECT USING (auth.uid() = technician_id);

-- Admin tüm envanteri yönetebilir
CREATE POLICY "Admins can manage all inventory" ON public.inventory_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 11. İNDEKSLER (Performans için)
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_files_technician_id ON public.files(technician_id);
CREATE INDEX idx_tasks_technician_id ON public.tasks(technician_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_inventory_technician_id ON public.inventory_items(technician_id);

-- 12. KONTROL
SELECT 'Veritabanı şeması başarıyla oluşturuldu!' as status;
