-- Eski tabloyu ve politikaları temizle
DROP TABLE IF EXISTS public.technician_files CASCADE;
DROP POLICY IF EXISTS "Technicians can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all files" ON storage.objects;

-- Teknisyen dosyaları için doğru tablo oluştur
CREATE TABLE public.technician_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    technician_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İndexler ekle
CREATE INDEX technician_files_technician_id_idx ON public.technician_files(technician_id);
CREATE INDEX technician_files_uploaded_at_idx ON public.technician_files(uploaded_at DESC);

-- RLS Politikaları ekle
ALTER TABLE public.technician_files ENABLE ROW LEVEL SECURITY;

-- Teknisyenler sadece kendi dosyalarını görebilir
CREATE POLICY "Technicians can view own files" ON public.technician_files
    FOR SELECT USING (auth.uid() = technician_id);

-- Teknisyenler sadece kendi dosyalarını ekleyebilir  
CREATE POLICY "Technicians can insert own files" ON public.technician_files
    FOR INSERT WITH CHECK (auth.uid() = technician_id);

-- Teknisyenler sadece kendi dosyalarını silebilir
CREATE POLICY "Technicians can delete own files" ON public.technician_files
    FOR DELETE USING (auth.uid() = technician_id);

-- Adminler tüm dosyaları görebilir
CREATE POLICY "Admins can view all files" ON public.technician_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Updated at trigger ekle
CREATE OR REPLACE FUNCTION update_technician_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_technician_files_updated_at
    BEFORE UPDATE ON public.technician_files
    FOR EACH ROW
    EXECUTE FUNCTION update_technician_files_updated_at();

-- Storage bucket oluştur (eğer yoksa)
INSERT INTO storage.buckets (id, name, public)
VALUES ('technician-files', 'technician-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS politikaları (tekrar oluştur)
CREATE POLICY "Technicians can upload files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'technician-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Technicians can view own files storage" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'technician-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Technicians can delete own files storage" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'technician-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Admins can view all files storage" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'technician-files' AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
