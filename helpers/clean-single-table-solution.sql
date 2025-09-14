-- Temiz Çözüm: Sadece equipment_tracking kullan, modem_tracking'i devre dışı bırak

-- 1. Önce mevcut modem_tracking verilerini equipment_tracking'e taşı (sadece eksik olanları)
INSERT INTO equipment_tracking (
  equipment_type,
  serial_number,
  current_status,
  assigned_technician_id,
  assigned_technician_name,
  assigned_date,
  notes,
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
  COALESCE(assignment_notes, notes, 'Modem - eskiden taşındı'),
  COALESCE(created_by, 'migration'),
  created_at,
  updated_at
FROM modem_tracking
ON CONFLICT (serial_number) DO NOTHING; -- Çakışma olursa atla

-- 2. Eski modem_tracking tablosunu devre dışı bırak (güvenlik için rename)
ALTER TABLE modem_tracking RENAME TO modem_tracking_backup;
ALTER TABLE modem_tracking_logs RENAME TO modem_tracking_logs_backup;

-- 3. Tasks tablosundaki foreign key constraint'leri kaldır (varsa)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_modem_tracking_id_fkey;

-- 4. Sonuç kontrolü
SELECT 
  'equipment_tracking toplam:' as durum, 
  COUNT(*) as sayi 
FROM equipment_tracking
UNION ALL
SELECT 
  'equipment_tracking (modem):' as durum, 
  COUNT(*) as sayi 
FROM equipment_tracking 
WHERE equipment_type = 'modem'
UNION ALL
SELECT 
  'backup tablosu:' as durum, 
  COUNT(*) as sayi 
FROM modem_tracking_backup;

-- 5. Son durumu göster
SELECT 
  equipment_type,
  COUNT(*) as adet,
  COUNT(CASE WHEN current_status = 'available' THEN 1 END) as musait,
  COUNT(CASE WHEN current_status = 'in_use' THEN 1 END) as kullanımda
FROM equipment_tracking 
GROUP BY equipment_type
ORDER BY equipment_type;
