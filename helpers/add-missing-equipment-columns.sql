-- Equipment Tracking - Eksik kolonları ekle
-- API'de kullanılan ama tabloda olmayan kolonları ekleyelim

-- 1. Eksik kolonları ekle
ALTER TABLE equipment_tracking 
ADD COLUMN IF NOT EXISTS assignment_location VARCHAR(200),
ADD COLUMN IF NOT EXISTS assignment_notes TEXT,
ADD COLUMN IF NOT EXISTS assignment_task_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS assignment_service_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS returned_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS returned_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS return_notes TEXT,
ADD COLUMN IF NOT EXISTS purchase_date DATE,
ADD COLUMN IF NOT EXISTS warranty_end_date DATE,
ADD COLUMN IF NOT EXISTS last_used_date TIMESTAMP WITH TIME ZONE;

-- 2. Kolonları kontrol et
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'equipment_tracking' 
ORDER BY ordinal_position;
