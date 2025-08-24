'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { getCityInfo } from '@/lib/cities'
import { 
  File, 
  Download, 
  Trash2, 
  Eye,
  Calendar,
  User,
  FileText,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen
} from 'lucide-react'

interface FileRecord {
  id: string
  technician_id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  uploaded_at: string
}

interface TechnicianWithFiles {
  id: string
  full_name: string
  email: string
  city: string
  files: FileRecord[]
  fileCount: number
}

interface TechnicianFileGroupsProps {
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

export default function TechnicianFileGroups({ onToast }: TechnicianFileGroupsProps) {
  const [techniciansWithFiles, setTechniciansWithFiles] = useState<TechnicianWithFiles[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedTechnicians, setExpandedTechnicians] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  const loadTechniciansWithFiles = async () => {
    try {
      setLoading(true)
      
      // Önce tekniksyenleri al
      const { data: technicians, error: techError } = await supabase
        .from('profiles')
        .select('id, full_name, email, city')
        .eq('role', 'technician')
        .order('full_name')

      if (techError) throw techError

      // Sonra tüm dosyaları al
      const { data: files, error: filesError } = await supabase
        .from('technician_files')
        .select('*')
        .order('uploaded_at', { ascending: false })

      if (filesError) throw filesError

      // Tekniksyenleri dosyalarıyla grupla
      const techniciansWithFiles = (technicians || []).map(tech => {
        const techFiles = (files || []).filter(file => file.technician_id === tech.id)
        return {
          ...tech,
          files: techFiles,
          fileCount: techFiles.length
        }
      })

      // Dosyası olan tekniksyenleri öne al
      const sorted = techniciansWithFiles.sort((a, b) => {
        if (a.fileCount === 0 && b.fileCount > 0) return 1
        if (a.fileCount > 0 && b.fileCount === 0) return -1
        return b.fileCount - a.fileCount // Dosya sayısına göre sırala
      })

      setTechniciansWithFiles(sorted)
    } catch (error: any) {
      console.error('Tekniksyen dosyaları yüklenirken hata:', error)
      onToast('error', 'Hata', 'Dosyalar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTechniciansWithFiles()
  }, [])

  const toggleTechnician = (technicianId: string) => {
    const newExpanded = new Set(expandedTechnicians)
    if (newExpanded.has(technicianId)) {
      newExpanded.delete(technicianId)
    } else {
      newExpanded.add(technicianId)
    }
    setExpandedTechnicians(newExpanded)
  }

  const handleView = async (file: FileRecord) => {
    try {
      const { data, error } = await supabase.storage
        .from('technician-files')
        .createSignedUrl(file.file_path, 60) // 60 saniye geçerli URL

      if (error) throw error

      // Yeni sekmede aç
      window.open(data.signedUrl, '_blank')
      
      onToast('success', 'Açıldı', `${file.file_name} dosyası görüntüleniyor`)
    } catch (error: any) {
      console.error('Görüntüleme hatası:', error)
      onToast('error', 'Görüntüleme Hatası', 'Dosya görüntülenemedi')
    }
  }

  const handleDownload = async (file: FileRecord) => {
    try {
      const { data, error } = await supabase.storage
        .from('technician-files')
        .download(file.file_path)

      if (error) throw error

      const url = window.URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      onToast('success', 'İndirildi', `${file.file_name} dosyası indirildi`)
    } catch (error: any) {
      console.error('İndirme hatası:', error)
      onToast('error', 'İndirme Hatası', 'Dosya indirilemedi')
    }
  }

  const handleDelete = async (file: FileRecord) => {
    if (!confirm(`${file.file_name} dosyasını silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      // Veritabanından sil
      const { error: dbError } = await supabase
        .from('technician_files')
        .delete()
        .eq('id', file.id)

      if (dbError) throw dbError

      // Storage'dan sil
      const { error: storageError } = await supabase.storage
        .from('technician-files')
        .remove([file.file_path])

      if (storageError) {
        console.warn('Storage silme uyarısı:', storageError)
      }

      onToast('success', 'Silindi', `${file.file_name} dosyası silindi`)
      
      // Listeyi yenile
      loadTechniciansWithFiles()
    } catch (error: any) {
      console.error('Silme hatası:', error)
      onToast('error', 'Silme Hatası', 'Dosya silinemedi')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredTechnicians = techniciansWithFiles.filter(tech =>
    tech.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tech.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Yükleniyor...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Arama */}
      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Tekniksyen ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredTechnicians.length} tekniksyen
        </div>
      </div>

      {/* Tekniksyen Grupları */}
      <div className="space-y-4">
        {filteredTechnicians.map((technician) => {
          const isExpanded = expandedTechnicians.has(technician.id)
          const cityInfo = getCityInfo(technician.city)
          
          return (
            <div key={technician.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
              {/* Tekniksyen Header */}
              <div
                onClick={() => toggleTechnician(technician.id)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {isExpanded ? (
                    <FolderOpen className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Folder className="h-5 w-5 text-gray-600" />
                  )}
                  <div className="flex items-center space-x-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-600" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{technician.full_name}</h3>
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                      <span>{technician.email}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${cityInfo.badgeColor}`}>
                        {cityInfo.icon} {cityInfo.name}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    technician.fileCount > 0 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {technician.fileCount} dosya
                  </span>
                </div>
              </div>

              {/* Dosya Listesi */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  {technician.files.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>Henüz dosya yüklenmemiş</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-3">
                      {technician.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <File className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium text-gray-900">{file.file_name}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span>{formatFileSize(file.file_size)}</span>
                                <span className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {formatDate(file.uploaded_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => handleView(file)}
                              variant="outline"
                              size="sm"
                              className="text-green-600 hover:bg-green-50 border-green-200"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleDownload(file)}
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:bg-blue-50 border-blue-200"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(file)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 border-red-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredTechnicians.length === 0 && (
        <div className="text-center py-12">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Tekniksyen bulunamadı
          </h3>
          <p className="text-gray-600">
            Arama kriterlerinize uygun tekniksyen bulunmuyor.
          </p>
        </div>
      )}
    </div>
  )
}
