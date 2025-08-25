'use client'

import { useState, useEffect, memo } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/toast'
import { getCityInfo } from '@/lib/cities'
import CleanTechnicianForm from './CleanTechnicianForm'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Search,
  Filter
} from 'lucide-react'

interface Technician {
  id: string
  email: string
  full_name: string
  phone: string | null
  city: string
  created_at: string
}

interface TechnicianManagerProps {
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

function TechnicianManager({ onToast }: TechnicianManagerProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [cityFilter, setCityFilter] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null)

  // Tekniksyenleri yükle fonksiyonu
  const loadTechnicians = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, city, created_at')
        .eq('role', 'technician')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTechnicians(data || [])
    } catch (error) {
      console.error('Tekniksyenler yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  // RADIKAL ÇÖZÜM: Basit useEffect, dependency yok ve mount kontrolü
  useEffect(() => {
    loadTechnicians()
  }, [])

  // Filtreleme
  const filteredTechnicians = technicians.filter(tech => {
    const matchesSearch = tech.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tech.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCity = cityFilter === 'all' || tech.city === cityFilter
    return matchesSearch && matchesCity
  })

  // Tekniksyen silme
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${name} adlı tekniksyeni silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/technicians?id=${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Silme başarısız')
      }

      onToast('success', 'Silindi', result.message)
      loadTechnicians()
    } catch (error: any) {
      console.error('Silme hatası:', error)
      onToast('error', 'Hata', error.message || 'Tekniksyen silinemedi')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tekniksyen Yönetimi</h2>
          <p className="text-gray-600 mt-1">Basit ve etkili tekniksyen yönetimi</p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Yeni Tekniksyen
        </Button>
      </div>

      {/* Arama ve Filtreler */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Arama */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="İsim veya email ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Şehir Filtresi */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">Tüm Şehirler</option>
              <option value="antalya">🏖️ Antalya</option>
              <option value="bursa">🌿 Bursa</option>
              <option value="eskisehir">🎭 Eskişehir</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tekniksyen Listesi */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Yükleniyor...</p>
          </div>
        ) : filteredTechnicians.length === 0 ? (
          <div className="p-8 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Tekniksyen bulunamadı</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTechnicians.map((tech) => {
              const cityInfo = getCityInfo(tech.city)
              return (
                <div key={tech.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold bg-${cityInfo.color}-500`}>
                        {tech.full_name.charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Bilgiler */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{tech.full_name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {tech.email}
                          </span>
                          {tech.phone && (
                            <span className="flex items-center">
                              <Phone className="h-4 w-4 mr-1" />
                              {tech.phone}
                            </span>
                          )}
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {cityInfo.icon} {cityInfo.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Aksiyonlar */}
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => setEditingTechnician(tech)}
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(tech.id, tech.full_name)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{technicians.length}</div>
          <div className="text-sm text-gray-600">Toplam Tekniksyen</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-blue-500">{technicians.filter(t => t.city === 'antalya').length}</div>
          <div className="text-sm text-gray-600">🏖️ Antalya</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-green-500">{technicians.filter(t => t.city === 'bursa').length}</div>
          <div className="text-sm text-gray-600">🌿 Bursa</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-yellow-500">{technicians.filter(t => t.city === 'eskisehir').length}</div>
          <div className="text-sm text-gray-600">🎭 Eskişehir</div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      <CleanTechnicianForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSuccess={loadTechnicians}
        onToast={onToast}
      />
      
      <CleanTechnicianForm
        isOpen={!!editingTechnician}
        onClose={() => setEditingTechnician(null)}
        onSuccess={loadTechnicians}
        onToast={onToast}
        technician={editingTechnician}
      />
    </div>
  )
}

export default memo(TechnicianManager)
