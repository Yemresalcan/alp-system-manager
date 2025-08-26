'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { InventoryItem } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { getCityInfo } from '@/lib/cities'
import { X, User, Package, Calendar, MapPin } from 'lucide-react'
import QuantityInput from './QuantityInput'

interface Technician {
  id: string
  full_name: string
  email: string
  city: string
}

interface AssignInventoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  item: InventoryItem | null
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

export default function AssignInventoryModal({ 
  isOpen, 
  onClose, 
  onSave, 
  item, 
  onToast 
}: AssignInventoryModalProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([])
  const [quantities, setQuantities] = useState<{[key: string]: number}>({})
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingTechnicians, setLoadingTechnicians] = useState(false)

  // Teknisyenleri yükle
  const loadTechnicians = async () => {
    try {
      setLoadingTechnicians(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, city')
        .eq('role', 'technician')
        .order('full_name')

      if (error) throw error
      setTechnicians(data || [])
    } catch (error) {
      console.error('Teknisyenler yüklenirken hata:', error)
      onToast('error', 'Hata', 'Teknisyenler yüklenemedi')
    } finally {
      setLoadingTechnicians(false)
    }
  }

  // Modal açıldığında state'leri sıfırla
  useEffect(() => {
    if (isOpen && item) {
      // Modal ilk açıldığında sadece technician listesini yükle
      // State'leri sıfırlama sadece modal kapatılıp açıldığında
      if (selectedTechnicians.length === 0) {
        setSelectedTechnicians([])
        setQuantities({})
        setNotes('')
      }
      loadTechnicians()
    }
  }, [isOpen])

  // Teknisyen seçim toggle
  const toggleTechnician = (techId: string) => {
    if (selectedTechnicians.includes(techId)) {
      // Kaldır
      setSelectedTechnicians(prev => prev.filter(id => id !== techId))
      setQuantities(prev => {
        const newQuantities = { ...prev }
        delete newQuantities[techId]
        return newQuantities
      })
    } else {
      // Ekle
      setSelectedTechnicians(prev => [...prev, techId])
      setQuantities(prev => ({ ...prev, [techId]: 1 }))
    }
  }

  // Miktar güncelle
  const updateQuantity = (techId: string, quantity: number) => {
    const newQuantity = Math.max(1, Math.min(quantity, item?.available_quantity || 1))
    setQuantities(prev => ({ ...prev, [techId]: newQuantity }))
  }

  // Toplam atanacak miktar
  const getTotalAssignQuantity = () => {
    return selectedTechnicians.reduce((sum, techId) => {
      return sum + (quantities[techId] || 1)
    }, 0)
  }

  // Atama işlemi
  const handleAssign = async () => {
    if (selectedTechnicians.length === 0) {
      onToast('error', 'Hata', 'En az bir teknisyen seçmelisiniz')
      return
    }

    const totalAssignQuantity = getTotalAssignQuantity()

    if (totalAssignQuantity > item!.available_quantity) {
      onToast('error', 'Hata', `Toplam atama miktarı (${totalAssignQuantity}) müsait miktardan (${item!.available_quantity}) fazla olamaz`)
      return
    }

    try {
      setLoading(true)

      // Kullanıcı bilgisini al
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Giriş yapmalısınız')
      }

      // Her teknisyen için atama yap
      const assignments = selectedTechnicians.map(techId => ({
        technician_id: techId,
        inventory_item_id: item!.id,
        assigned_by: user.id,
        quantity: quantities[techId] || 1,
        expected_return_date: null,
        notes: notes.trim() || null
      }))

      // Her atamayı tek tek yap (API şu an tek atama destekliyor)
      for (const assignment of assignments) {
        const response = await fetch('/api/inventory/assignments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(assignment)
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Atama başarısız')
        }
      }

      onToast('success', 'Başarılı', `${selectedTechnicians.length} teknisyene başarıyla atama yapıldı`)
      onSave()
      onClose()
    } catch (error: any) {
      console.error('Atama hatası:', error)
      onToast('error', 'Hata', error.message || 'Atama işlemi başarısız')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !item) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Çoklu Teknisyen Ataması
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Ürün Bilgisi */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    {item.category}
                  </span>
                  <span className="text-gray-500">
                    Müsait: {item.available_quantity} {item.unit_type}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Teknisyen Seçimi */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Teknisyenler
            </label>
            
            {loadingTechnicians ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-500 mt-2">Teknisyenler yükleniyor...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                {technicians.map((tech) => {
                  const isSelected = selectedTechnicians.includes(tech.id)
                  const cityInfo = getCityInfo(tech.city)
                  
                  return (
                    <div
                      key={tech.id}
                      className={`p-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTechnician(tech.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{tech.full_name}</p>
                            <p className="text-sm text-gray-500">{tech.email}</p>
                            {tech.city && (
                              <div className="flex items-center space-x-1 mt-1">
                                <MapPin className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {cityInfo?.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Miktar:</span>
                            <QuantityInput
                              techId={tech.id}
                              initialValue={quantities[tech.id] || 1}
                              maxValue={item.available_quantity}
                              onQuantityChange={updateQuantity}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Özet */}
          {selectedTechnicians.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-900 mb-2">Atama Özeti</h4>
              <div className="space-y-1 text-sm">
                <p className="text-blue-800">
                  <span className="font-medium">{selectedTechnicians.length}</span> teknisyen seçildi
                </p>
                <p className="text-blue-800">
                  Toplam atanacak miktar: <span className="font-medium">{getTotalAssignQuantity()}</span> {item.unit_type}
                </p>
                <p className="text-blue-800">
                  Kalan miktar: <span className="font-medium">{item.available_quantity - getTotalAssignQuantity()}</span> {item.unit_type}
                </p>
              </div>
            </div>
          )}

          {/* Notlar */}
          <div className="mb-6">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notlar (Opsiyonel)
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Atama ile ilgili notlar..."
            />
          </div>
        </div>

        {/* Alt Butonlar */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            İptal
          </Button>
          <Button
            onClick={handleAssign}
            disabled={loading || selectedTechnicians.length === 0 || getTotalAssignQuantity() > item.available_quantity}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Atanıyor...</span>
              </div>
            ) : (
              `${selectedTechnicians.length} Teknisyene Ata`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
