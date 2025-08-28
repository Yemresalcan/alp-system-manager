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
