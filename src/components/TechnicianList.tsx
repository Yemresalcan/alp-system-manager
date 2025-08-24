'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import TechnicianEditForm from './TechnicianEditForm'
import ConfirmDialog from './ConfirmDialog'
import TechnicianFilesModal from './TechnicianFilesModal'
import { getCityInfo, getCityStats, getCityOptions } from '@/lib/cities'
import { User, Phone, Mail, MapPin, Calendar, MoreVertical, Edit, Trash2, FileText, BarChart3, FolderOpen, Filter } from 'lucide-react'

interface Technician {
  id: string
  email: string
  full_name: string
  phone?: string
  city: string
  created_at: string
  technician_details?: {
    address?: string
    specialization?: string
    status: string
    notes?: string
  }
  _count?: {
    files: number
    tasks: number
  }
}

interface TechnicianListProps {
  onAddTechnician: () => void
  refreshTrigger: number
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

function TechnicianList({ onAddTechnician, refreshTrigger, onToast }: TechnicianListProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null)
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null)
  const [deletingTechnician, setDeletingTechnician] = useState<Technician | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [viewingFiles, setViewingFiles] = useState<Technician | null>(null)
  const [cityFilter, setCityFilter] = useState('all')

  const fetchTechnicians = useCallback(async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          phone,
          city,
          created_at
        `)
        .eq('role', 'technician')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Veriyi düzenle
      const techniciansWithDefaults = (data || []).map(tech => ({
        ...tech,
        city: tech.city,
        technician_details: {
          status: 'active',
          specialization: 'bilgisayar',
          address: '',
          notes: ''
        }
      }))
      
      setTechnicians(techniciansWithDefaults)
    } catch (error) {
      console.error('Tekniksyenler yüklenirken hata:', error)
      // onToast dependency'sini kaldırdık
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTechnicians()
  }, [refreshTrigger]) // Sadece refreshTrigger dependency



  const handleDelete = async () => {
    if (!deletingTechnician) return
    
    setDeleteLoading(true)
    try {
      console.log('Silme işlemi başlıyor:', deletingTechnician.id)
      
      const { data, error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deletingTechnician.id)

      console.log('Silme sonucu:', { data, error })

      if (error) {
        console.error('Supabase silme hatası:', error)
        throw error
      }

      console.log('Silme başarılı, UI güncelleniyor...')
      onToast('success', 'Tekniksyen Silindi', `${deletingTechnician.full_name} başarıyla silindi.`)
      setDeletingTechnician(null)
      
      // UI'yi hemen güncelle
      setTechnicians(prev => prev.filter(t => t.id !== deletingTechnician.id))
      
    } catch (error: any) {
      console.error('Silme hatası:', error)
      onToast('error', 'Silme Hatası', error.message || 'Tekniksyen silinirken bir hata oluştu')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleEditSuccess = useCallback(() => {
    onToast('success', 'Güncelleme Başarılı', 'Tekniksyen bilgileri güncellendi.')
    setEditingTechnician(null)
    fetchTechnicians()
  }, [onToast, fetchTechnicians])

  const getSpecializationText = (specialization?: string) => {
    const specializations: Record<string, string> = {
      bilgisayar: 'Bilgisayar Teknisyeni',
      network: 'Ağ Teknisyeni',
      hardware: 'Donanım Teknisyeni',
      software: 'Yazılım Teknisyeni',
      printer: 'Yazıcı Teknisyeni',
      other: 'Diğer'
    }
    return specializations[specialization || ''] || 'Belirtilmemiş'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-red-100 text-red-800'
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktif'
      case 'inactive':
        return 'Pasif'
      case 'suspended':
        return 'Askıda'
      default:
        return 'Bilinmiyor'
    }
  }

  // Şehir filtrelemesi
  const filteredTechnicians = cityFilter === 'all' 
    ? technicians 
    : technicians.filter(tech => tech.city === cityFilter)

  // Şehir istatistikleri
  const cityStats = getCityStats(technicians as any[])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (technicians.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Henüz tekniksyen yok
        </h3>
        <p className="text-gray-600 mb-6">
          İlk tekniksyeninizi ekleyerek başlayın
        </p>
        <Button onClick={onAddTechnician} className="bg-blue-600 hover:bg-blue-700 text-white">
          İlk Tekniksyeni Ekle
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Şehir İstatistikleri */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cityStats.map(({ city, count, info }) => (
          <div key={city} className={`${info.bgColor} ${info.borderColor} border-l-4 rounded-lg p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{info.icon}</span>
                  <h3 className={`font-semibold ${info.textColor}`}>{info.name}</h3>
                </div>
                <p className={`text-2xl font-bold ${info.textColor} mt-1`}>{count}</p>
                <p className="text-sm text-gray-600">Tekniksyen</p>
              </div>
              <button
                onClick={() => setCityFilter(cityFilter === city ? 'all' : city)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  cityFilter === city 
                    ? info.badgeColor 
                    : `${info.bgColor} ${info.textColor} hover:${info.badgeColor}`
                }`}
              >
                {cityFilter === city ? 'Hepsini Göster' : 'Filtrele'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {cityFilter === 'all' ? 'Tüm Tekniksyenler' : `${getCityInfo(cityFilter).name} Tekniksyenleri`}
          </h3>
          <p className="text-sm text-gray-600">
            {filteredTechnicians.length} tekniksyen {cityFilter !== 'all' && `(${technicians.length} toplam)`}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {cityFilter !== 'all' && (
            <Button
              onClick={() => setCityFilter('all')}
              variant="outline"
              size="sm"
              className="text-gray-600"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filtreyi Temizle
            </Button>
          )}
          <Button onClick={onAddTechnician} className="bg-blue-600 hover:bg-blue-700 text-white">
            Yeni Tekniksyen
          </Button>
        </div>
      </div>

      {/* Technician Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTechnicians.map((technician) => {
          const cityInfo = getCityInfo(technician.city)
          return (
            <div
              key={technician.id}
              className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all ${cityInfo.cardBorder} border-l-4`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-gray-900 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    {technician.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{technician.full_name}</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    getStatusColor(technician.technician_details?.status || 'active')
                  }`}>
                    {getStatusText(technician.technician_details?.status || 'active')}
                  </span>
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={() => setSelectedTechnician(
                    selectedTechnician === technician.id ? null : technician.id
                  )}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <MoreVertical className="h-4 w-4 text-gray-500" />
                </button>
                {selectedTechnician === technician.id && (
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[150px]">
                    <button 
                      onClick={() => {
                        setEditingTechnician(technician)
                        setSelectedTechnician(null)
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Düzenle</span>
                    </button>
                    <button 
                      onClick={() => {
                        setViewingFiles(technician)
                        setSelectedTechnician(null)
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <FolderOpen className="h-4 w-4" />
                      <span>Dosyaları Görüntüle</span>
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Raporlar</span>
                    </button>
                    <hr className="my-1" />
                    <button 
                      onClick={() => {
                        setDeletingTechnician(technician)
                        setSelectedTechnician(null)
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center space-x-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Sil</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2 text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{technician.email}</span>
              </div>
              {technician.phone && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{technician.phone}</span>
                </div>
              )}
              {technician.technician_details?.address && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{technician.technician_details.address}</span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-gray-600">
                <User className="h-4 w-4" />
                <span>{getSpecializationText(technician.technician_details?.specialization)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(technician.created_at).toLocaleDateString('tr-TR')} tarihinde eklendi
                  </span>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${cityInfo.badgeColor} flex items-center space-x-1`}>
                  <span>{cityInfo.icon}</span>
                  <span>{cityInfo.name}</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">0</div>
                  <div className="text-gray-600">Dosya</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">0</div>
                  <div className="text-gray-600">Görev</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">0</div>
                  <div className="text-gray-600">Tamamlanan</div>
                </div>
              </div>
            </div>
          </div>
          )
        })}
      </div>

      {/* Edit Modal */}
      <TechnicianEditForm
        isOpen={!!editingTechnician}
        onClose={() => setEditingTechnician(null)}
        onSuccess={handleEditSuccess}
        technician={editingTechnician}
        onToast={onToast}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingTechnician}
        onClose={() => setDeletingTechnician(null)}
        onConfirm={handleDelete}
        title="Tekniksyeni Sil"
        message={`${deletingTechnician?.full_name} adlı tekniksyeni silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tekniksyene ait tüm veriler silinecektir.`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        type="danger"
        loading={deleteLoading}
      />

      {/* Files Modal */}
      <TechnicianFilesModal
        isOpen={!!viewingFiles}
        onClose={() => setViewingFiles(null)}
        technician={viewingFiles}
        onToast={onToast}
      />
    </div>
  )
}

export default memo(TechnicianList)
