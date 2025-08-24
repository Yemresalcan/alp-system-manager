'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { getCityOptions } from '@/lib/cities'
import { X, User, Mail, Phone, MapPin } from 'lucide-react'

interface TechnicianEditFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
  technician: {
    id: string
    email: string
    full_name: string
    phone?: string
    technician_details?: {
      address?: string
      specialization?: string
      notes?: string
    }
  } | null
}

export default function TechnicianEditForm({ isOpen, onClose, onSuccess, onToast, technician }: TechnicianEditFormProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    city: 'antalya',
    address: '',
    specialization: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (technician) {
      setFormData({
        full_name: technician.full_name || '',
        phone: technician.phone || '',
        city: technician.city || 'antalya',
        address: technician.technician_details?.address || '',
        specialization: technician.technician_details?.specialization || '',
        notes: technician.technician_details?.notes || ''
      })
    }
  }, [technician])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!technician) return
    
    setLoading(true)
    setError('')

    try {
      // Profil tablosunu güncelle
      console.log('Güncellenecek şehir:', formData.city) // Debug log
      const { data: updateData, error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          city: formData.city
        })
        .eq('id', technician.id)
        .select()

      console.log('Güncelleme sonucu:', updateData) // Debug log
      if (profileError) throw profileError

      // Başarılı mesajı göster
      onToast('success', 'Güncelleme Başarılı', `${formData.full_name} bilgileri güncellendi.`)
      
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Tekniksyen güncelleme hatası:', error)
      const errorMessage = error.message || 'Güncelleme sırasında bir hata oluştu'
      setError(errorMessage)
      onToast('error', 'Güncelleme Hatası', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const newValue = e.target.value
    console.log(`Form alanı değişti: ${e.target.name} = ${newValue}`) // Debug log
    
    setFormData({
      ...formData,
      [e.target.name]: newValue
    })
  }

  if (!isOpen || !technician) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-full">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Tekniksyen Düzenle</h2>
              <p className="text-sm text-gray-600">{technician.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Kişisel Bilgiler */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kişisel Bilgiler</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-2" />
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  name="full_name"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 inline mr-2" />
                  Telefon
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0555 123 45 67"
                />
              </div>

              {/* Şehir Seçimi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Şehir
                </label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {getCityOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Mesleki Bilgiler */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mesleki Bilgiler</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Uzmanlık Alanı
                </label>
                <select
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seçiniz</option>
                  <option value="bilgisayar">Bilgisayar Teknisyeni</option>
                  <option value="network">Ağ Teknisyeni</option>
                  <option value="hardware">Donanım Teknisyeni</option>
                  <option value="software">Yazılım Teknisyeni</option>
                  <option value="printer">Yazıcı Teknisyeni</option>
                  <option value="other">Diğer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Adres
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="İş adresi"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notlar
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tekniksyen hakkında ek notlar..."
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Güncelleniyor...' : 'Güncelle'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
