'use client'

import { useState, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/supabase'
import { signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/toast'
import FileUploadManager from './FileUploadManager'
import SimpleFileList from './SimpleFileList'
import { 
  User as UserIcon, 
  FileText, 
  CheckSquare, 
  Upload,
  LogOut,
  Settings
} from 'lucide-react'

interface TechnicianDashboardProps {
  user: User
  profile: Profile
}

export default function TechnicianDashboard({ user, profile }: TechnicianDashboardProps) {
  const [activeTab, setActiveTab] = useState('profile')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { toasts, toast, removeToast } = useToast()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const handleToast = (type: 'success' | 'error', title: string, message?: string) => {
    if (type === 'success') {
      toast.success(title, message)
    } else {
      toast.error(title, message)
    }
  }

  const handleFileSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  // Tab değişimi
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
  }

  const menuItems = [
    { id: 'profile', label: 'Profilim', icon: UserIcon },
    { id: 'files', label: 'Dosyalarım', icon: FileText },
    { id: 'tasks', label: 'Görevlerim', icon: CheckSquare },
    { id: 'upload', label: 'Dosya Yükle', icon: Upload },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gray-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Alp Sistem
                </h1>
                <p className="text-xs text-blue-600 font-medium">Tekniksyen Panel</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {profile.full_name}
                </p>
                <p className="text-xs text-blue-600">Tekniksyen</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center space-x-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                <LogOut className="h-4 w-4" />
                <span>Çıkış</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm h-screen sticky top-0 border-r border-gray-200">
          <nav className="mt-8">
            <div className="px-4">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center px-4 py-3 mt-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      activeTab === item.id
                        ? 'bg-gray-900 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'profile' && (
              <div>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-gray-900">Profil Bilgileri</h2>
                  <p className="text-gray-600 mt-1">Kişisel bilgilerinizi güncelleyin</p>
                </div>
                
                <div className="bg-white shadow-sm rounded-lg p-8 border border-gray-200">
                  {/* Profile Header */}
                  <div className="flex items-center mb-8 pb-6 border-b border-gray-200">
                    <div className="h-20 w-20 bg-gray-900 rounded-full flex items-center justify-center mr-6">
                      <UserIcon className="h-10 w-10 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{profile.full_name}</h3>
                      <p className="text-blue-600 font-medium">Tekniksyen</p>
                      <p className="text-gray-500 text-sm mt-1">{profile.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ad Soyad
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        value={profile.full_name}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        E-posta
                      </label>
                      <input
                        type="email"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        value={profile.email}
                        readOnly
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        value={profile.phone || ''}
                        placeholder="Telefon numarası ekleyin"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all duration-200">
                        Bilgileri Güncelle
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

                                {activeTab === 'files' && (
                      <div>
                        <div className="mb-8">
                          <h2 className="text-3xl font-bold text-gray-900">Dosyalarım</h2>
                          <p className="text-gray-600 mt-1">Size ait dosyaları görüntüleyin ve yönetin</p>
                        </div>
                        <div className="bg-white shadow-sm rounded-lg p-8 border border-gray-200">
                          <SimpleFileList
                            technicianId={profile.id}
                            showTechnicianName={false}
                            onToast={handleToast}
                            refreshTrigger={refreshTrigger}
                          />
                        </div>
                      </div>
                    )}

            {activeTab === 'tasks' && (
              <div>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-gray-900">Görevlerim</h2>
                  <p className="text-gray-600 mt-1">Size atanan görevleri görüntüleyin</p>
                </div>
                <div className="bg-white shadow-sm rounded-lg p-8 border border-gray-200">
                  <div className="text-center py-12">
                    <CheckSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Görev Listesi
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Size atanan görevler burada görünecek...
                    </p>
                    <Button variant="outline" className="border-gray-300 text-gray-600 hover:bg-gray-50">
                      Yakında Aktif Olacak
                    </Button>
                  </div>
                </div>
              </div>
            )}

                                  {activeTab === 'upload' && (
                        <div>
                          <div className="mb-8">
                            <h2 className="text-3xl font-bold text-gray-900">Dosya Yükle</h2>
                            <p className="text-gray-600 mt-1">Yeni dosyalar yükleyin</p>
                          </div>
                          <div className="bg-white shadow-sm rounded-lg p-8 border border-gray-200">
                            <FileUploadManager
                              technicianId={profile.id}
                              onSuccess={handleFileSuccess}
                              onToast={handleToast}
                            />
                          </div>
                        </div>
                      )}
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}
