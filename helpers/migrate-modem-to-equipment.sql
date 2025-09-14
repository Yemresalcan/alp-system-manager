-- Mevcut modem_tracking verilerini equipment_tracking'e taşı
-- Ve eski sistemi yeni sisteme entegre et

-- 1. Önce modem_tracking tablosundaki verileri equipment_tracking'e kopyala
INSERT INTO equipment_tracking (
  equipment_type,
  serial_number,
  current_status,
  assigned_technician_id,
  assigned_technician_name,
  assigned_date,
  notes,
  location,
  created_by,
  created_at,
  updated_at
)
SELECT 
  'modem'::equipment_type,
  modem_serial_number,
  current_status,
  assigned_technician_id,
  assigned_technician_name,
  assigned_date,
  COALESCE(assignment_notes, notes, ''),
  COALESCE(assignment_location, location, ''),
  COALESCE(created_by, 'migration'),
  created_at,
  updated_at
FROM modem_tracking
ON CONFLICT (serial_number) DO UPDATE SET
  equipment_type = EXCLUDED.equipment_type,
  current_status = EXCLUDED.current_status,
  assigned_technician_id = EXCLUDED.assigned_technician_id,
  assigned_technician_name = EXCLUDED.assigned_technician_name,
  assigned_date = EXCLUDED.assigned_date,
  updated_at = NOW();

-- 2. Modem_tracking_logs verilerini de taşı
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
WHERE et.equipment_type = 'modem'
ON CONFLICT DO NOTHING;

-- 3. Tasks tablosundaki equipment_assignments'ı güncelle
UPDATE tasks 
SET equipment_assignments = jsonb_build_array(
  jsonb_build_object(
    'type', 'modem',
    'serial_number', modem_serial_number,
    'tracking_id', et.id,
    'assigned_at', COALESCE(modem_assigned_at, et.assigned_date, NOW()::text),
    'usage_notes', COALESCE(modem_usage_notes, 'Modem - görevde kullanıldı')
  )
)
FROM equipment_tracking et
WHERE tasks.modem_serial_number IS NOT NULL 
  AND tasks.modem_serial_number != ''
  AND et.serial_number = tasks.modem_serial_number
  AND et.equipment_type = 'modem'
  AND (tasks.equipment_assignments IS NULL OR tasks.equipment_assignments = '[]');

-- 4. Kontrol sorguları
SELECT 'modem_tracking kayıt sayısı:' as tablo, COUNT(*) as sayi FROM modem_tracking
UNION ALL
SELECT 'equipment_tracking kayıt sayısı:' as tablo, COUNT(*) as sayi FROM equipment_tracking
UNION ALL
SELECT 'equipment_tracking (sadece modem):' as tablo, COUNT(*) as sayi FROM equipment_tracking WHERE equipment_type = 'modem';

-- 5. Son 5 kaydı kontrol et
SELECT 
  serial_number,
  equipment_type,
  current_status,
  assigned_technician_name,
  created_at
FROM equipment_tracking 
WHERE equipment_type = 'modem'
ORDER BY created_at DESC 
LIMIT 5;
