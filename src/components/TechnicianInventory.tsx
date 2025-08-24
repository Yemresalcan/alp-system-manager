'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Package, 
  Calendar, 
  MapPin,
  DollarSign,
  FileText,
  Wrench,
  Shield,
  Monitor,
  Car,
  ShoppingCart,
  AlertCircle
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
}

interface TechnicianAssignment {
  id: string
  inventory_item_id: string
  assigned_date: string
  notes: string | null
  status: string
  inventory_items: InventoryItem
}

interface TechnicianInventoryProps {
  technicianId: string
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

export default function TechnicianInventory({ technicianId, onToast }: TechnicianInventoryProps) {
  const [assignments, setAssignments] = useState<TechnicianAssignment[]>([])
  const [loading, setLoading] = useState(false)

  // Tekniksyene atanan envanter öğelerini yükle
  const loadMyInventory = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('technician_inventory')
        .select(`
          *,
          inventory_items (*)
        `)
        .eq('technician_id', technicianId)
        .eq('status', 'assigned')
        .order('assigned_date', { ascending: false })

      if (error) throw error

      const formattedAssignments = (data || []).map(assignment => ({
        ...assignment,
        inventory_items: assignment.inventory_items as InventoryItem
      }))

      setAssignments(formattedAssignments)
    } catch (error: any) {
      console.error('Envanter yüklenirken hata:', error)
      onToast('error', 'Hata', 'Envanter öğeleri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (technicianId) {
      loadMyInventory()
    }
  }, [technicianId])

  // Kategori renkleri ve isimleri
  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'cable': return { 
        name: 'Kablo', 
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Wrench className="h-5 w-5" />
      }
      case 'safety': return { 
        name: 'Güvenlik', 
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <Shield className="h-5 w-5" />
      }
      case 'tool': return { 
        name: 'Araç/Gereç', 
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <Wrench className="h-5 w-5" />
      }
      case 'device': return { 
        name: 'Cihaz', 
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: <Monitor className="h-5 w-5" />
      }
      case 'vehicle': return { 
        name: 'Araç', 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Car className="h-5 w-5" />
      }
      case 'consumable': return { 
        name: 'Sarf Malzeme', 
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: <ShoppingCart className="h-5 w-5" />
      }
      default: return { 
        name: 'Diğer', 
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <Package className="h-5 w-5" />
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Yükleniyor...</span>
      </div>
    )
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Henüz size atanmış envanter öğesi yok
        </h3>
        <p className="text-gray-600">
          Admin tarafından size envanter atandığında burada görünecektir.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Size Atanan Envanter Öğeleri</h3>
          <p className="text-gray-600">Toplam {assignments.length} öğe</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignments.map((assignment) => {
          const item = assignment.inventory_items
          const categoryInfo = getCategoryInfo(item.category)
          
          return (
            <div key={assignment.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {categoryInfo.icon}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${categoryInfo.color}`}>
                    {categoryInfo.name}
                  </span>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(assignment.assigned_date).toLocaleDateString('tr-TR')}
                </div>
              </div>
              
              {/* Ürün Bilgileri */}
              <h4 className="font-semibold text-gray-900 mb-2">{item.name}</h4>
              {item.description && (
                <p className="text-gray-600 text-sm mb-3">{item.description}</p>
              )}
              
              {/* Detay Bilgiler */}
              <div className="space-y-1 text-sm text-gray-600 mb-4">
                {item.brand && (
                  <div className="flex items-center">
                    <span className="font-medium w-16">Marka:</span>
                    <span>{item.brand}</span>
                  </div>
                )}
                {item.model && (
                  <div className="flex items-center">
                    <span className="font-medium w-16">Model:</span>
                    <span>{item.model}</span>
                  </div>
                )}
                {item.serial_number && (
                  <div className="flex items-center">
                    <span className="font-medium w-16">Seri No:</span>
                    <span className="font-mono text-xs">{item.serial_number}</span>
                  </div>
                )}
                {item.purchase_price && (
                  <div className="flex items-center">
                    <DollarSign className="h-3 w-3 mr-1" />
                    <span>₺{item.purchase_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              {/* Atama Notları */}
              {assignment.notes && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-start space-x-2">
                    <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Atama Notları:</p>
                      <p className="text-xs text-gray-600">{assignment.notes}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ürün Notları */}
              {item.notes && (
                <div className="pt-3 border-t border-gray-200 mt-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Ürün Notları:</p>
                      <p className="text-xs text-gray-600">{item.notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Özet Bilgi */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <div className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-blue-600" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">Envanter Sorumluluğu</h4>
            <p className="text-xs text-blue-700 mt-1">
              Size atanan tüm envanter öğelerinden sorumlusunuz. Kayıp, hasar veya sorun durumunda 
              lütfen hemen admin ile iletişime geçin.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
