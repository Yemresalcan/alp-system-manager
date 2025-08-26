'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { InventoryItem } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { 
  X, 
  Package, 
  Calendar, 
  DollarSign, 
  Wrench, 
  Shield, 
  Monitor, 
  Car, 
  ShoppingCart,
  Hash,
  FileText,
  MapPin
} from 'lucide-react'

interface InventoryItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  item?: InventoryItem | null
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

export default function InventoryItemModal({ 
  isOpen, 
  onClose, 
  onSave, 
  item, 
  onToast 
}: InventoryItemModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'tool' as InventoryItem['category'],
    brand: '',
    model: '',
    serial_number: '',
    purchase_date: '',
    purchase_price: null as number | null,
    status: 'available' as InventoryItem['status'],
    location: '',
    notes: '',
    total_quantity: 1,
    unit_type: 'adet',
    is_consumable: false,
    min_stock_level: 0
  })
  const [loading, setLoading] = useState(false)

  // Kategori bilgileri
  const categories = [
    { value: 'cable', label: 'Kablo ve Bağlantı', icon: <Wrench className="h-4 w-4" />, color: 'text-blue-600' },
    { value: 'safety', label: 'Güvenlik Ekipmanları', icon: <Shield className="h-4 w-4" />, color: 'text-red-600' },
    { value: 'tool', label: 'El Aletleri', icon: <Wrench className="h-4 w-4" />, color: 'text-green-600' },
    { value: 'device', label: 'Elektronik Cihazlar', icon: <Monitor className="h-4 w-4" />, color: 'text-purple-600' },
    { value: 'vehicle', label: 'Araçlar', icon: <Car className="h-4 w-4" />, color: 'text-yellow-600' },
    { value: 'consumable', label: 'Sarf Malzemeler', icon: <ShoppingCart className="h-4 w-4" />, color: 'text-orange-600' },
    { value: 'other', label: 'Diğer', icon: <Package className="h-4 w-4" />, color: 'text-gray-600' }
  ] as const

  // Durum bilgileri
  const statuses = [
    { value: 'available', label: 'Müsait', color: 'text-green-600' },
    { value: 'assigned', label: 'Atanmış', color: 'text-blue-600' },
    { value: 'maintenance', label: 'Bakımda', color: 'text-yellow-600' },
    { value: 'lost', label: 'Kayıp', color: 'text-red-600' },
    { value: 'retired', label: 'Hizmetten Çıkarıldı', color: 'text-gray-600' }
  ] as const

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        category: item.category || 'tool',
        brand: item.brand || '',
        model: item.model || '',
        serial_number: item.serial_number || '',
        purchase_date: item.purchase_date || '',
        purchase_price: item.purchase_price ?? null,
        status: item.status || 'available',
        location: item.location || '',
        notes: item.notes || '',
        total_quantity: item.total_quantity || 1,
        unit_type: item.unit_type || 'adet',
        is_consumable: item.is_consumable || false,
        min_stock_level: item.min_stock_level || 0
      })
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'tool',
        brand: '',
        model: '',
        serial_number: '',
        purchase_date: '',
        purchase_price: null,
        status: 'available',
        location: '',
        notes: '',
        total_quantity: 1,
        unit_type: 'adet',
        is_consumable: false,
        min_stock_level: 0
      })
    }
  }, [item, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      onToast('error', 'Hata', 'Ürün adı gerekli')
      return
    }

    try {
      setLoading(true)

      // Kullanıcı bilgilerini al
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Kullanıcı bulunamadı')
      }

      const dataToSave = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        category: formData.category,
        brand: formData.brand?.trim() || null,
        model: formData.model?.trim() || null,
        serial_number: formData.serial_number?.trim() || null,
        purchase_date: formData.purchase_date || null,
        purchase_price: formData.purchase_price,
        status: formData.status,
        location: formData.location?.trim() || null,
        notes: formData.notes?.trim() || null,
        total_quantity: formData.total_quantity,
        available_quantity: item?.id ? undefined : formData.total_quantity, // Sadece yeni eklemede
        assigned_quantity: item?.id ? undefined : 0, // Sadece yeni eklemede  
        unit_type: formData.unit_type,
        is_consumable: formData.is_consumable,
        min_stock_level: formData.min_stock_level,
        ...(item?.id ? { id: item.id } : { created_by: user.id })
      }

      if (item?.id) {
        // Güncelleme
        const response = await fetch('/api/inventory', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSave)
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Güncelleme başarısız')
        }

        onToast('success', 'Başarılı', result.message)
      } else {
        // Yeni ekleme
        const response = await fetch('/api/inventory', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSave)
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Ekleme başarısız')
        }

        onToast('success', 'Başarılı', result.message)
      }

      onSave()
      onClose()
    } catch (error: any) {
      console.error('Envanter kayıt hatası:', error)
      onToast('error', 'Hata', error.message || 'Envanter öğesi kaydedilemedi')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {item ? 'Envanter Öğesini Düzenle' : 'Yeni Envanter Öğesi'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Ana Bilgiler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ürün Adı *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Örn: Fiber Optik Kablo 100m"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ürün hakkında detaylı açıklama..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategori *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as InventoryItem['category'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durum
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as InventoryItem['status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {statuses.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Detay Bilgiler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marka
              </label>
              <input
                type="text"
                value={formData.brand || ''}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Örn: Turkcell"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <input
                type="text"
                value={formData.model || ''}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Örn: FO-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seri Numarası
              </label>
              <input
                type="text"
                value={formData.serial_number || ''}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Örn: SN123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Satın Alma Tarihi
              </label>
              <input
                type="date"
                value={formData.purchase_date || ''}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="h-4 w-4 inline mr-1" />
                Satın Alma Fiyatı (₺)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.purchase_price || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  purchase_price: e.target.value ? parseFloat(e.target.value) : null 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="h-4 w-4 inline mr-1" />
                Konum/Lokasyon
              </label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Örn: Depo A-1, Araç #123"
              />
            </div>
          </div>

          {/* Stok ve Miktar Bilgileri */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
              <Hash className="h-4 w-4 mr-2" />
              Stok ve Miktar Bilgileri
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Toplam Miktar *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.total_quantity}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    total_quantity: parseInt(e.target.value) || 1 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birim Türü
                </label>
                <select
                  value={formData.unit_type}
                  onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="adet">Adet</option>
                  <option value="metre">Metre</option>
                  <option value="kilogram">Kilogram</option>
                  <option value="litre">Litre</option>
                  <option value="paket">Paket</option>
                  <option value="kutu">Kutu</option>
                  <option value="rulo">Rulo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Stok Seviyesi
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    min_stock_level: parseInt(e.target.value) || 0 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_consumable}
                  onChange={(e) => setFormData({ ...formData, is_consumable: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Bu bir sarf malzemedir (tüketildikçe azalır)
                </span>
              </label>
            </div>
          </div>

          {/* Notlar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notlar
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ek notlar ve açıklamalar..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={loading}
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Kaydediliyor...
                </div>
              ) : (
                item ? 'Güncelle' : 'Kaydet'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
