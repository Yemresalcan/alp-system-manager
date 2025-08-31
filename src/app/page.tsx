'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import LoginForm from '@/components/LoginForm'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const { user, profile, isLoading, isAuthenticated, refresh } = useAuth()

  // Auth state değişikliklerini dinle
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state değişti:', event, session?.user?.email)
      
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Cache'i yenile
        refresh()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [refresh])

  // Loading ekranı - cached verilerle daha hızlı
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2 font-medium">Giriş kontrol ediliyor...</p>
          <p className="text-sm text-gray-500 mb-4">
          
                    </p>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '80%'}}></div>
          </div>
          
          <p className="text-xs text-gray-400">
            
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return <Dashboard user={user!} profile={profile!} />
}