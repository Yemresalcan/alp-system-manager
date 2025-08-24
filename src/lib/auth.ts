import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const isAdmin = (role: string): boolean => {
  return role === 'admin'
}

export const isTechnician = (role: string): boolean => {
  return role === 'technician'
}
