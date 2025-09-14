-- MODEM TAKİP MODÜLÜ DATABASE ŞEMASI
-- Bu modül tamamen bağımsız, mevcut inventory systeminden ayrı

-- Modem Tracking Ana Tablosu
CREATE TABLE public.modem_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Excel'den gelen temel bilgiler
    modem_serial_number TEXT NOT NULL UNIQUE, -- "23*******8521" formatı
    document_number TEXT, -- "IRS-2025058743" - Belge Numarası
    company TEXT, -- "ALP SİSTEM VE BİLİŞİM TEKNOLOJİLERİ LİMİTED ŞİRKETİ"
    stock_name TEXT, -- "Türksat - CT902/FTTH OPTİK BÖLÜCÜ"
    stock_status TEXT, -- "Sağlam Stok Çıkışı Yapıldı"
    warehouse_movement_date DATE, -- "2025-08-18"
    
    -- Sistem takip alanları
    assigned_technician_id UUID REFERENCES public.profiles(id), -- Atanan teknisyen
    assigned_technician_name TEXT, -- Teknisyen adı (cache için)
    assigned_date TIMESTAMP WITH TIME ZONE, -- Atama tarihi
    assignment_task_type TEXT, -- Hangi görev türü için atandı
    assignment_service_number TEXT, -- Servis numarası
    assignment_location TEXT, -- Kurulum lokasyonu
    assignment_notes TEXT, -- Atama notları
    
    -- Geri alma bilgileri
    returned_date TIMESTAMP WITH TIME ZONE, -- Geri alma tarihi
    returned_by UUID REFERENCES public.profiles(id), -- Kim geri aldı
    return_notes TEXT, -- Geri alma notları
    
    -- Durum takibi
    current_status TEXT NOT NULL DEFAULT 'available' CHECK (
        current_status IN ('available', 'assigned', 'in_use', 'returned', 'lost', 'damaged')
    ),
    
    -- Meta bilgiler
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES public.profiles(id) NOT NULL
);

-- İndeksler (performans için)
CREATE INDEX idx_modem_tracking_serial ON public.modem_tracking(modem_serial_number);
CREATE INDEX idx_modem_tracking_technician ON public.modem_tracking(assigned_technician_id);
CREATE INDEX idx_modem_tracking_status ON public.modem_tracking(current_status);
CREATE INDEX idx_modem_tracking_date ON public.modem_tracking(assigned_date);

-- RLS (Row Level Security) Politikaları
ALTER TABLE public.modem_tracking ENABLE ROW LEVEL SECURITY;

-- Admin'ler her şeyi görebilir
CREATE POLICY "Admins can view all modem tracking" ON public.modem_tracking
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Teknisyenler kendi atanan modemlerini görebilir
CREATE POLICY "Technicians can view assigned modems" ON public.modem_tracking
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'technician'
            AND (
                modem_tracking.assigned_technician_id = auth.uid() OR
                modem_tracking.current_status = 'available'
            )
        )
    );

-- Teknisyenler kendi modemlerini güncelleyebilir (geri alma için)
CREATE POLICY "Technicians can update their modems" ON public.modem_tracking
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'technician'
            AND modem_tracking.assigned_technician_id = auth.uid()
        )
    );

-- Modem Takip Logları (isteğe bağlı)
CREATE TABLE public.modem_tracking_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    modem_tracking_id UUID REFERENCES public.modem_tracking(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL, -- 'assigned', 'returned', 'status_changed', etc.
    old_value TEXT, -- Eski değer (JSON format)
    new_value TEXT, -- Yeni değer (JSON format)
    performed_by UUID REFERENCES public.profiles(id) NOT NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    notes TEXT
);

-- Log indexi
CREATE INDEX idx_modem_logs_modem ON public.modem_tracking_logs(modem_tracking_id);
CREATE INDEX idx_modem_logs_date ON public.modem_tracking_logs(performed_at);

-- Log tablosu için RLS
ALTER TABLE public.modem_tracking_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all modem logs" ON public.modem_tracking_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Fonksiyon: Modem durumu değiştiğinde log oluştur
CREATE OR REPLACE FUNCTION log_modem_tracking_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Sadece önemli alanlar değiştiğinde log oluştur
    IF (OLD.assigned_technician_id IS DISTINCT FROM NEW.assigned_technician_id) OR
       (OLD.current_status IS DISTINCT FROM NEW.current_status) OR
       (OLD.returned_date IS DISTINCT FROM NEW.returned_date) THEN
       
        INSERT INTO public.modem_tracking_logs (
            modem_tracking_id,
            action,
            old_value,
            new_value,
            performed_by
        ) VALUES (
            NEW.id,
            CASE 
                WHEN OLD.assigned_technician_id IS DISTINCT FROM NEW.assigned_technician_id THEN 'technician_changed'
                WHEN OLD.current_status IS DISTINCT FROM NEW.current_status THEN 'status_changed'  
                WHEN OLD.returned_date IS DISTINCT FROM NEW.returned_date THEN 'return_date_changed'
                ELSE 'updated'
            END,
            json_build_object(
                'technician_id', OLD.assigned_technician_id,
                'status', OLD.current_status,
                'returned_date', OLD.returned_date
            )::text,
            json_build_object(
                'technician_id', NEW.assigned_technician_id,
                'status', NEW.current_status,
                'returned_date', NEW.returned_date
            )::text,
            auth.uid()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger ekle
CREATE TRIGGER trigger_log_modem_tracking_changes
    AFTER UPDATE ON public.modem_tracking
    FOR EACH ROW
    EXECUTE FUNCTION log_modem_tracking_changes();

-- Updated_at otomatik güncellemesi için trigger
CREATE OR REPLACE FUNCTION update_modem_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_modem_tracking_updated_at
    BEFORE UPDATE ON public.modem_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_modem_tracking_updated_at();
