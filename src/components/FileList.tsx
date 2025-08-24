'use client'

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { 
  File, 
  Image, 
  FileText, 
  Archive, 
  Download, 
  Trash2, 
  Eye,
  Calendar,
  User,
  Tag,
  Search,
  Filter,
  ExternalLink
} from 'lucide-react'

interface TechnicianFile {
  id: string
  technician_id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  category: string
  description?: string
  uploaded_at: string
  uploaded_by: string
  is_active: boolean
  technician?: {
    full_name: string
  }
}

interface FileListProps {
  technicianId?: string // Eğer belirtilirse sadece o tekniksyenin dosyaları
  showTechnicianName?: boolean // Admin panelinde tekniksyen adını göster
  refreshTrigger?: number
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

const FILE_CATEGORIES = {
  'report': { label: 'Rapor', icon: FileText, color: 'bg-blue-100 text-blue-800' },
  'invoice': { label: 'Fatura', icon: File, color: 'bg-green-100 text-green-800' },
  'photo': { label: 'Fotoğraf', icon: Image, color: 'bg-purple-100 text-purple-800' },
  'document': { label: 'Döküman', icon: FileText, color: 'bg-yellow-100 text-yellow-800' },
  'other': { label: 'Diğer', icon: Archive, color: 'bg-gray-100 text-gray-800' }
}

function FileList({ 
  technicianId, 
  showTechnicianName = false, 
  refreshTrigger = 0,
  onToast 
}: FileListProps) {
  const [files, setFiles] = useState<TechnicianFile[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date')

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('technician_files')
        .select(`
          *,
          technician:profiles!technician_id(full_name)
        `)
        .eq('is_active', true)

      if (technicianId) {
        query = query.eq('technician_id', technicianId)
      }

      const { data, error } = await query.order('uploaded_at', { ascending: false })

      if (error) throw error
      setFiles(data || [])
    } catch (error) {
      console.error('Dosyalar yüklenirken hata:', error)
      // onToast dependency'sini kaldırdık
    } finally {
      setLoading(false)
    }
  }, [technicianId])

  useEffect(() => {
    fetchFiles()
  }, [technicianId, refreshTrigger]) // Sadece gerçek dependency'ler

  const handleDownload = async (file: TechnicianFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('technician-files')
        .download(file.file_path)

      if (error) throw error

      // Blob'u indirme linki oluştur
      const url = window.URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.file_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      onToast('success', 'İndirme Başarılı', `${file.file_name} indirildi.`)
    } catch (error: any) {
      console.error('İndirme hatası:', error)
      onToast('error', 'İndirme Hatası', 'Dosya indirilemedi.')
    }
  }

  const handleView = async (file: TechnicianFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('technician-files')
        .createSignedUrl(file.file_path, 3600) // 1 saat geçerli

      if (error) throw error

      // Yeni sekmede aç
      window.open(data.signedUrl, '_blank')
      onToast('success', 'Dosya Açıldı', `${file.file_name} yeni sekmede açıldı.`)
    } catch (error: any) {
      console.error('Görüntüleme hatası:', error)
      onToast('error', 'Görüntüleme Hatası', 'Dosya görüntülenemedi.')
    }
  }

  const handleDelete = async (file: TechnicianFile) => {
    if (!confirm(`${file.file_name} dosyasını silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      // Database'den sil
      const { error: dbError } = await supabase
        .from('technician_files')
        .update({ is_active: false })
        .eq('id', file.id)

      if (dbError) throw dbError

      // Storage'dan sil
      const { error: storageError } = await supabase.storage
        .from('technician-files')
        .remove([file.file_path])

      if (storageError) {
        console.warn('Storage silme uyarısı:', storageError)
        // Storage silme hatası önemli değil, DB'de inactive olarak işaretlendi
      }

      onToast('success', 'Dosya Silindi', `${file.file_name} başarıyla silindi.`)
      fetchFiles() // Listeyi yenile
    } catch (error: any) {
      console.error('Silme hatası:', error)
      onToast('error', 'Silme Hatası', 'Dosya silinirken bir hata oluştu.')
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

  // Memoized filtreleme ve sıralama
  const filteredFiles = useMemo(() => {
    let result = files

    // Filtreleme
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      result = result.filter(file => 
        file.file_name.toLowerCase().includes(search) ||
        file.description?.toLowerCase().includes(search)
      )
    }

    if (categoryFilter !== 'all') {
      result = result.filter(file => file.category === categoryFilter)
    }

    // Sıralama
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.file_name.localeCompare(b.file_name)
        case 'size':
          return b.file_size - a.file_size
        case 'date':
        default:
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      }
    })

    return result
  }, [files, searchTerm, categoryFilter, sortBy])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Arama ve Filtreler */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Dosya ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">Tüm Kategoriler</option>
          {Object.entries(FILE_CATEGORIES).map(([key, cat]) => (
            <option key={key} value={key}>{cat.label}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'size')}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="date">Tarihe Göre</option>
          <option value="name">İsme Göre</option>
          <option value="size">Boyuta Göre</option>
        </select>
      </div>

      {/* Dosya Listesi */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || categoryFilter !== 'all' ? 'Dosya Bulunamadı' : 'Henüz Dosya Yok'}
          </h3>
          <p className="text-gray-600">
            {searchTerm || categoryFilter !== 'all' 
              ? 'Arama kriterlerinize uygun dosya bulunamadı.' 
              : 'Henüz hiç dosya yüklenmemiş.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredFiles.map((file) => {
            const category = FILE_CATEGORIES[file.category as keyof typeof FILE_CATEGORIES] || FILE_CATEGORIES.other
            const IconComponent = category.icon

            return (
              <div key={file.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <IconComponent className="h-8 w-8 text-gray-500" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-medium text-gray-900 truncate">
                        {file.file_name}
                      </h4>
                      
                      {file.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {file.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(file.uploaded_at)}
                        </div>
                        
                        <div className="flex items-center">
                          <Archive className="h-4 w-4 mr-1" />
                          {formatFileSize(file.file_size)}
                        </div>

                        {showTechnicianName && file.technician && (
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {file.technician.full_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 ml-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${category.color}`}>
                      {category.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => handleView(file)}
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Görüntüle
                  </Button>

                  <Button
                    onClick={() => handleDownload(file)}
                    size="sm"
                    variant="outline"
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    İndir
                  </Button>
                  
                  <Button
                    onClick={() => handleDelete(file)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Sil
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Toplam Bilgi */}
      {filteredFiles.length > 0 && (
        <div className="text-sm text-gray-500 text-center pt-4 border-t border-gray-200">
          Toplam {filteredFiles.length} dosya • {
            filteredFiles.reduce((total, file) => total + file.file_size, 0) > 0 
              ? formatFileSize(filteredFiles.reduce((total, file) => total + file.file_size, 0))
              : '0 Bytes'
          }
        </div>
      )}
    </div>
  )
}

export default memo(FileList)
