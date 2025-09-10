'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Profile, supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { useTodayTaskCount } from '@/hooks/useTasks'
import { ToastContainer } from '@/components/ui/toast'
import ModernNavbar from './ModernNavbar'
import FileUploadManager from './FileUploadManager'
import SimpleFileList from './SimpleFileList'
import TechnicianInventory from './TechnicianInventory'
import TechnicianTaskManager from './TechnicianTaskManager'
import TechnicianVehicle from './TechnicianVehicle'
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
  X,
  Car
} from 'lucide-react'

interface TechnicianDashboardProps {
  user: User
  profile: Profile
}

interface TechnicianDashboardProps {
  user: User
  profile: Profile
}

export default function TechnicianDashboard({ user, profile }: TechnicianDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showTaskWizard, setShowTaskWizard] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  
  // Cached hooks
  const { 
    data: todayTaskCount = 0, 
    isLoading: isLoadingTaskCount,
    refetch: refetchTaskCount 
  } = useTodayTaskCount(user.id)
  const [profileData, setProfileData] = useState({
    full_name: profile.full_name || '',
    phone: profile.phone || ''
  })
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const { toasts, toast, removeToast } = useToast()

  const handleToast = (type: 'success' | 'error', title: string, message?: string) => {
    if (type === 'success') {
      toast.success(title, message)
    } else {
      toast.error(title, message)
    }
  }

  // Refresh trigger için effect
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetchTaskCount()
    }
  }, [refreshTrigger, refetchTaskCount])

  // Online/offline durumunu takip et
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Online olunca cached verileri yenile
      refetchTaskCount()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [refetchTaskCount])

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    // Mobilde sekme değiştiğinde sidebar'ı kapat
    setIsMobileSidebarOpen(false)
  }

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

      handleToast('success', 'Profil Güncellendi', 'Profil bilgileriniz başarıyla güncellendi')
      setRefreshTrigger(prev => prev + 1)
    } catch (error: unknown) {
      console.error('Profil güncelleme hatası:', error)
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata'
      handleToast('error', 'Güncelleme Hatası', errorMessage)
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const menuItems = [
    { id: 'overview', label: 'Genel Bakış', icon: BarChart3, color: 'blue' },
    { id: 'profile', label: 'Profil', icon: UserIcon, color: 'green' },
    { id: 'upload', label: 'Dosya Yükleme', icon: Upload, color: 'purple' },
    { id: 'files', label: 'Dosyalarım', icon: FileText, color: 'orange' },
    { id: 'tasks', label: 'Görevlerim', icon: CheckSquare, color: 'red' },
    { id: 'inventory', label: 'Envanterim', icon: Package, color: 'indigo' },
    { id: 'vehicles', label: 'Araçlarım', icon: Car, color: 'teal' },
  ]

  // Ana loading state'i kontrol et - cached data ile daha hızlı
  if (isLoadingTaskCount && todayTaskCount === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
      }`}>
        <div className="text-center max-w-sm mx-auto p-6">
          <div className={`inline-block animate-spin rounded-full h-10 w-10 border-b-2 ${
            theme === 'dark' ? 'border-green-400' : 'border-green-600'
          }`}></div>
          <p className={`mt-4 text-base font-medium ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Dashboard hazırlanıyor...
          </p>
          <p className={`mt-2 text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
           
          </p>
          
          {/* Mini progress indicator */}
          <div className="mt-4 w-full bg-gray-200 rounded-full h-1">
            <div className={`h-1 rounded-full animate-pulse ${
              theme === 'dark' ? 'bg-green-400' : 'bg-green-600'
            }`} style={{width: '90%'}}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
    }`}>
      {/* Modern Navbar - Sticky */}
      <div className="sticky top-0 z-40">
        <ModernNavbar 
          user={user} 
          profile={profile} 
          title="Tekniksyen Panel"
          showThemeToggle={true}
          onThemeToggle={toggleTheme}
          theme={theme}
        />
        
        {/* Offline Warning */}
        {!isOnline && (
          <div className="bg-red-500 text-white px-4 py-2 text-center text-sm">
            🔌 İnternet bağlantısı yok. Bazı özellikler çalışmayabilir.
          </div>
        )}
        
        {/* Mobile Header with Menu Button */}
        <div className={`lg:hidden flex items-center justify-between p-4 border-b ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
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
          <div className="w-8"></div> {/* Spacer for centering */}
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

        {/* Sidebar - Mobile Slide-in */}
        <div className={`
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          fixed lg:static inset-y-0 left-0 z-40 w-80 lg:w-72
          transition-transform duration-300 ease-in-out
          ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}
          border-r shadow-lg lg:shadow-sm
        `}>
          <div className="p-4 lg:p-6 pt-6">
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

            {/* Profile Section */}
            <div className={`mb-6 p-4 rounded-xl ${
              theme === 'dark' ? 'bg-slate-700/50' : 'bg-green-50'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-base lg:text-lg">
                    {profile.full_name?.charAt(0).toUpperCase() || 'T'}
                  </span>
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
            <nav className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 lg:px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? theme === 'dark'
                          ? 'bg-green-600 text-white shadow-lg'
                          : 'bg-green-600 text-white shadow-lg'
                        : theme === 'dark'
                          ? 'text-gray-300 hover:bg-slate-700 hover:text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : ''}`} />
                    <span className="font-medium text-sm lg:text-base">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className={`flex-1 transition-colors duration-300 min-h-screen ${
          theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
        }`}>
          <div className="p-4 lg:p-8">
            {/* Content Header */}
            <div className={`mb-6 lg:mb-8 p-4 lg:p-6 rounded-xl ${
              theme === 'dark' ? 'bg-slate-800' : 'bg-white'
            } shadow-sm`}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div>
                  <h2 className={`text-xl lg:text-2xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
                  </h2>
                  <p className={`mt-1 text-sm lg:text-base ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {activeTab === 'profile' && 'Profil bilgilerinizi güncelleyin'}
                    {activeTab === 'upload' && 'Dosya yükleme ve paylaşım'}
                    {activeTab === 'files' && 'Yüklediğiniz dosyaları görüntüleyin'}
                    {activeTab === 'tasks' && 'Görev atamaları ve durumları'}
                    {activeTab === 'inventory' && 'Size atanan malzeme ve araçlar'}
                    {activeTab === 'overview' && 'Genel durum ve istatistikler'}
                  </p>
                </div>
                <div className={`px-3 lg:px-4 py-2 rounded-lg ${
                  theme === 'dark' ? 'bg-green-600' : 'bg-green-100'
                }`}>
                  <span className={`text-xs lg:text-sm font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-green-700'
                  }`}>
                    {new Date().toLocaleDateString('tr-TR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Günlük Görev Kartı - Mobile Optimized */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className={`p-4 sm:p-6 rounded-xl ${
                      theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                    } shadow-sm border-l-4 border-blue-500`}>
                      <div className="flex items-center">
                        <Target className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 mr-2 sm:mr-3" />
                        <div>
                          <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Bugünkü Görevler
                          </p>
                          <p className={`text-lg sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {todayTaskCount}/9
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={`p-4 sm:p-6 rounded-xl ${
                      theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                    } shadow-sm border-l-4 border-green-500`}>
                      <div className="flex items-center">
                        <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 mr-2 sm:mr-3" />
                        <div>
                          <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Çalışma Saati
                          </p>
                          <p className={`text-lg sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={`p-4 sm:p-6 rounded-xl sm:col-span-2 lg:col-span-1 ${
                      theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                    } shadow-sm border-l-4 border-orange-500`}>
                      <div className="flex items-center">
                        <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 mr-2 sm:mr-3" />
                        <div>
                          <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Kalan Kapasite
                          </p>
                          <p className={`text-lg sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {9 - todayTaskCount}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Yeni Görev Oluşturma - Mobile Optimized */}
                  <div className={`p-6 sm:p-8 rounded-xl text-center ${
                    theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                  } shadow-sm`}>
                    <CheckSquare className={`h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-500'
                    }`} />
                    <h3 className={`text-lg sm:text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Yeni Görev Oluştur
                    </h3>
                    <p className={`mb-6 text-sm sm:text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Günlük kapasitenizdeki görev sayısı: <strong>{todayTaskCount}/9</strong>
                      {todayTaskCount >= 9 && (
                        <span className="text-red-500 block mt-2 text-sm">
                          ⚠️ Günlük görev limitine ulaştınız
                        </span>
                      )}
                    </p>
                    <button
                      onClick={() => setShowTaskWizard(true)}
                      disabled={todayTaskCount >= 9}
                      className={`w-full sm:w-auto px-6 sm:px-8 py-3 rounded-lg font-medium transition-colors ${
                        todayTaskCount >= 9
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : theme === 'dark'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                      } flex items-center justify-center space-x-2 mx-auto`}
                    >
                      <Plus className="h-5 w-5" />
                      <span>Yeni Görev Oluştur</span>
                    </button>
                  </div>

                  {/* Hoş Geldiniz Mesajı - Mobile Optimized */}
                  <div className={`p-6 sm:p-8 rounded-xl text-center ${
                    theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                  } shadow-sm`}>
                    <h3 className={`text-lg sm:text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Hoş Geldiniz, {profile.full_name}!
                    </h3>
                    <p className={`mt-2 text-sm sm:text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Görevlerinizi yönetmek, dosyalarınızı düzenlemek ve envanter durumunuzu görüntülemek için menüden seçim yapabilirsiniz.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className={`max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                } shadow-sm`}>
                  <form onSubmit={handleProfileUpdate} className="space-y-4 sm:space-y-6">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                      }`}>
                        Ad Soyad
                      </label>
                      <input
                        type="text"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border transition-colors text-sm sm:text-base ${
                          theme === 'dark' 
                            ? 'bg-slate-700 border-slate-600 text-white focus:border-green-500' 
                            : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-green-500'
                        } focus:outline-none focus:ring-1 focus:ring-green-500`}
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
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border transition-colors text-sm sm:text-base ${
                          theme === 'dark' 
                            ? 'bg-slate-700 border-slate-600 text-white focus:border-green-500' 
                            : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-green-500'
                        } focus:outline-none focus:ring-1 focus:ring-green-500`}
                        placeholder="Telefon numaranızı girin"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                      }`}>
                        E-posta (değiştirilemez)
                      </label>
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border transition-colors text-sm sm:text-base ${
                          theme === 'dark' 
                            ? 'bg-slate-600 border-slate-500 text-gray-300' 
                            : 'bg-gray-100 border-gray-200 text-gray-500'
                        } cursor-not-allowed`}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="w-full py-2 sm:py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
                    >
                      {isUpdatingProfile ? 'Güncelleniyor...' : 'Profili Güncelle'}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'upload' && (
                <FileUploadManager 
                  technicianId={user.id}
                  onToast={handleToast}
                  onSuccess={() => setRefreshTrigger(prev => prev + 1)}
                />
              )}

              {activeTab === 'files' && (
                <SimpleFileList 
                  onToast={handleToast}
                />
              )}

              {activeTab === 'inventory' && (
                <TechnicianInventory 
                  technicianId={user.id}
                  onToast={handleToast}
                />
              )}

              {activeTab === 'vehicles' && (
                <TechnicianVehicle 
                  technicianId={user.id}
                  onToast={handleToast}
                />
              )}

              {activeTab === 'tasks' && (
                <TechnicianTaskManager 
                  technicianId={user.id}
                  onToast={handleToast}
                />
              )}
            </div>
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
              refetchTaskCount()
            }}
            onCancel={() => setShowTaskWizard(false)}
            onToast={handleToast}
          />
        </div>
      )}
    </div>
  )
}


