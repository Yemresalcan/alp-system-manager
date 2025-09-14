'use client'

import { useState, useRef } from 'react'
import { supabase, EQUIPMENT_TYPES } from '@/lib/supabase'
import { useTasks, useUpdateTask } from '@/hooks/useTasks'
import { Task, EquipmentAssignment } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  CheckSquare,
  Clock,
  Eye,
  Edit,
  Save,
  X,
  Camera,
  Upload,
  MapPin,
  Hash,
  Cable,
  Wifi,
  Wrench,
  Truck,
  MoreHorizontal,
  Calendar,
  FileText,
  Plus
} from 'lucide-react'

interface TechnicianTaskManagerProps {
  technicianId: string
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

interface TaskWithPhotos extends Task {
  task_photos: Array<{
    id: string
    photo_url: string
    file_name?: string
    description?: string
  }>
}

export default function TechnicianTaskManager({ technicianId, onToast }: TechnicianTaskManagerProps) {
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    service_number: string
    location: string
    notes: string
    status: string
  }>({
    service_number: '',
    location: '',
    notes: '',
    status: ''
  })
  const [uploadingPhotos, setUploadingPhotos] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // React Query hooks
  const { data: tasks = [], isLoading, error } = useTasks(technicianId)
  const updateTaskMutation = useUpdateTask()

  // Filtrelenmiş görevler
  const filteredTasks = tasks.filter(task => {
    if (selectedStatus === 'all') return true
    return task.status === selectedStatus
  })

  // Görev tipleri
  const taskTypes = [
    { value: 'fiber_kurulum', label: 'Fiber Kurulum', icon: Cable, color: 'text-blue-600' },
    { value: 'normal_kurulum', label: 'Normal Kurulum', icon: Wifi, color: 'text-green-600' },
    { value: 'fiber_donusum', label: 'Fiber Dönüşüm', icon: Wrench, color: 'text-purple-600' },
    { value: 'nakil', label: 'Nakil', icon: Truck, color: 'text-orange-600' },
    { value: 'diger', label: 'Diğer', icon: MoreHorizontal, color: 'text-gray-600' }
  ]

  // Durum renkleri
  const statusColors = {
    pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    in_progress: 'text-blue-600 bg-blue-50 border-blue-200',
    completed: 'text-green-600 bg-green-50 border-green-200',
    cancelled: 'text-red-600 bg-red-50 border-red-200'
  }

  const statusLabels = {
    pending: 'Bekliyor',
    in_progress: 'Devam Ediyor',
    completed: 'Tamamlandı',
    cancelled: 'İptal Edildi'
  }

  // Görev düzenleme başlat
  const handleEditStart = (task: TaskWithPhotos) => {
    setEditingTask(task.id)
    setEditForm({
      service_number: task.service_number,
      location: task.location || '',
      notes: task.notes || '',
      status: task.status
    })
  }

  // Görev düzenleme kaydet
  const handleEditSave = async (taskId: string) => {
    try {
      await updateTaskMutation.mutateAsync({
        taskId,
        updates: editForm
      })

      setEditingTask(null)
      onToast('success', 'Başarılı', 'Görev güncellendi')
    } catch (error: any) {
      onToast('error', 'Hata', error.message || 'Görev güncellenemedi')
    }
  }

  // Görev düzenleme iptal
  const handleEditCancel = () => {
    setEditingTask(null)
    setEditForm({
      service_number: '',
      location: '',
      notes: '',
      status: ''
    })
  }

