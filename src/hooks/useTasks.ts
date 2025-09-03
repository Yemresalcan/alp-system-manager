'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { taskAPI } from '@/lib/api-client'

// Günlük görev sayısı hook - cached
export const useTodayTaskCount = (technicianId?: string) => {
  return useQuery({
    queryKey: ['tasks', 'today-count', technicianId],
    queryFn: async () => {
      if (!technicianId) throw new Error('Technician ID required')

      console.log('🔍 Fetching today task count...', technicianId)
      const today = new Date().toISOString().split('T')[0]

      try {
        // Önce API'yi dene
        const result = await taskAPI.getTasks({
          technician_id: technicianId,
          date: today
        })

        console.log('✅ Task count from API:', result.data?.length || 0)
        return result.data?.length || 0
      } catch (apiError) {
        console.warn('⚠️ API failed, using Supabase:', apiError)

        // API başarısız olursa Supabase
        const { count, error } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('technician_id', technicianId)
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59`)

        if (error) {
          console.error('❌ Supabase task count error:', error)
          throw error
        }

        console.log('✅ Task count from Supabase:', count || 0)
        return count || 0
      }
    },
    enabled: !!technicianId,
    staleTime: 2 * 60 * 1000, // 2 dakika fresh
    gcTime: 5 * 60 * 1000, // 5 dakika cache
    retry: 2,
    refetchInterval: 5 * 60 * 1000, // 5 dakikada bir otomatik refresh
  })
}

// Tüm görevler hook - cached (fotoğraflarla birlikte)
export const useTasks = (technicianId?: string) => {
  return useQuery({
    queryKey: ['tasks', 'list', technicianId],
    queryFn: async () => {
      if (!technicianId) throw new Error('Technician ID required')

      console.log('🔍 Fetching tasks with photos...', technicianId)
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          task_photos (
            id,
            photo_url,
            file_name,
            description
          )
        `)
        .eq('technician_id', technicianId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Tasks fetch error:', error)
        throw error
      }

      console.log('✅ Tasks fetched:', data?.length || 0)
      return data || []
    },
    enabled: !!technicianId,
    staleTime: 3 * 60 * 1000, // 3 dakika fresh
    gcTime: 10 * 60 * 1000, // 10 dakika cache
  })
}

// Yeni görev oluşturma mutation
export const useCreateTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskData: any) => {
      console.log('🔄 Creating new task...', taskData)

      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single()

      if (error) {
        console.error('❌ Task creation error:', error)
        throw error
      }

      console.log('✅ Task created:', data.id)
      return data
    },
    onSuccess: (data) => {
      // Cache'i güncelle
      queryClient.invalidateQueries({ queryKey: ['tasks'] })

      // Optimistic update için today count'u artır
      const technicianId = data.technician_id
      queryClient.setQueryData(
        ['tasks', 'today-count', technicianId],
        (old: number = 0) => old + 1
      )
    },
  })
}

// Görev güncelleme mutation
export const useUpdateTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string, updates: any }) => {
      console.log('🔄 Updating task...', taskId, updates)

      // photo_added alanını API'ye göndermeden önce kaldır
      const { photo_added, ...apiUpdates } = updates

      const { data, error } = await supabase
        .from('tasks')
        .update(apiUpdates)
        .eq('id', taskId)
        .select()
        .single()

      if (error) {
        console.error('❌ Task update error:', error)
        throw error
      }

      console.log('✅ Task updated:', data.id)
      return data
    },
    onSuccess: (data) => {
      // Cache'i güncelle - daha spesifik invalidation
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] })

      // Optimistic update - task listesini güncelle
      const technicianId = data.technician_id
      queryClient.setQueryData(['tasks', 'list', technicianId], (old: any[]) => {
        if (!old) return old
        return old.map(task => task.id === data.id ? data : task)
      })
    },
  })
}

// Görev silme mutation (Admin için)
export const useDeleteTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      console.log('🗑️ Deleting task...', taskId)

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) {
        console.error('❌ Task delete error:', error)
        throw error
      }

      console.log('✅ Task deleted:', taskId)
      return taskId
    },
    onSuccess: (taskId) => {
      // Cache'i güncelle
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] })

      // Optimistic update - task'ı listeden kaldır
      queryClient.setQueriesData({ queryKey: ['tasks'] }, (old: any) => {
        if (Array.isArray(old)) {
          return old.filter(task => task.id !== taskId)
        }
        return old
      })
    },
  })
}

// Admin görevleri hook - cached
export const useAdminTasks = (filters: {
  date?: string
  technician_id?: string
  status?: string
  task_type?: string
} = {}) => {
  return useQuery({
    queryKey: ['admin-tasks', filters],
    queryFn: async () => {
      console.log('🔍 Fetching admin tasks...', filters)

      let query = supabase
        .from('tasks')
        .select(`
          *,
          profiles!tasks_technician_id_fkey (
            id,
            full_name,
            email,
            phone
          ),
          task_photos (
            id,
            photo_url,
            file_name,
            description
          )
        `)
        .order('created_at', { ascending: false })

      // Filtreleri uygula
      if (filters.date) {
        const startDate = `${filters.date}T00:00:00`
        const endDate = `${filters.date}T23:59:59`
        query = query.gte('created_at', startDate).lte('created_at', endDate)
      }

      if (filters.technician_id) {
        query = query.eq('technician_id', filters.technician_id)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.task_type) {
        query = query.eq('task_type', filters.task_type)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Admin tasks fetch error:', error)
        throw error
      }

      console.log('✅ Admin tasks fetched:', data?.length || 0)
      return data || []
    },
    staleTime: 2 * 60 * 1000, // 2 dakika fresh
    gcTime: 5 * 60 * 1000, // 5 dakika cache
    retry: 2,
  })
}