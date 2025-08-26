'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { InventoryItem } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { getCityInfo } from '@/lib/cities'
import { X, User, Package, Calendar, MapPin } from 'lucide-react'

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
  const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().split('T')[0])
  const [quantities, setQuantities] = useState<{[key: string]: number}>({})
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingTechnicians, setLoadingTechnicians] = useState(false)

  // Tekniksyenleri yükle
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
    } catch (error: any) {
      console.error('Tekniksyenler yüklenirken hata:', error)
      onToast('error', 'Hata', 'Tekniksyenler yüklenemedi')
    } finally {
      setLoadingTechnicians(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadTechnicians()
      setSelectedTechnician('')
      setQuantity(1)
      setAssignmentDate(new Date().toISOString().split('T')[0])
      setNotes('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedTechnician) {
      onToast('error', 'Hata', 'Tekniksyen seçilmeli')
      return
    }

    if (!item) {
      onToast('error', 'Hata', 'Envanter öğesi bulunamadı')
      return
    }

    try {
      setLoading(true)

      // Kullanıcı bilgilerini al
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Kullanıcı bulunamadı')
      }

      // API ile atama yap
      const response = await fetch('/api/inventory/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          technician_id: selectedTechnician,
          inventory_item_id: item.id,
          assigned_by: user.id,
          quantity: quantity,
          expected_return_date: null, // Gelecekte eklenebilir
          notes: notes.trim() || null
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Atama başarısız')
      }

      onToast('success', 'Başarılı', result.message)
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Tekniksyene Ata
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Ürün Bilgisi */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                {item.description && (
                  <p className="text-sm text-gray-600">{item.description}</p>
                )}
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                    {item.category}
                  </span>
                  {item.brand && (
                    <span className="text-xs text-gray-500">{item.brand}</span>
                  )}
                  {item.model && (
                    <span className="text-xs text-gray-500">{item.model}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tekniksyen Seçimi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tekniksyen Seç *
              </label>
              {loadingTechnicians ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Yükleniyor...</span>
                </div>
              ) : (
                <select
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Tekniksyen seçin...</option>
                  {technicians.map((tech) => {
                    const cityInfo = getCityInfo(tech.city)
                    return (
                      <option key={tech.id} value={tech.id}>
                        {tech.full_name} - {cityInfo.name}
                      </option>
                    )
                  })}
                </select>
              )}
            </div>

            {/* Seçilen Tekniksyen Bilgisi */}
            {selectedTechnician && (
              <div className="bg-blue-50 rounded-lg p-3">
                {(() => {
                  const selectedTech = technicians.find(t => t.id === selectedTechnician)
                  if (!selectedTech) return null
                  const cityInfo = getCityInfo(selectedTech.city)
                  
                  return (
                    <div className="flex items-center space-x-3">
                      <User className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">{selectedTech.full_name}</p>
                        <div className="flex items-center space-x-2 text-sm text-blue-700">
                          <MapPin className="h-3 w-3" />
                          <span>{cityInfo.icon} {cityInfo.name}</span>
                          <span>•</span>
                          <span>{selectedTech.email}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Atama Tarihi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Atama Tarihi *
              </label>
              <input
                type="date"
                value={assignmentDate}
                onChange={(e) => setAssignmentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Miktar Seçimi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Atanacak Miktar *
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  min="1"
                  max={item.available_quantity || 1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <span className="text-sm text-gray-600">
                  {item.unit_type || 'adet'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Müsait miktar: {item.available_quantity || 0} {item.unit_type || 'adet'}
              </p>
            </div>

            {/* Notlar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notlar
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Atama ile ilgili notlar..."
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
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
                disabled={loading || loadingTechnicians || !selectedTechnician}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Atanıyor...
                  </div>
                ) : (
                  'Ata'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
