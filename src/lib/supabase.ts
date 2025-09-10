import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'technician'
  phone?: string
  created_at: string
  updated_at: string
}

export interface TechnicianFile {
  id: string
  technician_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  uploaded_by: string
  created_at: string
}

export interface Task {
  id: string
  technician_id: string
  task_type: 'fiber_kurulum' | 'normal_kurulum' | 'fiber_donusum' | 'nakil' | 'diger'
  service_number: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  started_at?: string
  completed_at?: string
  notes?: string
  location?: string
  created_at: string
  updated_at: string
}

export interface TaskType {
  id: number
  name: string
  description?: string
  created_at: string
}

export interface TaskPhoto {
  id: string
  task_id: string
  photo_url: string
  file_name?: string
  file_size?: number
  mime_type?: string
  description?: string
  uploaded_at: string
}

export interface InventoryItem {
  id: string
  name: string
  description?: string
  category: 'cable' | 'safety' | 'tool' | 'device' | 'vehicle' | 'consumable' | 'other'
  brand?: string
  model?: string
  serial_number?: string
  purchase_date?: string
  purchase_price?: number
  status: 'available' | 'assigned' | 'maintenance' | 'lost' | 'retired' | 'partial_assigned'
  location?: string
  notes?: string
  total_quantity: number
  available_quantity: number
  assigned_quantity: number
  unit_type?: string
  is_consumable?: boolean
  min_stock_level?: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface TechnicianInventory {
  id: string
  technician_id: string
  inventory_item_id: string
  quantity: number
  assigned_date: string
  return_date?: string
  expected_return_date?: string
  status: 'assigned' | 'returned' | 'lost' | 'partial_returned'
  assigned_by: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface InventoryMaintenance {
  id: string
  inventory_item_id: string
  maintenance_type: 'scheduled' | 'repair' | 'calibration' | 'inspection'
  description: string
  cost?: number
  maintenance_date: string
  next_maintenance_date?: string
  technician_id?: string
  performed_by?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface InventoryCategory {
  id: string
  name: string
  description?: string
  color?: string
  icon?: string
  parent_id?: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Vehicle Management Types
export interface Vehicle {
  id: string
  name: string
  brand: string
  model: string
  year?: number
  license_plate: string
  vehicle_type: 'car' | 'van' | 'truck' | 'motorcycle' | 'other'
  fuel_type?: 'gasoline' | 'diesel' | 'electric' | 'hybrid'
  color?: string
  chassis_number?: string
  engine_number?: string
  insurance_expiry?: string
  inspection_expiry?: string
  status: 'available' | 'assigned' | 'maintenance' | 'out_of_service'
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged'
  mileage?: number
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface VehicleAssignment {
  id: string
  vehicle_id: string
  technician_id: string
  assigned_date: string
  expected_return_date?: string
  actual_return_date?: string
  assignment_status: 'active' | 'returned' | 'overdue'
  condition_on_delivery: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged'
  condition_on_return?: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged'
  mileage_on_delivery?: number
  mileage_on_return?: number
  fuel_level_on_delivery?: number
  fuel_level_on_return?: number
  delivery_notes?: string
  return_notes?: string
  assigned_by: string
  returned_by?: string
  created_at: string
  updated_at: string
}

export interface VehicleMaintenance {
  id: string
  vehicle_id: string
  maintenance_type: 'scheduled' | 'repair' | 'inspection' | 'insurance' | 'other'
  description: string
  cost?: number
  maintenance_date: string
  next_maintenance_date?: string
  mileage_at_maintenance?: number
  service_provider?: string
  invoice_number?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface VehicleNotification {
  id: string
  vehicle_id: string
  technician_id: string
  notification_type: 'assignment' | 'return_reminder' | 'maintenance' | 'overdue'
  title: string
  message: string
  is_read: boolean
  sent_at: string
  read_at?: string
  created_at: string
}
