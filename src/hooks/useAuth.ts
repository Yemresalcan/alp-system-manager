'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getUserProfile } from '@/lib/auth'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/supabase'

// Auth session hook - cached
export const useAuthSession = () => {
  return useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      console.log('🔍 Fetching auth session...')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Session error:', error)
        throw error
      }
      
      console.log('✅ Session fetched:', session?.user?.email || 'No session')
      return session
    },
    staleTime: 2 * 60 * 1000, // 2 dakika fresh
    gcTime: 5 * 60 * 1000, // 5 dakika cache
    retry: 1,
  })
}

// User profile hook - cached
export const useUserProfile = (userId?: string) => {
  return useQuery({
    queryKey: ['user', 'profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required')
      
      console.log('🔍 Fetching user profile...', userId)
      const profile = await getUserProfile(userId)
      console.log('✅ Profile fetched:', profile.role, profile.full_name)
      return profile
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 dakika fresh
    gcTime: 10 * 60 * 1000, // 10 dakika cache
    retry: 2,
  })
}

// Combined auth hook
export const useAuth = () => {
  const queryClient = useQueryClient()
  
  const { 
    data: session, 
    isLoading: sessionLoading, 
    error: sessionError 
  } = useAuthSession()
  
  const { 
    data: profile, 
    isLoading: profileLoading, 
    error: profileError 
  } = useUserProfile(session?.user?.id)

  const isLoading = sessionLoading || (session?.user && profileLoading)
  const error = sessionError || profileError
  const user = session?.user || null

  // Logout function with cache invalidation
  const logout = async () => {
    console.log('🚪 Logging out and clearing cache...')
    await supabase.auth.signOut()
    
    // Clear all auth-related cache
    queryClient.removeQueries({ queryKey: ['auth'] })
    queryClient.removeQueries({ queryKey: ['user'] })
    queryClient.removeQueries({ queryKey: ['tasks'] })
    queryClient.removeQueries({ queryKey: ['files'] })
    queryClient.removeQueries({ queryKey: ['inventory'] })
  }

  // Refresh auth data
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['auth'] })
    queryClient.invalidateQueries({ queryKey: ['user'] })
  }

  return {
    user,
    profile,
    isLoading,
    error,
    isAuthenticated: !!(user && profile),
    logout,
    refresh,
  }
}