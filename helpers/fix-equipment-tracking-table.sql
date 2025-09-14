-- Equipment Tracking Table Fix
-- created_by kolonu eksikti, onu ekleyelim

-- 1. Önce equipment_type enum'ını oluştur (varsa hata vermez)
DO $$ BEGIN
    CREATE TYPE equipment_type AS ENUM (
      'modem',
      'tv', 
      'rf_remote',
      'stb_hr',
      'stb_nt',
      'satellite_card'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Equipment tracking tablosunu düzelt (created_by kolonu ile)
CREATE TABLE IF NOT EXISTS equipment_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_type equipment_type NOT NULL DEFAULT 'modem',
  serial_number VARCHAR(100) UNIQUE NOT NULL,
  current_status VARCHAR(20) NOT NULL DEFAULT 'available',
  assigned_technician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_technician_name VARCHAR(100),
  assigned_date TIMESTAMP WITH TIME ZONE,
  last_used_date TIMESTAMP WITH TIME ZONE,
  purchase_date DATE,
  warranty_end_date DATE,
  notes TEXT,
  location VARCHAR(200),
  created_by VARCHAR(100) DEFAULT 'system', -- EKSİK KOLON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT equipment_tracking_serial_unique UNIQUE (serial_number),
  CONSTRAINT equipment_tracking_status_valid CHECK (current_status IN ('available', 'in_use', 'maintenance', 'damaged'))
);

-- 3. Equipment tracking logs tablosu
CREATE TABLE IF NOT EXISTS equipment_tracking_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_tracking_id UUID REFERENCES equipment_tracking(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
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

-- 4. Eksik kolon varsa ekle
ALTER TABLE equipment_tracking ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'system';

-- 5. Tasks tablosuna equipment_assignments ekle
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS equipment_assignments JSONB DEFAULT '[]';

-- 6. Index'leri oluştur
CREATE INDEX IF NOT EXISTS idx_equipment_tracking_type ON equipment_tracking(equipment_type);
CREATE INDEX IF NOT EXISTS idx_equipment_tracking_status ON equipment_tracking(current_status);
CREATE INDEX IF NOT EXISTS idx_equipment_tracking_technician ON equipment_tracking(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_equipment_tracking_serial ON equipment_tracking(serial_number);
CREATE INDEX IF NOT EXISTS idx_equipment_tracking_last4 ON equipment_tracking(right(serial_number, 4));

-- 7. RLS Policies
ALTER TABLE equipment_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_tracking_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy temizle (varsa)
DROP POLICY IF EXISTS "Admin full access equipment_tracking" ON equipment_tracking;
DROP POLICY IF EXISTS "Admin full access equipment_tracking_logs" ON equipment_tracking_logs;
DROP POLICY IF EXISTS "Technician view own equipment_tracking" ON equipment_tracking;

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

-- 8. Updated_at trigger
DROP FUNCTION IF EXISTS update_equipment_tracking_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_equipment_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS equipment_tracking_updated_at ON equipment_tracking;

CREATE TRIGGER equipment_tracking_updated_at
  BEFORE UPDATE ON equipment_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_tracking_updated_at();

-- 9. Equipment type detection function
CREATE OR REPLACE FUNCTION detect_equipment_type(serial_number VARCHAR)
RETURNS equipment_type AS $$
BEGIN
  IF serial_number ILIKE 'HR%' THEN
    RETURN 'stb_hr'::equipment_type;
  ELSIF serial_number ILIKE 'NT%' THEN
    RETURN 'stb_nt'::equipment_type;
  ELSIF serial_number ILIKE '%RF%' OR serial_number ILIKE '%REMOTE%' THEN
    RETURN 'rf_remote'::equipment_type;
  ELSIF serial_number ILIKE '%TV%' THEN
    RETURN 'tv'::equipment_type;
  ELSIF serial_number ILIKE '%SAT%' OR serial_number ILIKE '%CARD%' OR serial_number ILIKE '%UYDU%' THEN
    RETURN 'satellite_card'::equipment_type;
  ELSE
    RETURN 'modem'::equipment_type;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE equipment_tracking IS 'Tüm ekipman takibi (TV, RF, STB, Modem, Uydu Kartı)';
COMMENT ON TABLE equipment_tracking_logs IS 'Ekipman durumu değişiklik logları';
