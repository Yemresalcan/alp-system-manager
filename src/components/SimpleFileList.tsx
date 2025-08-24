'use client'

import { useState, useEffect, memo } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { 
  File, 
  Download, 
  Trash2, 
  Eye,
  Calendar,
  User,
  FileText
} from 'lucide-react'

interface FileRecord {
  id: string
  technician_id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  uploaded_at: string
  technician_name?: string
}

interface SimpleFileListProps {
  technicianId?: string // Sadece bir tekniksyenin dosyaları
  showTechnicianName?: boolean // Admin paneli için
  refreshTrigger?: number
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

function SimpleFileList({ 
  technicianId, 
  showTechnicianName = false,
  refreshTrigger = 0,
  onToast 
}: SimpleFileListProps) {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(false)

  // RADIKAL ÇÖZÜM: useEffect'i basitleştir, dependency yok
  const loadFiles = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('technician_files')
        .select(`
          id,
          technician_id,
          file_name,
          file_path,
          file_size,
          file_type,
          uploaded_at,
          profiles:technician_id (full_name)
        `)
        .order('uploaded_at', { ascending: false })

      // Sadece belirli tekniksyenin dosyaları
      if (technicianId) {
        query = query.eq('technician_id', technicianId)
      }

      const { data, error } = await query

      if (error) throw error

      // Veriyi düzenle
      const formattedFiles = (data || []).map(file => ({
        ...file,
        technician_name: (file.profiles as any)?.full_name || 'Bilinmiyor'
      }))

      setFiles(formattedFiles)
    } catch (error: any) {
      console.error('Dosyalar yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [technicianId, refreshTrigger])

  // Dosya görüntüle
  const viewFile = async (file: FileRecord) => {
    try {
      const { data, error } = await supabase.storage
        .from('technician-files')
        .createSignedUrl(file.file_path, 3600) // 1 saat geçerli

      if (error) throw error

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      } else {
        throw new Error('Dosya URL\'si alınamadı')
      }
    } catch (error: any) {
      onToast('error', 'Görüntüleme Hatası', error.message)
    }
  }

  // Dosya indir
  const downloadFile = async (file: FileRecord) => {
    try {
      const { data, error } = await supabase.storage
        .from('technician-files')
        .download(file.file_path)

      if (error) throw error

      // Blob'u dosya olarak indir
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      onToast('success', 'İndirildi', `${file.file_name} başarıyla indirildi`)
    } catch (error: any) {
      onToast('error', 'İndirme Hatası', error.message)
    }
  }

  // Dosya sil
  const deleteFile = async (file: FileRecord) => {
    if (!confirm(`${file.file_name} dosyasını silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      // Storage'dan sil
      const { error: storageError } = await supabase.storage
        .from('technician-files')
        .remove([file.file_path])

      if (storageError) throw storageError

      // Database'den sil
      const { error: dbError } = await supabase
        .from('technician_files')
        .delete()
        .eq('id', file.id)

      if (dbError) throw dbError

      onToast('success', 'Silindi', `${file.file_name} başarıyla silindi`)
      loadFiles() // Listeyi yenile
    } catch (error: any) {
      onToast('error', 'Silme Hatası', error.message)
    }
  }

  // Dosya boyutunu formatla
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Dosya türü ikonu
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return '🖼️'
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word')) return '📝'
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊'
    return '📁'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Dosyalar yükleniyor...</span>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Henüz dosya yok
        </h3>
        <p className="text-gray-600">
          {technicianId ? 'Bu tekniksyene ait dosya bulunmuyor' : 'Sistemde hiç dosya yok'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Başlık */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Dosyalar ({files.length})
        </h3>
      </div>

      {/* Dosya Listesi */}
      <div className="grid gap-4">
        {files.map((file) => (
          <div
            key={file.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {/* Dosya İkonu */}
                <div className="text-2xl">
                  {getFileIcon(file.file_type)}
                </div>
                
                {/* Dosya Bilgileri */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {file.file_name}
                  </h4>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                    <span className="flex items-center">
                      <File className="h-3 w-3 mr-1" />
                      {formatFileSize(file.file_size)}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(file.uploaded_at).toLocaleDateString('tr-TR')}
                    </span>
                    {showTechnicianName && (
                      <span className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {file.technician_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Aksiyonlar */}
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  onClick={() => viewFile(file)}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => downloadFile(file)}
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => deleteFile(file)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default memo(SimpleFileList)
