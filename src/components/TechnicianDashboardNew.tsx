'use client'

import { useState, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/toast'
import ModernNavbar from './ModernNavbar'
import FileUploadManager from './FileUploadManager'
import SimpleFileList from './SimpleFileList'
import TechnicianInventory from './TechnicianInventory'
import { 
  User as UserIcon, 
  FileText, 
  CheckSquare, 
  Upload,
  Settings,
  Package,
  BarChart3,
  Clock
} from 'lucide-react'

interface TechnicianDashboardProps {
  user: User
  profile: Profile
}

export default function TechnicianDashboard({ user, profile }: TechnicianDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
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

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
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
    } catch (error: any) {
      console.error('Profil güncelleme hatası:', error)
      handleToast('error', 'Güncelleme Hatası', error.message)
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
  ]

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
    }`}>
      {/* Modern Navbar */}
      <ModernNavbar 
        user={user} 
        profile={profile} 
        title="Tekniksyen Panel"
        showThemeToggle={true}
        onThemeToggle={toggleTheme}
        theme={theme}
      />

      <div className="flex">
        {/* Modern Sidebar */}
        <div className={`w-72 min-h-screen sticky top-16 transition-all duration-300 ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        } border-r shadow-sm`}>
          <div className="p-6">
            <div className={`mb-6 p-4 rounded-xl ${
              theme === 'dark' ? 'bg-slate-700/50' : 'bg-green-50'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {profile.full_name?.charAt(0).toUpperCase() || 'T'}
                  </span>
                </div>
                <div>
                  <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {profile.full_name}
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Tekniksyen
                  </p>
                </div>
              </div>
            </div>

            <nav className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
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
                    <span className="font-medium">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Quick Stats */}
            <div className="mt-8 space-y-4">
              <h4 className={`text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              } uppercase tracking-wider`}>
                Hızlı Bilgiler
              </h4>
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>Bekleyen Görev</span>
                    <span className={`font-bold text-orange-500`}>3</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>Tamamlanan</span>
                    <span className={`font-bold text-green-500`}>18</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>Dosya Sayısı</span>
                    <span className={`font-bold text-blue-500`}>12</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`flex-1 transition-colors duration-300 ${
          theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
        }`}>
          <div className="p-8">
            {/* Content Header */}
            <div className={`mb-8 p-6 rounded-xl ${
              theme === 'dark' ? 'bg-slate-800' : 'bg-white'
            } shadow-sm`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-2xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
                  </h2>
                  <p className={`mt-1 ${
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
                <div className={`px-4 py-2 rounded-lg ${
                  theme === 'dark' ? 'bg-green-600' : 'bg-green-100'
                }`}>
                  <span className={`text-sm font-medium ${
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className={`p-6 rounded-xl ${
                      theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                    } shadow-sm`}>
                      <div className="flex items-center">
                        <div className="p-3 bg-green-100 rounded-xl">
                          <CheckSquare className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Tamamlanan Görev
                          </p>
                          <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            18
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className={`p-6 rounded-xl ${
                      theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                    } shadow-sm`}>
                      <div className="flex items-center">
                        <div className="p-3 bg-orange-100 rounded-xl">
                          <Clock className="h-6 w-6 text-orange-600" />
                        </div>
                        <div className="ml-4">
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Bekleyen Görev
                          </p>
                          <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            3
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className={`p-6 rounded-xl ${
                      theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                    } shadow-sm`}>
                      <div className="flex items-center">
                        <div className="p-3 bg-purple-100 rounded-xl">
                          <FileText className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Dosya Sayısı
                          </p>
                          <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            12
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className={`p-6 rounded-xl ${
                      theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                    } shadow-sm`}>
                      <div className="flex items-center">
                        <div className="p-3 bg-blue-100 rounded-xl">
                          <Package className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Malzeme/Araç
                          </p>
                          <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            8
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className={`max-w-2xl p-8 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                } shadow-sm`}>
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
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
                        className={`w-full px-4 py-3 rounded-lg border transition-colors ${
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
                        className={`w-full px-4 py-3 rounded-lg border transition-colors ${
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
                        className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                          theme === 'dark' 
                            ? 'bg-slate-600 border-slate-500 text-gray-300' 
                            : 'bg-gray-100 border-gray-200 text-gray-500'
                        } cursor-not-allowed`}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
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

              {activeTab === 'tasks' && (
                <div className={`p-8 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                } shadow-sm text-center`}>
                  <CheckSquare className={`mx-auto h-12 w-12 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                  }`} />
                  <h3 className={`mt-4 text-lg font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Görev Yönetimi
                  </h3>
                  <p className={`mt-2 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Görev takip sistemi yakında gelecek!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}
