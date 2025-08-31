'use client'

import { useEffect } from 'react'
import { registerServiceWorker, setupNetworkMonitoring } from '@/lib/serviceWorker'

export default function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Service Worker'ı register et
    registerServiceWorker()
    
    // Network monitoring setup
    const cleanup = setupNetworkMonitoring()
    
    return cleanup
  }, [])

  return <>{children}</>
}