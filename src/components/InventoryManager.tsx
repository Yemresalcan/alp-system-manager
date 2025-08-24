'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { getCityInfo } from '@/lib/cities'
import InventoryItemModal from './InventoryItemModal'
import AssignInventoryModal from './AssignInventoryModal'
import { 
  Package, 
  Plus, 
  Edit2, 
  Trash2, 
  User, 
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  Calendar,
  DollarSign,
  Wrench,
  Shield,
  Monitor,
  Car,
  ShoppingCart
} from 'lucide-react'

interface InventoryItem {
  id: string
  name: string
  description: string | null
  category: string
  brand: string | null
  model: string | null
  serial_number: string | null
  purchase_date: string | null
  purchase_price: number | null
  status: string
  notes: string | null
  created_at: string
}

interface TechnicianAssignment {
  id: string
  technician_id: string
  inventory_item_id: string
  assigned_date: string
  return_date: string | null
  status: string
  notes: string | null
  technician_name: string
  technician_city: string
  inventory_item: InventoryItem
}

interface Technician {
  id: string
  full_name: string
  email: string
  city: string
}

interface InventoryManagerProps {
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

export default function InventoryManager({ onToast }: InventoryManagerProps) {
  const [activeTab, setActiveTab] = useState('items') // 'items', 'assignments'
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [assignments, setAssignments] = useState<TechnicianAssignment[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Modal states
  const [showItemModal, setShowItemModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [assigningItem, setAssigningItem] = useState<InventoryItem | null>(null)

  // Envanter öğelerini yükle
  const loadInventoryItems = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setInventoryItems(data || [])
    } catch (error: any) {
      console.error('Envanter yüklenirken hata:', error)
      onToast('error', 'Hata', 'Envanter öğeleri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  // Atamaları yükle
  const loadAssignments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('technician_inventory')
        .select(`
          *,
          profiles:technician_id (full_name, city),
          inventory_items:inventory_item_id (*)
        `)
        .eq('status', 'assigned')
        .order('assigned_date', { ascending: false })

      if (error) throw error

      const formattedAssignments = (data || []).map(assignment => ({
        ...assignment,
        technician_name: (assignment.profiles as any)?.full_name || 'Bilinmiyor',
        technician_city: (assignment.profiles as any)?.city || 'Bilinmiyor',
        inventory_item: assignment.inventory_items as InventoryItem
      }))

      setAssignments(formattedAssignments)
    } catch (error: any) {
      console.error('Atamalar yüklenirken hata:', error)
      onToast('error', 'Hata', 'Atamalar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  // Tekniksyenleri yükle
  const loadTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, city')
        .eq('role', 'technician')
        .order('full_name')

      if (error) throw error
      setTechnicians(data || [])
    } catch (error: any) {
      console.error('Tekniksyenler yüklenirken hata:', error)
    }
  }

  useEffect(() => {
    loadInventoryItems()
    loadAssignments()
    loadTechnicians()
  }, [])

  // Modal handlers
  const handleAddItem = () => {
    setEditingItem(null)
    setShowItemModal(true)
  }

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item)
    setShowItemModal(true)
  }

  const handleAssignItem = (item: InventoryItem) => {
    setAssigningItem(item)
    setShowAssignModal(true)
  }

  const handleDeleteItem = async (item: InventoryItem) => {
    if (!confirm(`"${item.name}" öğesini silmek istediğinize emin misiniz?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', item.id)

      if (error) throw error

      onToast('success', 'Başarılı', 'Envanter öğesi silindi')
      loadInventoryItems()
    } catch (error: any) {
      console.error('Silme hatası:', error)
      onToast('error', 'Hata', 'Envanter öğesi silinemedi')
    }
  }

  const handleReturnItem = async (assignment: TechnicianAssignment) => {
    if (!confirm(`Bu öğeyi geri almak istediğinize emin misiniz?`)) {
      return
    }

    try {
      // Atama kaydını güncelle
      const { error: assignError } = await supabase
        .from('technician_inventory')
        .update({ 
          status: 'returned',
          return_date: new Date().toISOString()
        })
        .eq('id', assignment.id)

      if (assignError) throw assignError

      // Envanter öğesinin durumunu güncelle
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ status: 'available' })
        .eq('id', assignment.inventory_item_id)

      if (updateError) throw updateError

      onToast('success', 'Başarılı', 'Envanter öğesi geri alındı')
      loadInventoryItems()
      loadAssignments()
    } catch (error: any) {
      console.error('Geri alma hatası:', error)
      onToast('error', 'Hata', 'Geri alma işlemi başarısız')
    }
  }

  const handleModalSave = () => {
    loadInventoryItems()
    loadAssignments()
  }

  // Kategori bilgileri
  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'cable': return { 
        name: 'Kablo', 
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Wrench className="h-4 w-4" />
      }
      case 'safety': return { 
        name: 'Güvenlik', 
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <Shield className="h-4 w-4" />
      }
      case 'tool': return { 
        name: 'Araç/Gereç', 
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <Wrench className="h-4 w-4" />
      }
      case 'device': return { 
        name: 'Cihaz', 
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: <Monitor className="h-4 w-4" />
      }
      case 'vehicle': return { 
        name: 'Araç', 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Car className="h-4 w-4" />
      }
      case 'consumable': return { 
        name: 'Sarf Malzeme', 
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: <ShoppingCart className="h-4 w-4" />
      }
      default: return { 
        name: 'Diğer', 
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <Package className="h-4 w-4" />
      }
    }
  }

  // Status renkleri
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'assigned': return 'bg-blue-100 text-blue-800'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800'
      case 'lost': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Filtreleme
  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.brand?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.technician_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.inventory_item.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Yükleniyor...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('items')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'items'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="h-4 w-4 inline mr-2" />
            Envanter Öğeleri ({inventoryItems.length})
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assignments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <User className="h-4 w-4 inline mr-2" />
            Atamalar ({assignments.length})
          </button>
        </nav>
      </div>

      {/* Envanter Öğeleri Tab */}
      {activeTab === 'items' && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Envanter Öğeleri</h3>
              <p className="text-gray-600">Envanter öğelerini yönetin</p>
            </div>
            <Button 
              onClick={handleAddItem}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni Öğe Ekle
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Envanter ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tüm Kategoriler</option>
              <option value="cable">Kablo</option>
              <option value="safety">Güvenlik</option>
              <option value="tool">Araç</option>
              <option value="device">Cihaz</option>
              <option value="vehicle">Araç</option>
              <option value="consumable">Sarf Malzeme</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="available">Müsait</option>
              <option value="assigned">Atanmış</option>
              <option value="maintenance">Bakımda</option>
              <option value="lost">Kayıp</option>
            </select>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const categoryInfo = getCategoryInfo(item.category)
              
              return (
                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {categoryInfo.icon}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${categoryInfo.color}`}>
                        {categoryInfo.name}
                      </span>
                    </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                
                <h4 className="font-semibold text-gray-900 mb-2">{item.name}</h4>
                {item.description && (
                  <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                )}
                
                <div className="space-y-1 text-sm text-gray-600 mb-4">
                  {item.brand && <p><strong>Marka:</strong> {item.brand}</p>}
                  {item.model && <p><strong>Model:</strong> {item.model}</p>}
                  {item.serial_number && <p><strong>Seri No:</strong> {item.serial_number}</p>}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleEditItem(item)}
                      variant="outline"
                      size="sm"
                      className="text-blue-600 hover:bg-blue-50 border-blue-200"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteItem(item)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {item.status === 'available' && (
                    <Button
                      onClick={() => handleAssignItem(item)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white text-xs"
                    >
                      <ArrowRight className="h-3 w-3 mr-1" />
                      Ata
                    </Button>
                  )}
                </div>
              </div>
            )
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Envanter öğesi bulunamadı
              </h3>
              <p className="text-gray-600">
                Arama kriterlerinize uygun envanter öğesi bulunmuyor.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Atamalar Tab */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tekniksyen Atamaları</h3>
            <p className="text-gray-600">Tekniksyenlere atanmış envanter öğeleri</p>
          </div>

          {/* Search */}
          <div className="max-w-md">
            <input
              type="text"
              placeholder="Tekniksyen veya öğe ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Assignments List */}
          <div className="space-y-4">
            {filteredAssignments.map((assignment) => {
              const cityInfo = getCityInfo(assignment.technician_city)
              const categoryInfo = getCategoryInfo(assignment.inventory_item.category)
              
              return (
                <div key={assignment.id} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <User className="h-5 w-5 text-gray-600" />
                        <div>
                          <h4 className="font-semibold text-gray-900">{assignment.technician_name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs ${cityInfo.badgeColor}`}>
                            {cityInfo.icon} {cityInfo.name}
                          </span>
                        </div>
                      </div>
                      
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      
                      <div className="flex items-center space-x-2">
                        {categoryInfo.icon}
                        <div>
                          <h4 className="font-semibold text-gray-900">{assignment.inventory_item.name}</h4>
                          <p className="text-sm text-gray-600">{assignment.inventory_item.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right text-sm text-gray-600">
                        <p className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(assignment.assigned_date).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      
                      <Button
                        onClick={() => handleReturnItem(assignment)}
                        variant="outline"
                        size="sm"
                        className="text-orange-600 hover:bg-orange-50 border-orange-200"
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Geri Al
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredAssignments.length === 0 && (
            <div className="text-center py-12">
              <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Atama bulunamadı
              </h3>
              <p className="text-gray-600">
                Henüz hiç envanter ataması yapılmamış.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <InventoryItemModal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        onSave={handleModalSave}
        item={editingItem}
        onToast={onToast}
      />

      <AssignInventoryModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onSave={handleModalSave}
        item={assigningItem}
        onToast={onToast}
      />
    </div>
  )
}
