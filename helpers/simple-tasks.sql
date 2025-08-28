-- Basit görev yönetimi tablosu

-- Görevler tablosu
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    technician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL,
    service_number VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Görev fotoğrafları tablosu
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

-- RLS Politikaları
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_photos ENABLE ROW LEVEL SECURITY;

-- Herkes kendi görevlerini görebilir
CREATE POLICY "Users can view own tasks" ON tasks
    FOR ALL USING (auth.uid() = technician_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Herkes kendi görev fotoğraflarını görebilir
CREATE POLICY "Users can manage task photos" ON task_photos
    FOR ALL USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_photos.task_id AND (tasks.technician_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))));
