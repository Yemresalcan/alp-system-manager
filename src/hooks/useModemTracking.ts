'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Modem tracking list hook - cached
export const useModemTracking = (filters: {
  search?: string
  status?: string
  technician?: string
  limit?: number
  offset?: number
} = {}) => {
  return useQuery({
    queryKey: ['modem-tracking', 'list', filters],
    queryFn: async () => {
      console.log('🔍 Fetching modem tracking list...', filters)
      console.log('🔍 Cache key:', ['modem-tracking', 'list', filters])
      
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.status && filters.status !== 'all') params.append('status', filters.status)
      if (filters.technician && filters.technician !== 'all') params.append('technician', filters.technician)
      params.append('limit', String(filters.limit || 50))
      params.append('offset', String(filters.offset || 0))

      const response = await fetch(`/api/modem-tracking?${params}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Modem listesi yüklenemedi')
      }

      const result = await response.json()
      console.log('✅ Modem tracking fetched:', result.modems?.length || 0)
      console.log('📊 Statistics in response:', result.statistics)
      
      // Specific modem'i de kontrol edelim
      const modem3301 = result.modems?.find((m: any) => m.modem_serial_number.endsWith('3301'))
      if (modem3301) {
        console.log('🔍 Found modem ending with 3301:', {
          serial: modem3301.modem_serial_number,
          status: modem3301.current_status,
          assigned_to: modem3301.assigned_technician_name
        })
      }
      
      return {
        modems: result.modems || [],
        total: result.total || 0,
        statistics: result.statistics,
        filters: result.filters
      }
    },
    staleTime: 0, // Always fetch fresh data for debugging
    gcTime: 5 * 60 * 1000, // 5 dakika cache
    retry: 2,
    refetchOnWindowFocus: true, // Pencere odaklandığında yenile
  })
}

// Modem statistics hook - cached separately for better performance
export const useModemStats = () => {
  return useQuery({
    queryKey: ['modem-tracking', 'stats'],
    queryFn: async () => {
      console.log('🔍 Fetching modem statistics...')
      
      const response = await fetch('/api/modem-tracking?stats_only=true')
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'İstatistikler yüklenemedi')
      }

      const result = await response.json()
      console.log('✅ Modem stats fetched:', result.statistics)
      
      return result.statistics
    },
    staleTime: 60 * 1000, // 1 dakika fresh
    gcTime: 5 * 60 * 1000, // 5 dakika cache
    retry: 2,
  })
}

// Modem assign mutation (TaskWizard ve dashboard için)
export const useAssignModem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      serial_number,
      technician_id,
      assigned_by,
      task_type,
      service_number,
      location,
      notes
    }: {
      serial_number: string
      technician_id: string
      assigned_by: string
      task_type: string
      service_number?: string
      location?: string
      notes?: string
    }) => {
      console.log('🔄 Assigning modem...', serial_number)

      const response = await fetch('/api/modem-tracking/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial_number,
          technician_id,
          assigned_by,
          task_type,
          service_number,
          location,
          notes
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.suggestion || 'Modem ataması başarısız')
      }

      console.log('✅ Modem assigned:', result)
      return result
    },
    onMutate: async (variables) => {
      // Optimistic update - önce cache'i güncelle
      await queryClient.cancelQueries({ queryKey: ['modem-tracking'] })
      
      // Önceki değeri kaydet (rollback için)
      const previousData = queryClient.getQueryData(['modem-tracking', 'list'])
      
      return { previousData }
    },
    onSuccess: (data, variables) => {
      console.log('🔄 useAssignModem onSuccess - Cache invalidation başlıyor...')
      
      // Cache'leri invalidate et
      queryClient.invalidateQueries({ queryKey: ['modem-tracking', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['modem-tracking', 'stats'] })
      
      console.log('✅ Cache invalidated:', ['modem-tracking', 'list'], ['modem-tracking', 'stats'])
      
      // Optimistic update - istatistikleri güncelle
      queryClient.setQueryData(['modem-tracking', 'stats'], (old: any) => {
        if (!old) return old
        console.log('📊 Optimistic stats update - OLD:', old)
        const newStats = {
          ...old,
          available: Math.max(0, old.available - 1),
          in_use: old.in_use + 1
        }
        console.log('📊 Optimistic stats update - NEW:', newStats)
        return newStats
      })
    },
    onError: (error, variables, context) => {
      // Hata durumunda rollback
      if (context?.previousData) {
        queryClient.setQueryData(['modem-tracking', 'list'], context.previousData)
      }
    }
  })
}

// Modem update mutation (durum değiştirme)
export const useUpdateModem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      modem_id,
      action,
      notes,
      new_technician_id,
      performed_by
    }: {
      modem_id: string
      action: string
      notes?: string
      new_technician_id?: string
      performed_by: string
    }) => {
      console.log('🔄 Updating modem...', modem_id, action)

      const response = await fetch('/api/modem-tracking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modem_id,
          action,
          notes,
          new_technician_id,
          performed_by
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Modem güncelleme başarısız')
      }

      console.log('✅ Modem updated:', result)
      return result
    },
    onMutate: async (variables) => {
      // Optimistic update için önce queries'leri iptal et
      await queryClient.cancelQueries({ queryKey: ['modem-tracking'] })
      
      const previousData = queryClient.getQueryData(['modem-tracking', 'list'])
      
      return { previousData }
    },
    onSuccess: (data, variables) => {
      // Cache'leri invalidate et
      queryClient.invalidateQueries({ queryKey: ['modem-tracking', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['modem-tracking', 'stats'] })
      
      // İstatistikleri optimistic update
      queryClient.setQueryData(['modem-tracking', 'stats'], (old: any) => {
        if (!old) return old
        
        const updatedStats = { ...old }
        
        // Action'a göre istatistikleri güncelle
        switch (variables.action) {
          case 'return':
            if (old.in_use > 0) updatedStats.in_use -= 1
            updatedStats.returned += 1
            break
          case 'make_available':
            if (old.in_use > 0) updatedStats.in_use -= 1
            updatedStats.available += 1
            break
          case 'mark_lost':
            if (old.in_use > 0) updatedStats.in_use -= 1
            updatedStats.lost += 1
            break
          case 'mark_damaged':
            if (old.in_use > 0) updatedStats.in_use -= 1
            updatedStats.damaged += 1
            break
        }
        
        return updatedStats
      })
    },
    onError: (error, variables, context) => {
      // Rollback
      if (context?.previousData) {
        queryClient.setQueryData(['modem-tracking', 'list'], context.previousData)
      }
    }
  })
}

// Excel upload mutation
export const useModemExcelUpload = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (formData: FormData) => {
      console.log('📤 Uploading modem Excel...')

      const response = await fetch('/api/modem-tracking/excel-upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Excel yükleme başarısız')
      }

      console.log('✅ Excel uploaded:', result)
      return result
    },
    onSuccess: (data) => {
      // Tüm cache'leri invalidate et
      queryClient.invalidateQueries({ queryKey: ['modem-tracking'] })
      
      console.log('🔄 Cache invalidated after Excel upload')
    },
    onError: (error) => {
      console.error('❌ Excel upload mutation failed:', error)
    }
  })
}

// Excel template download mutation
export const useModemExcelDownload = () => {
  return useMutation({
    mutationFn: async () => {
      console.log('📥 Downloading modem Excel template...')

      const response = await fetch('/api/modem-tracking/excel-upload', {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Template indirilemedi')
      }

      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'modem_tracking_template.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      console.log('✅ Excel template downloaded')
      return { success: true }
    },
    onError: (error) => {
      console.error('❌ Excel template download failed:', error)
    }
  })
}

// Teknisyen modem listesi hook (teknisyen dashboard için)
export const useTechnicianModems = (technicianId?: string) => {
  return useQuery({
    queryKey: ['modem-tracking', 'technician', technicianId],
    queryFn: async () => {
      if (!technicianId) throw new Error('Technician ID required')
      
      console.log('🔍 Fetching technician modems...', technicianId)
      
      const response = await fetch(`/api/modem-tracking/assign?technician_id=${technicianId}&status=in_use`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Teknisyen modemleri yüklenemedi')
      }

      const result = await response.json()
      console.log('✅ Technician modems fetched:', result.modems?.length || 0)
      
      return result.modems || []
    },
    enabled: !!technicianId,
    staleTime: 2 * 60 * 1000, // 2 dakika fresh
    gcTime: 10 * 60 * 1000, // 10 dakika cache
  })
}
