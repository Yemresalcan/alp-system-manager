'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Teknisyen envanteri hook - cached
export const useTechnicianInventory = (technicianId?: string) => {
  return useQuery({
    queryKey: ['inventory', 'technician', technicianId],
    queryFn: async () => {
      if (!technicianId) throw new Error('Technician ID required')
      
      console.log('🔍 Fetching technician inventory...', technicianId)
      const { data, error } = await supabase
        .from('technician_inventory')
        .select(`
          *,
          inventory_items (
            id,
            name,
            description,
            category,
            brand,
            model,
            unit_type
          )
        `)
        .eq('technician_id', technicianId)
        .eq('status', 'assigned')
        .order('assigned_date', { ascending: false })

      if (error) {
        console.error('❌ Inventory fetch error:', error)
        throw error
      }

      console.log('✅ Inventory fetched:', data?.length || 0)
      return data || []
    },
    enabled: !!technicianId,
    staleTime: 5 * 60 * 1000, // 5 dakika fresh
    gcTime: 15 * 60 * 1000, // 15 dakika cache
  })
}

// Envanter güncelleme mutation
export const useUpdateInventoryAssignment = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      assignmentId, 
      updates, 
      technicianId 
    }: { 
      assignmentId: string, 
      updates: any, 
      technicianId: string 
    }) => {
      console.log('🔄 Updating inventory assignment...', assignmentId)
      
      const { data, error } = await supabase
        .from('technician_inventory')
        .update(updates)
        .eq('id', assignmentId)
        .select()
        .single()

      if (error) {
        console.error('❌ Inventory update error:', error)
        throw error
      }

      console.log('✅ Inventory updated:', data.id)
      return { data, technicianId }
    },
    onSuccess: (result) => {
      // Cache'i güncelle
      queryClient.invalidateQueries({ 
        queryKey: ['inventory', 'technician', result.technicianId] 
      })
    },
  })
}

// Tüm envanter öğeleri hook - cached
export const useInventoryItems = () => {
  return useQuery({
    queryKey: ['inventory', 'items'],
    queryFn: async () => {
      console.log('🔍 Fetching all inventory items...')
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('status', 'available')
        .order('name')

      if (error) {
        console.error('❌ Inventory items fetch error:', error)
        throw error
      }

      console.log('✅ Inventory items fetched:', data?.length || 0)
      return data || []
    },
    staleTime: 10 * 60 * 1000, // 10 dakika fresh
    gcTime: 30 * 60 * 1000, // 30 dakika cache
  })
}