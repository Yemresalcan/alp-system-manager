'use client'

// Service Worker registration
export const registerServiceWorker = () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        console.log('🔧 Registering Service Worker...')
        
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })
        
        console.log('✅ Service Worker registered:', registration.scope)
        
        // Update handling
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 New Service Worker available')
                // Kullanıcıya güncelleme bildirimi göster
                showUpdateNotification()
              }
            })
          }
        })
        
        // Periodic background sync
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
          // @ts-expect-error - Background sync API not in types
          registration.sync?.register('background-sync')
        }
        
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error)
      }
    })
  }
}

// Update notification
const showUpdateNotification = () => {
  if (confirm('Yeni bir sürüm mevcut. Sayfayı yenilemek ister misiniz?')) {
    window.location.reload()
  }
}

// Check if app is running in standalone mode (PWA)
export const isStandalone = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone ||
         document.referrer.includes('android-app://')
}

// Network status monitoring
export const setupNetworkMonitoring = () => {
  if (typeof window !== 'undefined') {
    const updateOnlineStatus = () => {
      const event = new CustomEvent('networkchange', {
        detail: { online: navigator.onLine }
      })
      window.dispatchEvent(event)
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }
}