  // Fotoğraf yükleme
  const handlePhotoUpload = async (taskId: string, files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploadingPhotos(taskId)

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const maxSize = 5 * 1024 * 1024 // 5MB

    let successCount = 0
    let failedCount = 0

    for (const file of Array.from(files)) {
      // Dosya kontrolü
      if (!validTypes.includes(file.type)) {
        failedCount++
        continue
      }

      if (file.size > maxSize) {
        failedCount++
        continue
      }

      try {
        const formData = new FormData()
        formData.append('task_id', taskId)
        formData.append('file', file)
        formData.append('description', `Görev fotoğrafı - ${new Date().toLocaleString('tr-TR')}`)

        const response = await fetch('/api/tasks/photos', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        successCount++
      } catch (error) {
        console.error('Fotoğraf yükleme hatası:', error)
        failedCount++
      }
    }

    setUploadingPhotos(null)

    // Input'ları temizle
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''

    // Sonuç bildirimi
    if (successCount > 0) {
      onToast('success', 'Başarılı', `${successCount} fotoğraf yüklendi`)
    }
    if (failedCount > 0) {
      onToast('error', 'Kısmi Hata', `${failedCount} fotoğraf yüklenemedi`)
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR')
  }

  const getTaskTypeIcon = (type: string) => {
    const taskType = taskTypes.find(t => t.value === type)
    if (taskType) {
      const Icon = taskType.icon
      return <Icon className={`h-5 w-5 ${taskType.color}`} />
    }
    return <Hash className="h-5 w-5 text-gray-500" />
  }

  const getTaskTypeLabel = (type: string) => {
    return taskTypes.find(t => t.value === type)?.label || type
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Görevler yüklenirken hata oluştu</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Yeniden Dene
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header & Stats - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center">
            <CheckSquare className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 mr-2 sm:mr-3" />
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Toplam Görev</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{tasks.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border-l-4 border-green-500">
          <div className="flex items-center">
            <CheckSquare className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 mr-2 sm:mr-3" />
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Tamamlanan</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                {tasks.filter(t => t.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border-l-4 border-yellow-500 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center">
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 mr-2 sm:mr-3" />
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Bekleyen</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                {tasks.filter(t => t.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Mobile Optimized */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <label className="text-sm font-medium text-gray-700">Durum Filtresi:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="pending">Bekliyor</option>
            <option value="in_progress">Devam Ediyor</option>
            <option value="completed">Tamamlandı</option>
            <option value="cancelled">İptal Edildi</option>
          </select>
        </div>
      </div>

      {/* Tasks List - Mobile Optimized */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            Görevlerim ({filteredTasks.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredTasks.map((task) => (
            <div key={task.id} className="p-4 sm:p-6 hover:bg-gray-50">
              {/* Mobile: Stack layout, Desktop: Flex layout */}
              <div className="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  {/* Task Header - Mobile Optimized */}
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-3">
                    <div className="flex items-center space-x-2">
                      {getTaskTypeIcon(task.task_type)}
                      <h4 className="text-base sm:text-lg font-medium text-gray-900 truncate">
                        {getTaskTypeLabel(task.task_type)}
                      </h4>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border self-start ${statusColors[task.status as keyof typeof statusColors]
                      }`}>
                      {statusLabels[task.status as keyof typeof statusLabels]}
                    </span>
                  </div>

                  {editingTask === task.id ? (
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hizmet Numarası</label>
                        <input
                          type="text"
                          value={editForm.service_number}
                          onChange={(e) => setEditForm(prev => ({ ...prev, service_number: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Konum</label>
                        <input
                          type="text"
                          value={editForm.location}
                          onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Konum bilgisi"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                        <textarea
                          value={editForm.notes}
                          onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ek notlar"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="pending">Bekliyor</option>
                          <option value="in_progress">Devam Ediyor</option>
                          <option value="completed">Tamamlandı</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Hash className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">Hizmet No: {task.service_number}</span>
                      </div>
                      {task.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{task.location}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">{formatDateTime(task.created_at)}</span>
                      </div>
                      {task.notes && (
                        <div className="flex items-start text-sm text-gray-600">
                          <FileText className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{task.notes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons - Mobile Optimized */}
                <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:items-center sm:space-x-2 sm:ml-4">
                  {editingTask === task.id ? (
                    <>
                      <Button
                        onClick={() => handleEditSave(task.id)}
                        disabled={updateTaskMutation.isPending}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                      >
                        <Save className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Kaydet</span>
                      </Button>
                      <Button
                        onClick={handleEditCancel}
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none"
                      >
                        <X className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">İptal</span>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none"
                      >
                        <Eye className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Detay</span>
                      </Button>
                      <Button
                        onClick={() => handleEditStart(task)}
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none"
                      >
                        <Edit className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Düzenle</span>
                      </Button>
                      {task.status !== 'completed' && (
                        <>
                          <Button
                            onClick={() => {
                              setUploadingPhotos(task.id)
                              cameraInputRef.current?.click()
                            }}
                            disabled={uploadingPhotos === task.id}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                          >
                            <Camera className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">
                              {uploadingPhotos === task.id ? 'Yükleniyor...' : 'Kamera'}
                            </span>
                          </Button>
                          <Button
                            onClick={() => {
                              setUploadingPhotos(task.id)
                              fileInputRef.current?.click()
                            }}
                            disabled={uploadingPhotos === task.id}
                            size="sm"
                            variant="outline"
                            className="flex-1 sm:flex-none"
                          >
                            <Upload className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">
                              {uploadingPhotos === task.id ? 'Yükleniyor...' : 'Dosya'}
                            </span>
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Expanded Details - Mobile Optimized */}
              {expandedTask === task.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Oluşturulma</label>
                      <p className="text-sm text-gray-900">{formatDateTime(task.created_at)}</p>
                    </div>
                    {task.completed_at && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Tamamlanma</label>
                        <p className="text-sm text-gray-900">{formatDateTime(task.completed_at)}</p>
                      </div>
                    )}
                  </div>

                  {/* Equipment Assignments - New unified system */}
                  {((task.equipment_assignments && task.equipment_assignments.length > 0) || task.modem_serial_number) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold">📦</span>
                        </div>
                        <h4 className="text-sm font-medium text-blue-900">Kullanılan Ekipmanlar</h4>
                      </div>

                      {/* New equipment assignments system */}
                      {task.equipment_assignments && task.equipment_assignments.length > 0 && (
                        <div className="space-y-3">
                          {task.equipment_assignments.map((equipment: EquipmentAssignment, index: number) => {
                            const equipmentInfo = EQUIPMENT_TYPES[equipment.equipment_type]
                            return (
                              <div key={index} className="bg-white rounded-lg border border-blue-200 p-2">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="text-sm">{equipmentInfo?.icon || '📱'}</span>
                                  <span className="font-medium text-blue-900 text-xs">
                                    {equipmentInfo?.label || equipment.equipment_type}
                                  </span>
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div>
                                    <label className="font-medium text-blue-700">Seri No:</label>
                                    <p className="text-blue-900 font-mono">{equipment.serial_number}</p>
                                  </div>
                                  <div>
                                    <label className="font-medium text-blue-700">Durum:</label>
                                    <p className="text-blue-900">{equipment.status || 'in_use'}</p>
                                  </div>
                                  {equipment.assigned_at && (
                                    <div>
                                      <label className="font-medium text-blue-700">Atama Tarihi:</label>
                                      <p className="text-blue-900">
                                        {new Date(equipment.assigned_at).toLocaleDateString('tr-TR', {
                                          day: '2-digit',
                                          month: '2-digit', 
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Backward compatibility - Old modem system */}
                      {task.modem_serial_number && (!task.equipment_assignments || task.equipment_assignments.length === 0) && (
                        <div className="bg-white rounded-lg border border-blue-200 p-2">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm">📡</span>
                            <span className="font-medium text-blue-900 text-xs">Modem</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div>
                              <label className="font-medium text-blue-700">Seri No:</label>
                              <p className="text-blue-900 font-mono">{task.modem_serial_number}</p>
                            </div>
                            {task.modem_assigned_at && (
                              <div>
                                <label className="font-medium text-blue-700">Atama Tarihi:</label>
                                <p className="text-blue-900">
                                  {new Date(task.modem_assigned_at).toLocaleDateString('tr-TR', {
                                    day: '2-digit',
                                    month: '2-digit', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            )}
                            {task.modem_usage_notes && (
                              <div>
                                <label className="font-medium text-blue-700">Notlar:</label>
                                <p className="text-blue-900">{task.modem_usage_notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fotoğraflar - Mobile Optimized */}
                  {task.task_photos && task.task_photos.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <Camera className="h-4 w-4 mr-2" />
                        Fotoğraflar ({task.task_photos.length})
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                        {task.task_photos.map((photo) => (
                          <div key={photo.id} className="relative">
                            <img
                              src={photo.photo_url}
                              alt={photo.description || 'Görev fotoğrafı'}
                              className="w-full h-20 sm:h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                // Fotoğrafı büyük boyutta göster
                                const modal = document.createElement('div')
                                modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4'
                                modal.innerHTML = `
                                  <div class="relative max-w-full max-h-full">
                                    <img src="${photo.photo_url}" alt="${photo.description || 'Görev fotoğrafı'}" class="max-w-full max-h-full object-contain rounded-lg">
                                    <button class="absolute top-2 right-2 bg-white rounded-full p-2 hover:bg-gray-100">
                                      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                      </svg>
                                    </button>
                                  </div>
                                `
                                modal.onclick = (e) => {
                                  if (e.target === modal || e.target === modal.querySelector('button')) {
                                    document.body.removeChild(modal)
                                  }
                                }
                                document.body.appendChild(modal)
                              }}
                            />
                            {photo.description && (
                              <p className="text-xs text-gray-600 mt-1 truncate">
                                {photo.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Görev bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              Seçilen kriterlere uygun görev bulunmuyor.
            </p>
          </div>
        )}
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          if (uploadingPhotos && e.target.files) {
            handlePhotoUpload(uploadingPhotos, e.target.files)
          }
          // Reset uploadingPhotos if no task selected
          if (!uploadingPhotos) {
            setUploadingPhotos(null)
          }
        }}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          if (uploadingPhotos && e.target.files) {
            handlePhotoUpload(uploadingPhotos, e.target.files)
          }
          // Reset uploadingPhotos if no task selected
          if (!uploadingPhotos) {
            setUploadingPhotos(null)
          }
        }}
        className="hidden"
      />
    </div>
  )
}