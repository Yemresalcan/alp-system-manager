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
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  due_date?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Inventory {
  id: string
  technician_id: string
  item_name: string
  item_code?: string
  quantity: number
  condition: 'new' | 'good' | 'fair' | 'poor'
  notes?: string
  created_at: string
  updated_at: string
}
