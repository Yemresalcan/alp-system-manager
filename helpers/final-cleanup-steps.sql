-- SON TEMİZLİK ADIMLARI

-- 1. ÖNCE KONTROL: equipment_tracking var mı?
SELECT 
  'equipment_tracking' as tablo,
  COUNT(*) as kayit_sayisi
FROM equipment_tracking;

-- 2. İKİ TABLO DA VARSA KARŞILAŞTIR
SELECT 
  'modem_tracking' as tablo,
  COUNT(*) as modem_sayisi
FROM modem_tracking
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modem_tracking')
UNION ALL
SELECT 
  'equipment_tracking (modem)' as tablo, 
  COUNT(*) as modem_sayisi
FROM equipment_tracking 
WHERE equipment_type = 'modem';

-- 3. EĞER HER ŞEY TAMAM İSE CLEANUP ÇALIŞTIR:
-- \i helpers/simple-cleanup.sql
