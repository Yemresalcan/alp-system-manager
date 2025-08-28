-- Görev yönetimi için tablo oluşturma SQL'leri

-- 1. Görev tipleri tablosu
CREATE TABLE IF NOT EXISTS task_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Varsayılan görev tipleri
INSERT INTO task_types (name, description) VALUES 
('fiber_kurulum', 'Fiber İnternet Kurulum'),
('normal_kurulum', 'Normal İnternet Kurulum'),
('fiber_donusum', 'Fiber Dönüşüm'),
('nakil', 'Nakil İşlemi'),
('diger', 'Diğer İşlemler')
ON CONFLICT (name) DO NOTHING;

-- 2. Görevler tablosu
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    technician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL,
    service_number VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_task_type CHECK (task_type IN ('fiber_kurulum', 'normal_kurulum', 'fiber_donusum', 'nakil', 'diger'))
);

-- 3. Görev fotoğrafları tablosu
CREATE TABLE IF NOT EXISTS task_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_tasks_technician_id ON tasks(technician_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_task_photos_task_id ON task_photos(task_id);

-- RLS (Row Level Security) Politikaları
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_types ENABLE ROW LEVEL SECURITY;

-- Teknisyenler sadece kendi görevlerini görebilir
CREATE POLICY "Technicians can view own tasks" ON tasks
    FOR SELECT USING (
        auth.uid() = technician_id OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Teknisyenler kendi görevlerini oluşturabilir
CREATE POLICY "Technicians can create own tasks" ON tasks
    FOR INSERT WITH CHECK (auth.uid() = technician_id);

-- Teknisyenler kendi görevlerini güncelleyebilir
CREATE POLICY "Technicians can update own tasks" ON tasks
    FOR UPDATE USING (
        auth.uid() = technician_id OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Görev fotoğrafları için politikalar
CREATE POLICY "Users can view task photos" ON task_photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = task_photos.task_id 
            AND (tasks.technician_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
        )
    );

CREATE POLICY "Technicians can upload task photos" ON task_photos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = task_photos.task_id 
            AND tasks.technician_id = auth.uid()
        )
    );

-- Görev tipleri herkes okuyabilir
CREATE POLICY "Anyone can view task types" ON task_types
    FOR SELECT USING (true);

-- Günlük görev sayısı fonksiyonu
CREATE OR REPLACE FUNCTION get_daily_task_count(technician_uuid UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM tasks
        WHERE technician_id = technician_uuid
        AND DATE(created_at) = target_date
        AND status IN ('completed', 'in_progress', 'pending')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE tasks IS 'Teknisyen görevleri tablosu';
COMMENT ON TABLE task_photos IS 'Görev fotoğrafları tablosu';
COMMENT ON TABLE task_types IS 'Görev tip tanımları tablosu';
