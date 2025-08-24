'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { X, Package, Calendar, DollarSign } from 'lucide-react'

interface InventoryItem {
  id?: string
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
    category: 'tool',
    brand: '',
    model: '',
    serial_number: '',
    purchase_date: '',
    purchase_price: null as number | null,
    status: 'available',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

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
        purchase_price: item.purchase_price,
        status: item.status || 'available',
        notes: item.notes || ''
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
        notes: ''
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
        notes: formData.notes?.trim() || null
      }

      if (item?.id) {
        // Güncelleme
        const { error } = await supabase
          .from('inventory_items')
          .update(dataToSave)
          .eq('id', item.id)

        if (error) throw error
        onToast('success', 'Başarılı', 'Envanter öğesi güncellendi')
      } else {
        // Yeni ekleme
        const { error } = await supabase
          .from('inventory_items')
          .insert([dataToSave])

        if (error) throw error
        onToast('success', 'Başarılı', 'Yeni envanter öğesi eklendi')
      }

      onSave()
      onClose()
    } catch (error: any) {
      console.error('Envanter kayıt hatası:', error)
      onToast('error', 'Hata', 'Envanter öğesi kaydedilemedi')
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
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="cable">Kablo</option>
                <option value="safety">Güvenlik Ekipmanı</option>
                <option value="tool">Araç/Gereç</option>
                <option value="device">Elektronik Cihaz</option>
                <option value="vehicle">Araç</option>
                <option value="consumable">Sarf Malzeme</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durum
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="available">Müsait</option>
                <option value="assigned">Atanmış</option>
                <option value="maintenance">Bakımda</option>
                <option value="lost">Kayıp</option>
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
