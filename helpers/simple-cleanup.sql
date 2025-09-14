-- BASIT TEMİZLİK: Sadece eski tabloları sil (GÜVENLİ)

-- 1. Önce kontrol: equipment_tracking tablosu var mı?
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_tracking') THEN
    RAISE EXCEPTION 'HATA: equipment_tracking tablosu bulunamadı! Önce migration çalıştırın.';
  END IF;
END $$;

-- 2. Mevcut durumu göster
SELECT 
  'equipment_tracking' as tablo,
  COUNT(*) as kayit_sayisi
FROM equipment_tracking
UNION ALL
SELECT 
  'modem_tracking' as tablo,
  COUNT(*) as kayit_sayisi  
FROM modem_tracking
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modem_tracking');

-- 3. Foreign key constraint'leri temizle
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_modem_tracking_id_fkey;

-- 4. Eski tabloları sil (cascade ile tüm bağımlılıklar)
DROP TABLE IF EXISTS modem_tracking CASCADE;
DROP TABLE IF EXISTS modem_tracking_logs CASCADE;

-- 5. Kontrol: Hangi tracking tabloları kaldı?
SELECT 
  tablename,
  schemaname
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%tracking%'
ORDER BY tablename;

-- 6. Equipment_tracking durumu
SELECT 
  equipment_type,
  COUNT(*) as toplam,
  COUNT(CASE WHEN current_status = 'available' THEN 1 END) as musait,
  COUNT(CASE WHEN current_status = 'in_use' THEN 1 END) as kullanımda
FROM equipment_tracking 
GROUP BY equipment_type
ORDER BY equipment_type;

-- 7. Sonuç mesajı
SELECT '✅ Temizlik tamamlandı! Artık sadece equipment_tracking tablosu var.' as durum;
