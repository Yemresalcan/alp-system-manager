'use client'

import { useState, useCallback, memo } from 'react'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/supabase'
import { ToastContainer } from '@/components/ui/toast'
import { useToast } from '@/hooks/useToast'
import ModernNavbar from './ModernNavbar'
import TechnicianManager from './TechnicianManager'
import TechnicianFileGroups from './TechnicianFileGroups'
import InventoryManager from './InventoryManager'
import { 
  Users, 
  FileText, 
  CheckSquare, 
  Package,
  BarChart3,
  Calendar
} from 'lucide-react'

interface AdminDashboardProps {
  user: User
  profile: Profile
}

function AdminDashboard({ user, profile }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
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

  // Tab değişimi
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
  }

  const menuItems = [
    { id: 'overview', label: 'Genel Bakış', icon: BarChart3, color: 'blue' },
    { id: 'technicians', label: 'Tekniksyenler', icon: Users, color: 'green' },
    { id: 'files', label: 'Dosya Yönetimi', icon: FileText, color: 'purple' },
    { id: 'tasks', label: 'Görev Yönetimi', icon: CheckSquare, color: 'orange' },
    { id: 'inventory', label: 'Envanter', icon: Package, color: 'red' },
    { id: 'calendar', label: 'Takvim', icon: Calendar, color: 'indigo' },
  ]

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
    }`}>
      {/* Modern Navbar */}
      <ModernNavbar 
        user={user} 
        profile={profile} 
        title="Alp Sistem"
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
              theme === 'dark' ? 'bg-slate-700/50' : 'bg-blue-50'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {profile.full_name?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                <div>
                  <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {profile.full_name}
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Admin Panel
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
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-blue-600 text-white shadow-lg'
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
                Hızlı İstatistikler
              </h4>
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>Aktif Tekniksyen</span>
                    <span className={`font-bold text-green-500`}>12</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>Bekleyen Görev</span>
                    <span className={`font-bold text-orange-500`}>8</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>Tamamlanan</span>
                    <span className={`font-bold text-blue-500`}>47</span>
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
                    {activeTab === 'technicians' && 'Tekniksyen bilgilerini yönetin'}
                    {activeTab === 'files' && 'Dosya yüklemeleri ve paylaşımları'}
                    {activeTab === 'tasks' && 'Görev atamaları ve takibi'}
                    {activeTab === 'inventory' && 'Envanter ve malzeme yönetimi'}
                    {activeTab === 'overview' && 'Sistem genel durumu ve istatistikler'}
                    {activeTab === 'calendar' && 'Randevu ve etkinlik yönetimi'}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-lg ${
                  theme === 'dark' ? 'bg-blue-600' : 'bg-blue-100'
                }`}>
                  <span className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-blue-700'
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className={`p-6 rounded-xl ${
                    theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                  } shadow-sm`}>
                    <div className="flex items-center">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Toplam Tekniksyen
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
                      <div className="p-3 bg-green-100 rounded-xl">
                        <CheckSquare className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Tamamlanan Görev
                        </p>
                        <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          47
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className={`p-6 rounded-xl ${
                    theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                  } shadow-sm`}>
                    <div className="flex items-center">
                      <div className="p-3 bg-orange-100 rounded-xl">
                        <Package className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="ml-4">
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Envanter Öğesi
                        </p>
                        <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          234
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
                          Dosya Paylaşımı
                        </p>
                        <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          156
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'technicians' && (
                <TechnicianManager onToast={handleToast} />
              )}

              {activeTab === 'files' && (
                <TechnicianFileGroups onToast={handleToast} />
              )}

              {activeTab === 'inventory' && (
                <InventoryManager onToast={handleToast} />
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
                    Görev yönetim sistemi yakında gelecek!
                  </p>
                </div>
              )}

              {activeTab === 'calendar' && (
                <div className={`p-8 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                } shadow-sm text-center`}>
                  <Calendar className={`mx-auto h-12 w-12 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                  }`} />
                  <h3 className={`mt-4 text-lg font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Takvim
                  </h3>
                  <p className={`mt-2 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Randevu ve etkinlik takvimi yakında gelecek!
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

export default memo(AdminDashboard)
