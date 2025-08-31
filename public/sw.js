// Service Worker for offline caching
const CACHE_NAME = 'alp-sistem-v1'
const STATIC_CACHE = 'alp-sistem-static-v1'

// Cache edilecek static dosyalar
const STATIC_FILES = [
  '/',
  '/favicon.ico',
  '/manifest.json'
]

// API cache stratejisi
const API_CACHE_STRATEGIES = {
  '/api/tasks': 'network-first', // Görevler için network-first
  '/api/inventory': 'cache-first', // Envanter için cache-first
  '/api/files': 'network-first' // Dosyalar için network-first
}

// Install event
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Caching static files...')
        return cache.addAll(STATIC_FILES)
      })
      .then(() => {
        console.log('✅ Static files cached')
        return self.skipWaiting()
      })
  )
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('✅ Service Worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - Smart caching
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Static files
  if (STATIC_FILES.includes(url.pathname)) {
    event.respondWith(handleStaticRequest(request))
    return
  }

  // Default: network first
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  )
})

// API request handler
async function handleApiRequest(request) {
  const url = new URL(request.url)
  const strategy = getApiStrategy(url.pathname)
  
  switch (strategy) {
    case 'cache-first':
      return handleCacheFirst(request)
    case 'network-first':
      return handleNetworkFirst(request)
    default:
      return fetch(request)
  }
}

// Cache first strategy
async function handleCacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      console.log('📦 Cache hit:', request.url)
      
      // Background update
      fetch(request)
        .then(response => {
          if (response.ok) {
            const cache = caches.open(CACHE_NAME)
            cache.then(c => c.put(request, response.clone()))
          }
        })
        .catch(() => {}) // Silent fail for background update
      
      return cachedResponse
    }
    
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.log('❌ Cache first failed:', error)
    return new Response('Offline', { status: 503 })
  }
}

// Network first strategy
async function handleNetworkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
      console.log('🌐 Network response cached:', request.url)
    }
    return response
  } catch (error) {
    console.log('🔄 Network failed, trying cache:', request.url)
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    return new Response('Offline', { status: 503 })
  }
}

// Static file handler
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    return new Response('Offline', { status: 503 })
  }
}

// Get API caching strategy
function getApiStrategy(pathname) {
  for (const [path, strategy] of Object.entries(API_CACHE_STRATEGIES)) {
    if (pathname.startsWith(path)) {
      return strategy
    }
  }
  return 'network-first'
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  // Offline'da yapılan işlemleri senkronize et
  console.log('🔄 Performing background sync...')
}