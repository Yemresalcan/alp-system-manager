-- TEMİZ BAŞLANGIÇ: Eski tabloları sil, sadece equipment_tracking kullan

-- 1. Önce mevcut equipment_tracking tablosunun yapısını kontrol et
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'equipment_tracking' 
ORDER BY ordinal_position;

-- 2. Eski tabloları tamamen sil (BACKUP İSTEMİYORSAN)
DROP TABLE IF EXISTS modem_tracking CASCADE;
DROP TABLE IF EXISTS modem_tracking_logs CASCADE;

-- 3. Tasks tablosundaki foreign key'leri temizle
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_modem_tracking_id_fkey;

-- 4. Tasks tablosundaki equipment_assignments alanını kontrol et
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'equipment_assignments';

-- 5. Equipment_tracking tablosundaki mevcut veriyi göster
SELECT 
  equipment_type,
  COUNT(*) as adet,
  COUNT(CASE WHEN current_status = 'available' THEN 1 END) as musait,
  COUNT(CASE WHEN current_status = 'in_use' THEN 1 END) as kullanımda,
  COUNT(CASE WHEN current_status = 'assigned' THEN 1 END) as atanmis
FROM equipment_tracking 
GROUP BY equipment_type
ORDER BY equipment_type;

-- 6. Son 10 equipment kaydını göster
SELECT 
  equipment_type,
  serial_number,
  current_status,
  assigned_technician_name,
  created_at
FROM equipment_tracking 
ORDER BY created_at DESC 
LIMIT 10;

-- NOTLAR:
-- Bu script eski tabloları tamamen siler
-- Sadece equipment_tracking tablosunu kullanır
-- Artık tek sistemimiz var, karışıklık yok!
