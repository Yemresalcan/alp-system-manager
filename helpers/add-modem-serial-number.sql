-- Görevler tablosuna modem seri numarası alanı ekleme
-- Bu script tasks tablosuna modem_serial_number sütununu ekler

-- 1. Sütunu ekle
ALTER TABLE tasks 
ADD COLUMN modem_serial_number TEXT;

-- 2. Sütun için yorum ekle
COMMENT ON COLUMN tasks.modem_serial_number IS 'Kurulum/işlem sırasında kullanılan modem seri numarası';

-- 3. İndeks ekle (opsiyonel - arama performansı için)
CREATE INDEX IF NOT EXISTS idx_tasks_modem_serial_number 
ON tasks(modem_serial_number) 
WHERE modem_serial_number IS NOT NULL;

-- 4. RLS politikalarını kontrol et (mevcut politikalar otomatik olarak yeni sütunu kapsar)
-- Bu değişiklik mevcut RLS politikalarını etkilemez

-- Başarı mesajı
SELECT 'Modem seri numarası alanı başarıyla eklendi!' as message;
