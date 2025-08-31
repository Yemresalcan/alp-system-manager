'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { taskAPI } from '@/lib/api-client'
import { Task, Profile } from '@/lib/supabase'
import { 
  CheckSquare, 
  User, 
  Calendar, 
  Clock, 
  Eye,
  Filter,
  Download,
  Target,
  TrendingUp,
  Users,
  BarChart3,
  Camera,
  MapPin,
  Hash,
  Cable,
  Wifi,
  Wrench,
  Truck,
  MoreHorizontal
} from 'lucide-react'

interface AdminTaskManagerProps {
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

interface TaskWithProfile extends Task {
  profiles: Profile
  task_photos: Array<{
    id: string
    photo_url: string
    file_name?: string
    description?: string
  }>
}

interface TaskStats {
  total: number
  completed: number
  pending: number
  in_progress: number
  by_technician: { [key: string]: number }
  by_type: { [key: string]: number }
}

export default function AdminTaskManager({ onToast }: AdminTaskManagerProps) {
  const [tasks, setTasks] = useState<TaskWithProfile[]>([])
  const [filteredTasks, setFilteredTasks] = useState<TaskWithProfile[]>([])
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    completed: 0,
    pending: 0,
    in_progress: 0,
    by_technician: {},
    by_type: {}
  })
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTechnician, setSelectedTechnician] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [technicians, setTechnicians] = useState<Profile[]>([])
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

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

  // Görevleri ve teknisyenleri yükle
  const loadData = async () => {
    try {
      setLoading(true)

      // Teknisyenleri yükle
      const { data: techData, error: techError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'technician')
        .order('full_name')

      if (techError) throw techError
      setTechnicians(techData || [])

      // Görevleri yükle
      await loadTasks()

    } catch (error: any) {
      console.error('Veri yükleme hatası:', error)
      onToast('error', 'Hata', 'Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const loadTasks = async () => {
    try {
      // Yeni API client kullan
      const result = await taskAPI.getTasks({
        date: selectedDate
      })
      
      const tasksData = result.data || []
      
      setTasks(tasksData)
      calculateStats(tasksData)
      
    } catch (error: any) {
      console.error('Görevler yüklenirken hata:', error)
      onToast('error', 'Hata', 'Görevler yüklenemedi')
    }
  }

  // İstatistikleri hesapla
  const calculateStats = (tasksData: TaskWithProfile[]) => {
    const newStats: TaskStats = {
      total: tasksData.length,
      completed: tasksData.filter(t => t.status === 'completed').length,
      pending: tasksData.filter(t => t.status === 'pending').length,
      in_progress: tasksData.filter(t => t.status === 'in_progress').length,
      by_technician: {},
      by_type: {}
    }

    // Tekniksyen bazlı hesaplama
    tasksData.forEach(task => {
      const techName = task.profiles?.full_name || 'Bilinmeyen'
      newStats.by_technician[techName] = (newStats.by_technician[techName] || 0) + 1
    })

    // Tip bazlı hesaplama
    tasksData.forEach(task => {
      newStats.by_type[task.task_type] = (newStats.by_type[task.task_type] || 0) + 1
    })

    setStats(newStats)
  }

  // Filtreleme
  useEffect(() => {
    let filtered = tasks

    if (selectedTechnician !== 'all') {
      filtered = filtered.filter(task => task.technician_id === selectedTechnician)
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(task => task.status === selectedStatus)
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(task => task.task_type === selectedType)
    }

    setFilteredTasks(filtered)
  }, [tasks, selectedTechnician, selectedStatus, selectedType])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadTasks()
  }, [selectedDate])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center">
            <Target className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Toplam Görev</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
          <div className="flex items-center">
            <CheckSquare className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Tamamlanan</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Devam Eden</p>
              <p className="text-2xl font-bold text-gray-900">{stats.in_progress}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-orange-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Aktif Teknisyen</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.keys(stats.by_technician).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center space-x-4 flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-gray-500" />
            <select
              value={selectedTechnician}
              onChange={(e) => setSelectedTechnician(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tüm Teknisyenler</option>
              {technicians.map(tech => (
                <option key={tech.id} value={tech.id}>
                  {tech.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pending">Bekliyor</option>
              <option value="in_progress">Devam Ediyor</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">İptal Edildi</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-gray-500" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tüm Tipler</option>
              {taskTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Görevler ({filteredTasks.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teknisyen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Görev Tipi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hizmet No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Oluşturulma
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {task.profiles?.full_name || 'Bilinmeyen'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {task.profiles?.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getTaskTypeIcon(task.task_type)}
                      <span className="ml-2 text-sm text-gray-900">
                        {getTaskTypeLabel(task.task_type)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{task.service_number}</div>
                    {task.location && (
                      <div className="text-sm text-gray-500 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {task.location}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                      statusColors[task.status as keyof typeof statusColors]
                    }`}>
                      {statusLabels[task.status as keyof typeof statusLabels]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(task.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                      className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Detay</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* Task Detail Modal */}
      {expandedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {(() => {
              const task = filteredTasks.find(t => t.id === expandedTask)
              if (!task) return null

              return (
                <div>
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Görev Detayları
                    </h3>
                    <button
                      onClick={() => setExpandedTask(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Teknisyen</label>
                        <p className="text-sm text-gray-900">{task.profiles?.full_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Görev Tipi</label>
                        <p className="text-sm text-gray-900">{getTaskTypeLabel(task.task_type)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Hizmet Numarası</label>
                        <p className="text-sm text-gray-900">{task.service_number}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Durum</label>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                          statusColors[task.status as keyof typeof statusColors]
                        }`}>
                          {statusLabels[task.status as keyof typeof statusLabels]}
                        </span>
                      </div>
                    </div>

                    {task.location && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Konum</label>
                        <p className="text-sm text-gray-900">{task.location}</p>
                      </div>
                    )}

                    {task.notes && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Notlar</label>
                        <p className="text-sm text-gray-900">{task.notes}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
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

                    {/* Fotoğraflar */}
                    {task.task_photos && task.task_photos.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                          <Camera className="h-4 w-4 mr-2" />
                          Fotoğraflar ({task.task_photos.length})
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {task.task_photos.map((photo) => (
                            <div key={photo.id} className="relative">
                              <img
                                src={photo.photo_url}
                                alt={photo.description || 'Görev fotoğrafı'}
                                className="w-full h-32 object-cover rounded-lg border"
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
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
