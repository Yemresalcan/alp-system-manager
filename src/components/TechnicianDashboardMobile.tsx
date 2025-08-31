'use client'

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { User } from '@supabase/supabase-js'
import { Profile, supabase } from '@/lib/supabase'
import { taskAPI } from '@/lib/api-client'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/toast'
import ModernNavbar from './ModernNavbar'
import FileUploadManager from './FileUploadManager'
import SimpleFileList from './SimpleFileList'
import TechnicianInventory from './TechnicianInventory'
import TaskWizard from './TaskWizard'
import { 
  User as UserIcon, 
  FileText, 
  Upload,
  Package,
  BarChart3,
  CheckSquare,
  Plus,
  Calendar,
  Clock,
  Target,
  Menu,
  X
} from 'lucide-react'

interface TechnicianDashboardProps {
  user: User
  profile: Profile
}

export default function TechnicianDashboardMobile({ user, profile }: TechnicianDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showTaskWizard, setShowTaskWizard] = useState(false)
  const [todayTaskCount, setTodayTaskCount] = useState(0)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [profileData, setProfileData] = useState({
    full_name: profile.full_name || '',
    phone: profile.phone || ''
  })
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tabLoading, setTabLoading] = useState<Record<string, boolean>>({})
  const { toasts, toast, removeToast } = useToast()

  const handleToast = useCallback((type: 'success' | 'error', title: string, message?: string) => {
    if (type === 'success') {
      toast.success(title, message)
    } else {
      toast.error(title, message)
    }
  }, [toast])

  // Memoized menu items
  const menuItems = useMemo(() => [
    { id: 'overview', label: 'Genel Bakış', icon: BarChart3, color: 'blue' },
    { id: 'tasks', label: 'Görevlerim', icon: CheckSquare, color: 'red' },
    { id: 'upload', label: 'Dosya Yükleme', icon: Upload, color: 'purple' },
    { id: 'files', label: 'Dosyalarım', icon: FileText, color: 'orange' },
    { id: 'inventory', label: 'Envanterim', icon: Package, color: 'indigo' },
    { id: 'profile', label: 'Profil', icon: UserIcon, color: 'green' },
  ], [])

  // Günlük görev sayısını yükle
  const loadTodayTaskCount = useCallback(async () => {
    try {
      setIsLoading(true)
      const today = new Date().toISOString().split('T')[0]
      
      // Yeni API client kullan
      const result = await taskAPI.getTasks({
        technician_id: user.id,
        date: today
      })
      
      setTodayTaskCount(result.data?.length || 0)
    } catch (error) {
      console.error('Günlük görev sayısı yüklenirken hata:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    loadTodayTaskCount()
  }, [loadTodayTaskCount, refreshTrigger])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }, [theme])

  // Tab değiştirme optimized + mobile sidebar kapatma
  const handleTabChange = useCallback((tabId: string) => {
    if (tabId === activeTab) return
    
    setTabLoading(prev => ({ ...prev, [tabId]: true }))
    setActiveTab(tabId)
    setIsMobileSidebarOpen(false) // Mobile'da sidebar'ı kapat
    
    setTimeout(() => {
      setTabLoading(prev => ({ ...prev, [tabId]: false }))
    }, 300)
  }, [activeTab])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingProfile(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      handleToast('success', 'Başarılı', 'Profil bilgileriniz güncellendi')
    } catch (error: any) {
      const errorMessage = error?.message || 'Güncelleme sırasında bir hata oluştu'
      handleToast('error', 'Güncelleme Hatası', errorMessage)
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
    }`}>
      {/* Mobile-First Header */}
      <div className={`sticky top-0 z-40 ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      } border-b shadow-sm`}>
        {/* Desktop Navbar */}
        <div className="hidden lg:block">
          <ModernNavbar 
            user={user} 
            profile={profile} 
            title="Tekniksyen Panel"
            showThemeToggle={true}
            onThemeToggle={toggleTheme}
            theme={theme}
          />
        </div>
        
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className={`p-2 rounded-lg ${
              theme === 'dark' 
                ? 'text-gray-300 hover:bg-slate-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {isMobileSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <h1 className={`text-lg font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
          </h1>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg ${
              theme === 'dark' 
                ? 'text-gray-300 hover:bg-slate-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <div className="flex relative">
        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          fixed lg:static inset-y-0 left-0 z-40 w-80 lg:w-72
          transition-transform duration-300 ease-in-out
          ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}
          border-r shadow-lg lg:shadow-sm overflow-y-auto
        `}>
          <div className="p-4 lg:p-6">
            {/* Mobile Close Button */}
            <div className="lg:hidden flex justify-end mb-4">
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className={`p-2 rounded-lg ${
                  theme === 'dark' 
                    ? 'text-gray-300 hover:bg-slate-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Card */}
            <div className={`mb-6 p-4 rounded-xl ${
              theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center ${
                  theme === 'dark' ? 'bg-green-600' : 'bg-green-500'
                }`}>
                  <UserIcon className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                </div>
                <div>
                  <h3 className={`font-semibold text-sm lg:text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {profile.full_name}
                  </h3>
                  <p className={`text-xs lg:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Tekniksyen
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                const isTabLoading = tabLoading[item.id]
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    disabled={isTabLoading}
                    className={`w-full flex items-center space-x-3 px-3 lg:px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-green-600 text-white shadow-lg'
                        : theme === 'dark'
                          ? 'text-gray-300 hover:bg-slate-700 hover:text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                    } ${isTabLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : ''} ${isTabLoading ? 'animate-pulse' : ''}`} />
                    <span className="font-medium text-sm lg:text-base">{item.label}</span>
                    {isTabLoading && (
                      <div className="ml-auto w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
                    )}
                    {isActive && !isTabLoading && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full lg:w-auto">
          <div className="p-4 lg:p-8">
            {/* Loading State */}
            {(isLoading || tabLoading[activeTab]) && (
              <div className={`mb-4 p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} shadow-sm`}>
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    İçerik yükleniyor...
                  </span>
                </div>
              </div>
            )}
            
            {/* Overview Tab */}
            {activeTab === 'overview' && !tabLoading[activeTab] && (
              <div className="space-y-4 lg:space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className={`p-4 lg:p-6 rounded-xl ${
                    theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                  } shadow-sm border-l-4 border-blue-500`}>
                    <div className="flex items-center">
                      <Target className="h-6 w-6 lg:h-8 lg:w-8 text-blue-500 mr-3" />
                      <div>
                        <p className={`text-xs lg:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Bugünkü Görevler
                        </p>
                        <p className={`text-lg lg:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {todayTaskCount}/9
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 lg:p-6 rounded-xl ${
                    theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                  } shadow-sm border-l-4 border-green-500`}>
                    <div className="flex items-center">
                      <Clock className="h-6 w-6 lg:h-8 lg:w-8 text-green-500 mr-3" />
                      <div>
                        <p className={`text-xs lg:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Aktif Süre
                        </p>
                        <p className={`text-lg lg:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {new Date().getHours()}:{String(new Date().getMinutes()).padStart(2, '0')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 lg:p-6 rounded-xl ${
                    theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                  } shadow-sm border-l-4 border-purple-500 sm:col-span-2 lg:col-span-1`}>
                    <div className="flex items-center">
                      <Calendar className="h-6 w-6 lg:h-8 lg:w-8 text-purple-500 mr-3" />
                      <div>
                        <p className={`text-xs lg:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Bu Hafta
                        </p>
                        <p className={`text-lg lg:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {todayTaskCount * 3}/45
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className={`p-4 lg:p-8 rounded-xl text-center ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                } shadow-sm`}>
                  <Target className="mx-auto h-10 w-10 lg:h-12 lg:w-12 text-green-500 mb-4" />
                  <h3 className={`text-lg lg:text-xl font-semibold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Yeni Görev Oluştur
                  </h3>
                  <p className={`mb-4 lg:mb-6 text-sm lg:text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Günlük kapasitenizdeki görev sayısı: <strong>{todayTaskCount}/9</strong>
                    {todayTaskCount >= 9 && (
                      <span className="text-red-500 block mt-2 text-xs lg:text-sm">
                        ⚠️ Günlük görev limitine ulaştınız
                      </span>
                    )}
                  </p>
                  <button
                    onClick={() => setShowTaskWizard(true)}
                    disabled={todayTaskCount >= 9}
                    className={`w-full sm:w-auto px-6 lg:px-8 py-3 rounded-lg font-medium transition-colors ${
                      todayTaskCount >= 9
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    } flex items-center justify-center space-x-2 text-sm lg:text-base`}
                  >
                    <Plus className="h-4 w-4 lg:h-5 lg:w-5" />
                    <span>Yeni Görev Oluştur</span>
                  </button>
                </div>

                {/* Welcome Message */}
                <div className={`p-4 lg:p-8 rounded-xl text-center ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                } shadow-sm`}>
                  <h3 className={`text-lg lg:text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Hoş Geldiniz, {profile.full_name}!
                  </h3>
                  <p className={`mt-2 text-sm lg:text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Görevlerinizi yönetmek, dosyalarınızı düzenlemek ve envanter durumunuzu görüntülemek için menüden seçim yapabilirsiniz.
                  </p>
                </div>
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && !tabLoading[activeTab] && (
              <TechnicianTaskList 
                userId={user.id}
                theme={theme}
                onRefresh={() => setRefreshTrigger(prev => prev + 1)}
              />
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && !tabLoading[activeTab] && (
              <div className={`max-w-2xl mx-auto p-4 lg:p-8 rounded-xl ${
                theme === 'dark' ? 'bg-slate-800' : 'bg-white'
              } shadow-sm`}>
                <form onSubmit={handleProfileUpdate} className="space-y-4 lg:space-y-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      Ad Soyad
                    </label>
                    <input
                      type="text"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                      className={`w-full px-3 lg:px-4 py-2 lg:py-3 rounded-lg border text-sm lg:text-base ${
                        theme === 'dark'
                          ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:ring-2 focus:ring-green-500 focus:border-green-500`}
                      placeholder="Adınızı ve soyadınızı girin"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className={`w-full px-3 lg:px-4 py-2 lg:py-3 rounded-lg border text-sm lg:text-base ${
                        theme === 'dark'
                          ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:ring-2 focus:ring-green-500 focus:border-green-500`}
                      placeholder="Telefon numaranızı girin"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium 
                      hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 
                      disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm lg:text-base"
                  >
                    {isUpdatingProfile ? 'Güncelleniyor...' : 'Profili Güncelle'}
                  </button>
                </form>
              </div>
            )}

            {/* Upload Tab */}
            {activeTab === 'upload' && !tabLoading[activeTab] && (
              <FileUploadManager 
                technicianId={user.id}
                onToast={handleToast}
                onSuccess={() => setRefreshTrigger(prev => prev + 1)}
              />
            )}

            {/* Files Tab */}
            {activeTab === 'files' && !tabLoading[activeTab] && (
              <SimpleFileList 
                onToast={handleToast}
              />
            )}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && !tabLoading[activeTab] && (
              <TechnicianInventory 
                technicianId={user.id}
                onToast={handleToast}
              />
            )}
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Task Wizard Modal */}
      {showTaskWizard && (
        <div className="fixed inset-0 z-50">
          <TaskWizard
            onComplete={() => {
              setShowTaskWizard(false)
              setRefreshTrigger(prev => prev + 1)
            }}
            onCancel={() => setShowTaskWizard(false)}
            onToast={handleToast}
          />
        </div>
      )}
    </div>
  )
}

// Teknisyen görev listesi bileşeni
interface TechnicianTaskListProps {
  userId: string
  theme: 'light' | 'dark'
  onRefresh: () => void
}

const TechnicianTaskList = memo(function TechnicianTaskList({ userId, theme, onRefresh }: TechnicianTaskListProps) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('technician_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Görevler yüklenirken hata:', error)
        return
      }

      setTasks(data || [])
    } catch (error) {
      console.error('Görevler yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Bekliyor'
      case 'in_progress': return 'Devam Ediyor'
      case 'completed': return 'Tamamlandı'
      case 'cancelled': return 'İptal Edildi'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className={`p-4 lg:p-8 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} shadow-sm`}>
        <div className="animate-pulse space-y-4">
          <div className={`h-4 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'} rounded w-1/4`}></div>
          <div className={`h-4 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'} rounded w-1/2`}></div>
          <div className={`h-4 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'} rounded w-1/3`}></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 lg:p-8 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} shadow-sm`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-2 sm:space-y-0">
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Görevlerim
        </h3>
        <button
          onClick={fetchTasks}
          className={`self-start sm:self-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            theme === 'dark'
              ? 'bg-slate-700 hover:bg-slate-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          🔄 Yenile
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8">
          <CheckSquare className={`mx-auto h-12 w-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
          <p className={`mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Henüz göreviniz bulunmamaktadır.
          </p>
        </div>
      ) : (
        <div className="space-y-4 lg:space-y-0">
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {tasks.map((task) => (
              <div 
                key={task.id}
                className={`p-4 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-slate-700 border-slate-600' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {task.task_type || 'Görev'}
                    </h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Servis: {task.service_number || '-'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {getStatusText(task.status)}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    📍 {task.location || 'Konum belirtilmemiş'}
                  </p>
                  <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    📅 {task.created_at ? new Date(task.created_at).toLocaleDateString('tr-TR') : '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
                  <th className={`text-left py-3 px-4 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Görev Tipi
                  </th>
                  <th className={`text-left py-3 px-4 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Servis No
                  </th>
                  <th className={`text-left py-3 px-4 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Durum
                  </th>
                  <th className={`text-left py-3 px-4 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Oluşturma
                  </th>
                  <th className={`text-left py-3 px-4 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Konum
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr 
                    key={task.id}
                    className={`border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-100'} hover:${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'}`}
                  >
                    <td className={`py-4 px-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {task.task_type || '-'}
                    </td>
                    <td className={`py-4 px-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {task.service_number || '-'}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {getStatusText(task.status)}
                      </span>
                    </td>
                    <td className={`py-4 px-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {task.created_at ? new Date(task.created_at).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td className={`py-4 px-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {task.location || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
})
