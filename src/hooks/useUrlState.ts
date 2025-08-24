'use client'

import { useState, useEffect, useCallback } from 'react'

export function useUrlState(key: string, defaultValue: string) {
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    // URL'den değeri oku
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const urlValue = urlParams.get(key)
      if (urlValue && urlValue !== value) {
        setValue(urlValue)
      }
    }
  }, [key, value])

  const setUrlValue = useCallback((newValue: string) => {
    if (newValue === value) return // Aynı değerse hiçbir şey yapma
    
    setValue(newValue)
    
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set(key, newValue)
      
      // History API kullanarak sayfa yenilemeyi önle
      window.history.replaceState({}, '', url.toString())
      
      // Kısa bir süre sonra yenile (loop'u önlemek için)
      setTimeout(() => {
        window.location.reload()
      }, 50)
    }
  }, [key, value])

  return [value, setUrlValue] as const
}
