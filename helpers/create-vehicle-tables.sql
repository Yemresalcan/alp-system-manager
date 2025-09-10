-- Araç yönetimi için gerekli tablolar

-- Araçlar tablosu
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    year INTEGER,
    license_plate VARCHAR(50) NOT NULL UNIQUE,
    vehicle_type VARCHAR(50) DEFAULT 'car' CHECK (vehicle_type IN ('car', 'van', 'truck', 'motorcycle', 'other')),
    fuel_type VARCHAR(50) CHECK (fuel_type IN ('gasoline', 'diesel', 'electric', 'hybrid')),
    color VARCHAR(100),
    chassis_number VARCHAR(255),
    engine_number VARCHAR(255),
    insurance_expiry DATE,
    inspection_expiry DATE,
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'maintenance', 'out_of_service')),
    condition VARCHAR(50) DEFAULT 'excellent' CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
    mileage INTEGER DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Araç atamaları tablosu
CREATE TABLE IF NOT EXISTS vehicle_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expected_return_date DATE,
    actual_return_date TIMESTAMP WITH TIME ZONE,
    assignment_status VARCHAR(50) DEFAULT 'active' CHECK (assignment_status IN ('active', 'returned', 'overdue')),
    condition_on_delivery VARCHAR(50) DEFAULT 'excellent' CHECK (condition_on_delivery IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
    condition_on_return VARCHAR(50) CHECK (condition_on_return IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
    mileage_on_delivery INTEGER DEFAULT 0,
    mileage_on_return INTEGER,
    fuel_level_on_delivery INTEGER DEFAULT 100 CHECK (fuel_level_on_delivery >= 0 AND fuel_level_on_delivery <= 100),
    fuel_level_on_return INTEGER CHECK (fuel_level_on_return >= 0 AND fuel_level_on_return <= 100),
    delivery_notes TEXT,
    return_notes TEXT,
    assigned_by UUID REFERENCES profiles(id),
    returned_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Araç bakım kayıtları tablosu
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(50) DEFAULT 'scheduled' CHECK (maintenance_type IN ('scheduled', 'repair', 'inspection', 'insurance', 'other')),
    description TEXT NOT NULL,
    cost DECIMAL(10,2),
    maintenance_date DATE NOT NULL,
    next_maintenance_date DATE,
    mileage_at_maintenance INTEGER,
    service_provider VARCHAR(255),
    invoice_number VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Araç bildirimleri tablosu
CREATE TABLE IF NOT EXISTS vehicle_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('assignment', 'return_reminder', 'maintenance', 'overdue', 'return')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Updated_at trigger'ları
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_vehicle_assignments_updated_at BEFORE UPDATE ON vehicle_assignments
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_vehicle_maintenance_updated_at BEFORE UPDATE ON vehicle_maintenance
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_vehicle_id ON vehicle_assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_technician_id ON vehicle_assignments(technician_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_status ON vehicle_assignments(assignment_status);
CREATE INDEX IF NOT EXISTS idx_vehicle_notifications_technician_id ON vehicle_notifications(technician_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_notifications_is_read ON vehicle_notifications(is_read);

-- RLS Policies
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_notifications ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin full access vehicles" ON vehicles FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin full access vehicle_assignments" ON vehicle_assignments FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin full access vehicle_maintenance" ON vehicle_maintenance FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin full access vehicle_notifications" ON vehicle_notifications FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Technicians can view their assignments and notifications
CREATE POLICY "Technician view own assignments" ON vehicle_assignments FOR SELECT TO authenticated
USING (technician_id = auth.uid());

CREATE POLICY "Technician view assigned vehicles" ON vehicles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vehicle_assignments 
    WHERE vehicle_assignments.vehicle_id = vehicles.id 
    AND vehicle_assignments.technician_id = auth.uid()
    AND vehicle_assignments.assignment_status = 'active'
  )
);

CREATE POLICY "Technician view own notifications" ON vehicle_notifications FOR SELECT TO authenticated
USING (technician_id = auth.uid());

CREATE POLICY "Technician update own notifications" ON vehicle_notifications FOR UPDATE TO authenticated
USING (technician_id = auth.uid());

COMMENT ON TABLE vehicles IS 'Araç bilgileri ve durumları';
COMMENT ON TABLE vehicle_assignments IS 'Araç atama kayıtları';
COMMENT ON TABLE vehicle_maintenance IS 'Araç bakım kayıtları';
COMMENT ON TABLE vehicle_notifications IS 'Araç ile ilgili bildirimler';
