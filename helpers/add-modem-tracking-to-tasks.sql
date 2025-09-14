-- Görevler tablosuna modem takip bilgisi ekleme
-- Bu script tasks tablosuna modem tracking bilgilerini ekler

-- 1. Modem seri numarası alanı (eğer yoksa ekle)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS modem_serial_number TEXT;

-- 2. Modem tracking ID'si ile ilişki (foreign key)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS modem_tracking_id UUID REFERENCES modem_tracking(id);

-- 3. Modem atama tarihi
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS modem_assigned_at TIMESTAMP WITH TIME ZONE;

-- 4. Modem kullanım notları
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS modem_usage_notes TEXT;

-- 5. Sütunlar için yorumlar ekle
COMMENT ON COLUMN tasks.modem_serial_number IS 'Kurulum/işlem sırasında kullanılan modem seri numarası';
COMMENT ON COLUMN tasks.modem_tracking_id IS 'Modem tracking tablosundaki ilgili kaydın ID''si';
COMMENT ON COLUMN tasks.modem_assigned_at IS 'Modem görev için atandığı tarih';
COMMENT ON COLUMN tasks.modem_usage_notes IS 'Modem kullanımı ile ilgili özel notlar';

-- 6. İndeksler ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_tasks_modem_serial_number 
ON tasks(modem_serial_number) 
WHERE modem_serial_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_modem_tracking_id 
ON tasks(modem_tracking_id) 
WHERE modem_tracking_id IS NOT NULL;

-- 7. Modem tracking ile join yapabilmek için view oluştur (opsiyonel)
CREATE OR REPLACE VIEW tasks_with_modem_info AS
SELECT 
    t.*,
    mt.document_number,
    mt.company as modem_company,
    mt.stock_name,
    mt.stock_status,
    mt.warehouse_movement_date,
    mt.current_status as modem_status,
    mt.assigned_technician_name as modem_assigned_technician
FROM tasks t
LEFT JOIN modem_tracking mt ON t.modem_tracking_id = mt.id;

-- 8. RLS politikalarını view için de uygula
ALTER VIEW tasks_with_modem_info OWNER TO postgres;

-- Başarı mesajı
SELECT 'Görevler tablosuna modem takip bilgileri başarıyla eklendi!' as message;
