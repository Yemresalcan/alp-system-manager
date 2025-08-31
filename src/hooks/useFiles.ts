'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Teknisyen dosyaları hook - cached
export const useTechnicianFiles = (technicianId?: string) => {
  return useQuery({
    queryKey: ['files', 'technician', technicianId],
    queryFn: async () => {
      if (!technicianId) throw new Error('Technician ID required')
      
      console.log('🔍 Fetching technician files...', technicianId)
      const { data, error } = await supabase
        .from('technician_files')
        .select('*')
        .eq('technician_id', technicianId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Files fetch error:', error)
        throw error
      }

      console.log('✅ Files fetched:', data?.length || 0)
      return data || []
    },
    enabled: !!technicianId,
    staleTime: 3 * 60 * 1000, // 3 dakika fresh
    gcTime: 10 * 60 * 1000, // 10 dakika cache
  })
}

// Dosya yükleme mutation
export const useUploadFile = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ file, technicianId }: { file: File, technicianId: string }) => {
      console.log('🔄 Uploading file...', file.name)
      
      // Dosyayı storage'a yükle
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `technician-files/${technicianId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file)

      if (uploadError) {
        console.error('❌ File upload error:', uploadError)
        throw uploadError
      }

      // Database'e kayıt ekle
      const { data, error } = await supabase
        .from('technician_files')
        .insert([{
          technician_id: technicianId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: technicianId
        }])
        .select()
        .single()

      if (error) {
        console.error('❌ File record creation error:', error)
        throw error
      }

      console.log('✅ File uploaded:', data.id)
      return data
    },
    onSuccess: (data) => {
      // Cache'i güncelle
      queryClient.invalidateQueries({ 
        queryKey: ['files', 'technician', data.technician_id] 
      })
    },
  })
}

// Dosya silme mutation
export const useDeleteFile = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ fileId, filePath, technicianId }: { 
      fileId: string, 
      filePath: string, 
      technicianId: string 
    }) => {
      console.log('🔄 Deleting file...', fileId)
      
      // Storage'dan sil
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([filePath])

      if (storageError) {
        console.warn('⚠️ Storage delete error:', storageError)
      }

      // Database'den sil
      const { error } = await supabase
        .from('technician_files')
        .delete()
        .eq('id', fileId)

      if (error) {
        console.error('❌ File delete error:', error)
        throw error
      }

      console.log('✅ File deleted:', fileId)
      return { fileId, technicianId }
    },
    onSuccess: (data) => {
      // Cache'i güncelle
      queryClient.invalidateQueries({ 
        queryKey: ['files', 'technician', data.technicianId] 
      })
    },
  })
}