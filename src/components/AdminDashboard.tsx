'use client'

import { useState, useCallback, memo } from 'react'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/supabase'
import { signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { ToastContainer } from '@/components/ui/toast'
import { useToast } from '@/hooks/useToast'
import TechnicianManager from './TechnicianManager'
import TechnicianFileGroups from './TechnicianFileGroups'
import { 
  Users, 
  FileText, 
  CheckSquare, 
  Package, 
  LogOut, 
  Plus
} from 'lucide-react'

interface AdminDashboardProps {
  user: User
  profile: Profile
}

function AdminDashboard({ user, profile }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('technicians')
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

  // Tab değişimi
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
  }

  const menuItems = [
    { id: 'technicians', label: 'Tekniksyenler', icon: Users },
    { id: 'files', label: 'Dosya Yönetimi', icon: FileText },
    { id: 'tasks', label: 'Görev Yönetimi', icon: CheckSquare },
    { id: 'inventory', label: 'Envanter', icon: Package },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Alp Sistem</h1>
              <span className="ml-3 px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                Admin Panel
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Hoş geldiniz, <span className="font-medium">{profile.full_name}</span>
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="flex items-center space-x-2"
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
          <nav className="mt-8 px-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === item.id
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'technicians' && (
              <TechnicianManager onToast={handleToast} />
            )}

            {activeTab === 'files' && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Dosya Yönetimi</h2>
                    <p className="text-gray-600 mt-1">Tekniksyen dosyalarını yönetin</p>
                  </div>
                  <Button
                    onClick={() => alert('Admin panelinde dosya yükleme özelliği yakında eklenecek. Şimdilik tekniksyen panelinden yükleyebilirsiniz.')}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Dosya Yükle</span>
                  </Button>
                </div>
                <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
                  <TechnicianFileGroups
                    onToast={handleToast}
                  />
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Görev Yönetimi</h2>
                    <p className="text-gray-600 mt-1">Tekniksyen görevlerini takip edin</p>
                  </div>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Görev
                  </Button>
                </div>
                <div className="bg-white shadow-sm rounded-lg p-8 border border-gray-200">
                  <p className="text-gray-500 text-center">Görev yönetimi yakında eklenecek...</p>
                </div>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Envanter</h2>
                    <p className="text-gray-600 mt-1">Ekipman ve malzeme takibi</p>
                  </div>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Ürün
                  </Button>
                </div>
                <div className="bg-white shadow-sm rounded-lg p-8 border border-gray-200">
                  <p className="text-gray-500 text-center">Envanter yönetimi yakında eklenecek...</p>
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

export default memo(AdminDashboard)
