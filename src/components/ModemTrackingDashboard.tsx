'use client'

import { useState } from 'react'
import { EquipmentTracking, EQUIPMENT_TYPES } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import ModemExcelUploadModal from './ModemExcelUploadModal'
import { useEquipmentTracking, useUpdateEquipment } from '@/hooks/useEquipmentTracking'
import { 
  Package, 
  Upload, 
  Search,
  Filter,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Edit,
  Download,
  Plus,
  Hash,
  Building,
  MapPin,
  FileText,
  ArrowLeft,
  ArrowRight
} from 'lucide-react'

interface ModemTrackingDashboardProps {
  onToast: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void
}

interface ModemTrackingStats {
  total: number
  available: number
  assigned: number
  in_use: number
  returned: number
  lost: number
  damaged: number
}

// Helper function to parse Excel data from notes
const parseExcelData = (notes: string | null) => {
  if (!notes) return null
  try {
    const data = JSON.parse(notes)
    if (data.type === 'excel_import') {
      return data
    }
  } catch (e) {
    // If it's not JSON, treat as legacy text
  }
  return null
}

export default function ModemTrackingDashboard({ onToast }: ModemTrackingDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [technicianFilter, setTechnicianFilter] = useState('all')
  const [showExcelUpload, setShowExcelUpload] = useState(false)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  // Calculate pagination offset
  const offset = (currentPage - 1) * itemsPerPage

  // React Query hooks - Updated to use Equipment Tracking
  const { 
    data: equipmentData, 
    isLoading: loading, 
    error,
    refetch 
  } = useEquipmentTracking({
    search: searchTerm || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    technician: technicianFilter !== 'all' ? technicianFilter : undefined,
    limit: itemsPerPage,
    offset
  })

  const updateEquipmentMutation = useUpdateEquipment()

  // Data extraction - Updated for Equipment Tracking
  const equipment = equipmentData?.equipment || []
  const modems = equipment // Keep modems alias for backward compatibility in UI
  const stats = equipmentData?.statistics
  const totalCount = equipmentData?.total || 0

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const startItem = offset + 1
  const endItem = Math.min(offset + itemsPerPage, totalCount)

  // Wrapper function for refetch
  const loadModems = () => {
    console.log('🔄 Manual refresh triggered from dashboard...')
    refetch()
  }

  // Reset to first page when filters change
  const resetPagination = () => {
    setCurrentPage(1)
  }

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page
  }

  // Handle filter changes with pagination reset
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1) // Reset to first page
  }

  const handleTechnicianFilterChange = (value: string) => {
    setTechnicianFilter(value)
    setCurrentPage(1) // Reset to first page
  }

  // Modem durumu güncelle - React Query mutation
  const handleUpdateModem = async (modemId: string, action: string, notes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Giriş yapmalısınız')

      updateModemMutation.mutate({
        modem_id: modemId,
        action,
        notes,
        performed_by: user.id
      }, {
        onSuccess: (data) => {
          onToast('success', 'Başarılı', data.message)
        },
        onError: (error: any) => {
          console.error('Modem güncelleme hatası:', error)
          onToast('error', 'Hata', error.message)
        }
      })

    } catch (error: any) {
      console.error('Modem güncelleme hatası:', error)
      onToast('error', 'Hata', error.message)
    }
  }

  // Error handling
  if (error) {
    console.error('Modem tracking fetch error:', error)
  }

  // Durum rengi ve ikonu
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'available':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Müsait' }
      case 'assigned':
        return { color: 'bg-blue-100 text-blue-800', icon: User, label: 'Atandı' }
      case 'in_use':
        return { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle, label: 'Kullanımda' }
      case 'returned':
        return { color: 'bg-gray-100 text-gray-800', icon: RotateCcw, label: 'İade Edildi' }
      case 'lost':
        return { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Kayıp' }
      case 'damaged':
        return { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle, label: 'Hasarlı' }
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: Package, label: status }
    }
  }

  return (
    <div className="p-6 space-y-6">
      
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Package className="h-7 w-7 mr-3 text-blue-600" />
            Modem Takip Sistemi
          </h2>
          <p className="text-gray-600">Excel'den yüklenen modemlerinin teknisyen atamaları</p>
        </div>
        
            <div className="flex space-x-3">
              <Button
                onClick={loadModems}
                variant="outline" 
                disabled={loading}
              >
                <RotateCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </Button>
              <Button
                onClick={() => setShowExcelUpload(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Excel Yükle
              </Button>
              <Button
                onClick={() => window.open('/api/equipment-tracking/excel-upload', '_blank')}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Template İndir
              </Button>
              <Button
                onClick={() => {
                  const params = new URLSearchParams()
                  if (searchTerm) params.append('search', searchTerm)
                  if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
                  if (technicianFilter && technicianFilter !== 'all') params.append('technician', technicianFilter)

                  const url = `/api/equipment-tracking/export?${params.toString()}`
                  window.open(url, '_blank')
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
      </div>

      {/* İstatistikler */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <Package className="h-5 w-5 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Toplam</p>
                <p className="text-lg font-semibold">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Müsait</p>
                <p className="text-lg font-semibold">{stats.available}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <User className="h-5 w-5 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Atandı</p>
                <p className="text-lg font-semibold">{stats.assigned}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Kullanımda</p>
                <p className="text-lg font-semibold">{stats.in_use}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <RotateCcw className="h-5 w-5 text-gray-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">İade</p>
                <p className="text-lg font-semibold">{stats.returned}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Kayıp</p>
                <p className="text-lg font-semibold">{stats.lost}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Hasarlı</p>
                <p className="text-lg font-semibold">{stats.damaged}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtreler */}
      <div className="bg-white rounded-lg border p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Arama */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Seri numarası, teknisyen adı..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Durum Filtresi */}
          <div className="relative">
            <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="available">Müsait</option>
              <option value="assigned">Atandı</option>
              <option value="in_use">Kullanımda</option>
              <option value="returned">İade Edildi</option>
              <option value="lost">Kayıp</option>
              <option value="damaged">Hasarlı</option>
            </select>
          </div>

          {/* Teknisyen Filtresi */}
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <select
              value={technicianFilter}
              onChange={(e) => setTechnicianFilter(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tüm Teknisyenler</option>
              {/* TODO: Teknisyen listesini dinamik yükle */}
            </select>
          </div>
        </div>
      </div>

      {/* Modem Listesi */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Modem Listesi ({modems.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">Yükleniyor...</p>
          </div>
        ) : modems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Henüz hiç modem yüklenmemiş.</p>
            <Button 
              onClick={() => setShowExcelUpload(true)}
              className="mt-3"
            >
              <Upload className="h-4 w-4 mr-2" />
              Excel Yükle
            </Button>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ekipman Bilgileri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stok Durumu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Depo Tarihi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Atanmış Teknisyen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {modems.map((modem: EquipmentTracking) => {
                  const statusInfo = getStatusInfo(modem.current_status)
                  const StatusIcon = statusInfo.icon
                  const excelData = parseExcelData(modem.notes)

                  return (
                    <tr key={modem.id} className="hover:bg-gray-50">
                      
                      {/* Ekipman Bilgileri */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm font-medium text-gray-900">
                            <Hash className="h-4 w-4 mr-1 text-gray-400" />
                            {modem.serial_number || modem.modem_serial_number}
                          </div>
                          {excelData ? (
                            <div className="space-y-1">
                              <div className="flex items-center text-xs text-gray-600">
                                <Package className="h-3 w-3 mr-1 flex-shrink-0" />
                                {excelData.label}
                              </div>
                              {excelData.stok_adi && (
                                <div className="text-xs text-gray-500 truncate max-w-xs">
                                  {excelData.stok_adi}
                                </div>
                              )}
                            </div>
                          ) : (
                            modem.notes && (
                              <div className="text-xs text-gray-500 max-w-xs truncate">
                                {modem.notes}
                              </div>
                            )
                          )}
                        </div>
                      </td>

                      {/* Durum */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Stok Durumu */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {excelData?.stok_durumu ? (
                          <div className="flex items-center text-sm">
                            <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                              excelData.stok_durumu.toLowerCase().includes('sağlam') || 
                              excelData.stok_durumu.toLowerCase().includes('çıkış') 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {excelData.stok_durumu}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>

                      {/* Depo Hareket Tarihi */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {excelData?.depo_hareket_tarihi ? (
                          <div className="flex items-center text-sm text-gray-900">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            {(() => {
                              try {
                                const date = new Date(excelData.depo_hareket_tarihi)
                                return !isNaN(date.getTime()) 
                                  ? date.toLocaleDateString('tr-TR')
                                  : excelData.depo_hareket_tarihi // Show raw if can't parse
                              } catch (e) {
                                return excelData.depo_hareket_tarihi
                              }
                            })()}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>

                      {/* Atanmış Teknisyen */}
                      <td className="px-6 py-4">
                        {modem.assigned_technician_name ? (
                          <div className="space-y-1">
                            <div className="flex items-center text-sm font-medium text-gray-900">
                              <User className="h-4 w-4 mr-1 text-gray-400" />
                              {modem.assigned_technician_name}
                            </div>
                            {modem.assigned_date && (
                              <div className="flex items-center text-xs text-gray-500">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(modem.assigned_date).toLocaleDateString('tr-TR')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>

                      {/* İşlemler */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          {modem.current_status === 'in_use' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateModem(modem.id, 'return', 'Dashboard\'dan geri alındı')}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Geri Al
                            </Button>
                          )}
                          {modem.current_status !== 'in_use' && modem.current_status !== 'available' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateModem(modem.id, 'make_available')}
                            >
                              Müsait Yap
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
                
                {/* Sayfa bilgisi ve sayfa başına kayıt */}
                <div className="flex items-center space-x-4 text-sm text-gray-700">
                  <span>
                    {totalCount > 0 ? `${startItem}-${endItem}` : '0'} of {totalCount} kayıt
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={50}>50 / sayfa</option>
                    <option value={100}>100 / sayfa</option>
                    <option value={150}>150 / sayfa</option>
                  </select>
                </div>

                {/* Sayfa navigasyonu */}
                {totalPages > 1 && (
                  <div className="flex items-center space-x-2">
                    
                    {/* Previous button */}
                    <Button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      variant="outline"
                      size="sm"
                      className="px-3"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Önceki
                    </Button>

                    {/* Page numbers */}
                    <div className="flex items-center space-x-1">
                      {/* İlk sayfa */}
                      {currentPage > 3 && (
                        <>
                          <Button
                            onClick={() => handlePageChange(1)}
                            variant={currentPage === 1 ? "default" : "outline"}
                            size="sm"
                            className="px-3"
                          >
                            1
                          </Button>
                          {currentPage > 4 && <span className="px-2 text-gray-500">...</span>}
                        </>
                      )}

                      {/* Mevcut sayfanın etrafındaki sayfalar */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }

                        if (pageNum < 1 || pageNum > totalPages) return null

                        return (
                          <Button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            className="px-3"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}

                      {/* Son sayfa */}
                      {currentPage < totalPages - 2 && (
                        <>
                          {currentPage < totalPages - 3 && <span className="px-2 text-gray-500">...</span>}
                          <Button
                            onClick={() => handlePageChange(totalPages)}
                            variant={currentPage === totalPages ? "default" : "outline"}
                            size="sm"
                            className="px-3"
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Next button */}
                    <Button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      variant="outline"
                      size="sm"
                      className="px-3"
                    >
                      Sonraki
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        )}
      </div>

      {/* Excel Upload Modal */}
      <ModemExcelUploadModal
        isOpen={showExcelUpload}
        onClose={() => setShowExcelUpload(false)}
        onSuccess={() => {
          setShowExcelUpload(false)
          loadModems() // Listeyi yenile
        }}
        onToast={onToast}
      />
    </div>
  )
}
