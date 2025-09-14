import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { EquipmentType } from '@/lib/supabase'

// Equipment tracking list hook with filters and pagination
export const useEquipmentTracking = (filters: {
  search?: string
  equipment_type?: EquipmentType | 'all'
  status?: string
  technician?: string
  limit?: number
  offset?: number
} = {}) => {
  return useQuery({
    queryKey: ['equipment-tracking', 'list', filters],
    queryFn: async () => {
      console.log('🔍 Fetching equipment tracking list...', filters)
      console.log('🔍 Cache key:', ['equipment-tracking', 'list', filters])
      
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.equipment_type && filters.equipment_type !== 'all') params.append('type', filters.equipment_type)
      if (filters.status && filters.status !== 'all') params.append('status', filters.status)
      if (filters.technician && filters.technician !== 'all') params.append('technician', filters.technician)
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.offset) params.append('offset', filters.offset.toString())

      const response = await fetch(`/api/equipment-tracking?${params}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ekipman listesi yüklenemedi')
      }

      const result = await response.json()
      console.log('✅ Equipment tracking fetched:', result.equipment?.length || 0)
      console.log('📊 Statistics in response:', result.statistics)
      
      // Find specific equipment for debugging
      const equipment3301 = result.equipment?.find((e: any) => e.serial_number.endsWith('3301'))
      if (equipment3301) {
        console.log('🔍 Found equipment ending with 3301:', {
          serial: equipment3301.serial_number,
          type: equipment3301.equipment_type,
          status: equipment3301.current_status,
          assigned_to: equipment3301.assigned_technician_name
        })
      }
      
      return {
        equipment: result.equipment || [],
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

// Equipment statistics hook - cached separately for better performance
export const useEquipmentStats = () => {
  return useQuery({
    queryKey: ['equipment-tracking', 'stats'],
    queryFn: async () => {
      console.log('🔍 Fetching equipment statistics...')
      
      const response = await fetch('/api/equipment-tracking?stats_only=true')
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'İstatistikler yüklenemedi')
      }

      const result = await response.json()
      console.log('✅ Equipment stats fetched:', result.statistics)
      
      return result.statistics
    },
    staleTime: 60 * 1000, // 1 dakika fresh
    gcTime: 5 * 60 * 1000, // 5 dakika cache
    retry: 2,
  })
}

// Equipment assign mutation (TaskWizard ve dashboard için)
export const useAssignEquipment = () => {
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
      console.log('🔄 Assigning equipment...', serial_number)

      const response = await fetch('/api/equipment-tracking/assign', {
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
        throw new Error(result.error || result.suggestion || 'Ekipman ataması başarısız')
      }

      console.log('✅ Equipment assigned:', result)
      return result
    },
    onMutate: async (variables) => {
      // Optimistic update - önce cache'i güncelle
      await queryClient.cancelQueries({ queryKey: ['equipment-tracking'] })
      
      // Önceki değeri kaydet (rollback için)
      const previousData = queryClient.getQueryData(['equipment-tracking', 'list'])
      
      return { previousData }
    },
    onSuccess: (data, variables) => {
      console.log('🔄 useAssignEquipment onSuccess - Cache invalidation başlıyor...')
      
      // Cache'leri invalidate et
      queryClient.invalidateQueries({ queryKey: ['equipment-tracking', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['equipment-tracking', 'stats'] })
      
      console.log('✅ Cache invalidated:', ['equipment-tracking', 'list'], ['equipment-tracking', 'stats'])
      
      // Get equipment type from response
      const equipmentType = data.assignment_details?.equipment_type || 'modem'
      
      // Optimistic update - istatistikleri güncelle
      queryClient.setQueryData(['equipment-tracking', 'stats'], (old: any) => {
        if (!old) return old
        console.log('📊 Optimistic stats update - OLD:', old)
        
        const newStats = { ...old }
        
        // Update overall stats
        if (newStats.overall) {
          newStats.overall.available = Math.max(0, (newStats.overall.available || 0) - 1)
          newStats.overall.in_use = (newStats.overall.in_use || 0) + 1
        }
        
        // Update equipment type specific stats
        if (newStats[equipmentType]) {
          newStats[equipmentType].available = Math.max(0, (newStats[equipmentType].available || 0) - 1)
          newStats[equipmentType].in_use = (newStats[equipmentType].in_use || 0) + 1
        }
        
        console.log('📊 Optimistic stats update - NEW:', newStats)
        return newStats
      })
    },
    onError: (error, variables, context) => {
      // Hata durumunda rollback
      if (context?.previousData) {
        queryClient.setQueryData(['equipment-tracking', 'list'], context.previousData)
      }
    }
  })
}

// Equipment update mutation (durum değiştirme)
export const useUpdateEquipment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      equipment_id,
      action,
      notes,
      new_technician_id,
      performed_by
    }: {
      equipment_id: string
      action: string
      notes?: string
      new_technician_id?: string
      performed_by: string
    }) => {
      console.log('🔄 Updating equipment...', equipment_id, action)

      const response = await fetch('/api/equipment-tracking/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_id,
          action,
          notes,
          new_technician_id,
          performed_by
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Ekipman güncellenemedi')
      }

      return result
    },
    onSuccess: () => {
      // Cache'leri invalidate et
      queryClient.invalidateQueries({ queryKey: ['equipment-tracking'] })
    }
  })
}

// Equipment Excel upload mutation
export const useEquipmentExcelUpload = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (formData: FormData) => {
      console.log('📁 Uploading equipment Excel file via FormData...')

      // Validate FormData
      const file = formData.get('file') as File
      if (!file) {
        throw new Error('FormData\'da dosya bulunamadı')
      }
      
      console.log('📁 File in FormData:', file.name, file.size)

      const response = await fetch('/api/equipment-tracking/excel-upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Excel yükleme başarısız')
      }

      return result
    },
    onSuccess: () => {
      // Excel upload sonrası cache'leri invalidate et
      queryClient.invalidateQueries({ queryKey: ['equipment-tracking'] })
    }
  })
}

// Equipment Excel template download mutation
export const useEquipmentExcelDownload = () => {
  return useMutation({
    mutationFn: async () => {
      console.log('📥 Downloading equipment Excel template...')

      const response = await fetch('/api/equipment-tracking/excel-upload')

      if (!response.ok) {
        throw new Error('Şablon indirilemedi')
      }

      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'equipment_tracking_template.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      console.log('✅ Equipment template downloaded')
      return { success: true }
    }
  })
}

// Technician equipment hook (teknisyene atanan ekipmanlar)
export const useTechnicianEquipment = (technicianId: string) => {
  return useQuery({
    queryKey: ['equipment-tracking', 'technician', technicianId],
    queryFn: async () => {
      console.log('🔍 Fetching technician equipment...', technicianId)
      
      const response = await fetch(`/api/equipment-tracking?technician=${technicianId}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Teknisyen ekipmanları yüklenemedi')
      }

      const result = await response.json()
      console.log('✅ Technician equipment fetched:', result.equipment?.length || 0)
      
      return result.equipment || []
    },
    staleTime: 2 * 60 * 1000, // 2 dakika fresh
    gcTime: 10 * 60 * 1000, // 10 dakika cache
    retry: 2,
    enabled: !!technicianId // Only run if technicianId is provided
  })
}

// Backward compatibility - Re-export with old names
export const useModemTracking = useEquipmentTracking
export const useModemStats = useEquipmentStats  
export const useAssignModem = useAssignEquipment
export const useUpdateModem = useUpdateEquipment
export const useModemExcelUpload = useEquipmentExcelUpload
export const useModemExcelDownload = useEquipmentExcelDownload
export const useTechnicianModems = useTechnicianEquipment
