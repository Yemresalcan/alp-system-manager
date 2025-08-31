import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('getCurrentUser error:', error)
      return null
    }
    return user
  } catch (error) {
    console.error('getCurrentUser catch error:', error)
    return null
  }
}

export const getUserProfile = async (userId: string) => {
  try {
    console.log('🔍 getUserProfile çağrıldı:', userId)
    
    // Timeout ile profil yükleme
    const profilePromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Profile fetch timeout')), 10000) // 10 saniye timeout
    })
    
    const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any
    
    if (error) {
      console.error('❌ Profile fetch error:', error)
      throw new Error(`Profil yüklenemedi: ${error.message}`)
    }

    if (!data) {
      console.error('❌ Profil bulunamadı:', userId)
      throw new Error('Kullanıcı profili bulunamadı')
    }

    console.log('✅ Profile loaded:', data.role, data.full_name)
    return data
  } catch (error) {
    console.error('❌ getUserProfile error:', error)
    throw error
  }
}

export const signOut = async () => {
  try {
    console.log('🚪 Signing out...')
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('❌ SignOut error:', error)
      throw error
    }
    console.log('✅ Signed out successfully')
  } catch (error) {
    console.error('❌ SignOut catch error:', error)
    throw error
  }
}

export const isAdmin = (role: string): boolean => {
  return role === 'admin'
}

export const isTechnician = (role: string): boolean => {
  return role === 'technician'
}
