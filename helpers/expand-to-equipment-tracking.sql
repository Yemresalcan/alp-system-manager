-- Equipment Tracking System Expansion
-- Bu script mevcut modem_tracking tablosunu equipment_tracking'e genişletir

-- 1. Önce yeni equipment_type enum'ı oluştur
CREATE TYPE equipment_type AS ENUM (
  'modem',
  'tv', 
  'rf_remote',
  'stb_hr',
  'stb_nt',
  'satellite_card'
);

-- 2. Yeni equipment_tracking tablosunu oluştur
CREATE TABLE IF NOT EXISTS equipment_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_type equipment_type NOT NULL DEFAULT 'modem',
  serial_number VARCHAR(100) UNIQUE NOT NULL,
  current_status VARCHAR(20) NOT NULL DEFAULT 'available', -- 'available', 'in_use', 'maintenance', 'damaged'
  assigned_technician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_technician_name VARCHAR(100),
  assigned_date TIMESTAMP WITH TIME ZONE,
  last_used_date TIMESTAMP WITH TIME ZONE,
  purchase_date DATE,
  warranty_end_date DATE,
  notes TEXT,
  location VARCHAR(200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT equipment_tracking_serial_unique UNIQUE (serial_number),
  CONSTRAINT equipment_tracking_status_valid CHECK (current_status IN ('available', 'in_use', 'maintenance', 'damaged'))
);

-- 3. equipment_tracking_logs tablosunu oluştur  
CREATE TABLE IF NOT EXISTS equipment_tracking_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_tracking_id UUID REFERENCES equipment_tracking(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'assigned', 'returned', 'damaged', 'maintenance'
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  old_technician_id UUID,
  new_technician_id UUID,
  technician_name VARCHAR(100),
  performed_by UUID REFERENCES auth.users(id),
  performed_by_name VARCHAR(100),
  task_type VARCHAR(50),
  service_number VARCHAR(100),
  location VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Mevcut modem_tracking verilerini kopyala
INSERT INTO equipment_tracking (
  equipment_type,
  serial_number,
  current_status,
  assigned_technician_id,
  assigned_technician_name,
  assigned_date,
  notes,
  created_at,
  updated_at,
  created_by
)
SELECT 
  'modem'::equipment_type,
  modem_serial_number,
  current_status,
  assigned_technician_id,
  assigned_technician_name,
  assigned_date,
  assignment_notes,
  created_at,
  updated_at,
  COALESCE(created_by, 'migration')
FROM modem_tracking
ON CONFLICT (serial_number) DO NOTHING;

-- 5. Mevcut modem_tracking_logs verilerini kopyala
INSERT INTO equipment_tracking_logs (
  equipment_tracking_id,
  action,
  old_status,
  new_status,
  old_technician_id,
  new_technician_id,
  technician_name,
  performed_by,
  performed_by_name,
  task_type,
  service_number,
  location,
  notes,
  created_at
)
SELECT 
  et.id, -- yeni equipment_tracking id'sini al
  ml.action,
  ml.old_status,
  ml.new_status,
  ml.old_technician_id,
  ml.new_technician_id,
  ml.technician_name,
  ml.performed_by,
  ml.performed_by_name,
  ml.task_type,
  ml.service_number,
  ml.location,
  ml.notes,
  ml.created_at
FROM modem_tracking_logs ml
JOIN modem_tracking mt ON ml.modem_tracking_id = mt.id
JOIN equipment_tracking et ON et.serial_number = mt.modem_serial_number
WHERE et.equipment_type = 'modem';

-- 6. Tasks tablosunu güncelle (modem alanlarını equipment olarak genişlet)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS equipment_assignments JSONB DEFAULT '[]';

-- Mevcut modem verilerini yeni formata dönüştür
UPDATE tasks 
SET equipment_assignments = jsonb_build_array(
  jsonb_build_object(
    'type', 'modem',
    'serial_number', modem_serial_number,
    'tracking_id', modem_tracking_id,
    'assigned_at', modem_assigned_at,
    'usage_notes', modem_usage_notes
  )
)
WHERE modem_serial_number IS NOT NULL AND modem_serial_number != '';

-- 7. Index'leri oluştur
CREATE INDEX IF NOT EXISTS idx_equipment_tracking_type ON equipment_tracking(equipment_type);
CREATE INDEX IF NOT EXISTS idx_equipment_tracking_status ON equipment_tracking(current_status);
CREATE INDEX IF NOT EXISTS idx_equipment_tracking_technician ON equipment_tracking(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_equipment_tracking_serial ON equipment_tracking(serial_number);
CREATE INDEX IF NOT EXISTS idx_equipment_tracking_last4 ON equipment_tracking(right(serial_number, 4));

-- 8. RLS Policies
ALTER TABLE equipment_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_tracking_logs ENABLE ROW LEVEL SECURITY;

-- Admin kullanıcıları her şeye erişebilir
CREATE POLICY "Admin full access equipment_tracking" ON equipment_tracking
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin full access equipment_tracking_logs" ON equipment_tracking_logs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Teknisyenler sadece kendi atamalarını görebilir
CREATE POLICY "Technician view own equipment_tracking" ON equipment_tracking
FOR SELECT USING (
  assigned_technician_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 9. Updated_at trigger'ı
CREATE OR REPLACE FUNCTION update_equipment_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER equipment_tracking_updated_at
  BEFORE UPDATE ON equipment_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_tracking_updated_at();

-- 10. Equipment type detection function
CREATE OR REPLACE FUNCTION detect_equipment_type(serial_number VARCHAR)
RETURNS equipment_type AS $$
BEGIN
  -- HR ile başlarsa STB_HR
  IF serial_number ILIKE 'HR%' THEN
    RETURN 'stb_hr'::equipment_type;
  -- NT ile başlarsa STB_NT  
  ELSIF serial_number ILIKE 'NT%' THEN
    RETURN 'stb_nt'::equipment_type;
  -- RF içerirse veya remote kelimesi varsa RF Remote
  ELSIF serial_number ILIKE '%RF%' OR serial_number ILIKE '%REMOTE%' THEN
    RETURN 'rf_remote'::equipment_type;
  -- TV içerirse TV
  ELSIF serial_number ILIKE '%TV%' THEN
    RETURN 'tv'::equipment_type;
  -- SAT, CARD, UYDU içerirse satellite card
  ELSIF serial_number ILIKE '%SAT%' OR serial_number ILIKE '%CARD%' OR serial_number ILIKE '%UYDU%' THEN
    RETURN 'satellite_card'::equipment_type;
  -- Varsayılan olarak modem
  ELSE
    RETURN 'modem'::equipment_type;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE equipment_tracking IS 'Tüm ekipman takibi (TV, RF, STB, Modem, Uydu Kartı)';
COMMENT ON TABLE equipment_tracking_logs IS 'Ekipman durumu değişiklik logları';
COMMENT ON FUNCTION detect_equipment_type(VARCHAR) IS 'Seri numarasından ekipman tipini otomatik tespit eder';
