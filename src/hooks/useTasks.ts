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

// Tüm görevler hook - cached
export const useTasks = (technicianId?: string) => {
  return useQuery({
    queryKey: ['tasks', 'list', technicianId],
    queryFn: async () => {
      if (!technicianId) throw new Error('Technician ID required')
      
      console.log('🔍 Fetching tasks...', technicianId)
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
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
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
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
    onSuccess: () => {
      // Cache'i güncelle
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}