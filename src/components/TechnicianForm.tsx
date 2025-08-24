'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { getCityOptions } from '@/lib/cities'
import { X, User, Mail, Phone, MapPin } from 'lucide-react'

interface TechnicianFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

export default function TechnicianForm({ isOpen, onClose, onSuccess, onToast }: TechnicianFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    city: 'antalya',
    address: '',
    specialization: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('Tekniksyen ekleme başladı:', formData.full_name, 'Şehir:', formData.city)
      
      // 1. Kullanıcıyı Supabase Auth'da oluştur
      console.log('1. Auth signup başlıyor...')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            city: formData.city
          }
        }
      })

      if (authError) {
        console.error('Auth error:', authError)
        throw authError
      }
      if (!authData.user) throw new Error('Kullanıcı oluşturulamadı')
      console.log('✅ Auth signup tamamlandı, User ID:', authData.user.id)

      // 2. Trigger'ın çalışması için bekle
      console.log('2. Trigger bekleniyor...')
      await new Promise(resolve => setTimeout(resolve, 3000)) // 3 saniye bekle

      // 3. Şehir bilgisini ZORLA güncelle - Birden fazla deneme
      console.log('3. Şehir bilgisi ZORLA güncelleniyor:', formData.city)
      
      // İlk deneme - UPDATE
      try {
        const { data: updateData, error: updateError } = await supabase
          .from('profiles')
          .update({ 
            city: formData.city,
            full_name: formData.full_name,
            phone: formData.phone 
          })
          .eq('id', authData.user.id)
          .select()
          
        if (updateError) {
          console.error('UPDATE hatası:', updateError)
        } else {
          console.log('✅ UPDATE başarılı:', updateData)
        }
      } catch (updateException) {
        console.error('UPDATE exception:', updateException)
      }

      // İkinci deneme - UPSERT (güvenlik için)
      try {
        const { data: upsertData, error: upsertError } = await supabase
          .from('profiles')
          .upsert({ 
            id: authData.user.id,
            email: formData.email,
            city: formData.city,
            full_name: formData.full_name,
            phone: formData.phone,
            role: 'technician'
          })
          .select()
          
        if (upsertError) {
          console.error('UPSERT hatası:', upsertError)
        } else {
          console.log('✅ UPSERT başarılı:', upsertData)
        }
      } catch (upsertException) {
        console.error('UPSERT exception:', upsertException)
      }

      // Son kontrol - Gerçekten kaydedildi mi?
      const { data: finalCheck } = await supabase
        .from('profiles')
        .select('city, full_name')
        .eq('id', authData.user.id)
        .single()
        
      console.log('Final kontrol - Kaydedilen şehir:', finalCheck?.city)

      // 4. İşlem tamamlandı
      console.log('✅ Tekniksyen ekleme tamamlandı!')
      
      // Başarılı mesajı göster
      onToast('success', 'Tekniksyen Eklendi', `${formData.full_name} (${formData.city}) başarıyla sisteme eklendi.`)
      
      // Formu temizle
      setFormData({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        city: 'antalya',
        address: '',
        specialization: '',
        notes: ''
      })
      
      // Liste yenilemeyi tetikle
      console.log('6. Liste yenileniyor...')
      onSuccess()
      
      // Form'u kapat
      onClose()
    } catch (error: any) {
      console.error('Tekniksyen ekleme hatası:', error)
      const errorMessage = error.message || 'Tekniksyen eklenirken bir hata oluştu'
      setError(errorMessage)
      onToast('error', 'Ekleme Hatası', errorMessage)
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

  if (!isOpen) return null

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
              <h2 className="text-xl font-bold text-gray-900">Yeni Tekniksyen Ekle</h2>
              <p className="text-sm text-gray-600">Tekniksyen bilgilerini girin</p>
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
                  placeholder="Yunus Emre Salcan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-2" />
                  E-posta *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="yunus@alpsistem.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şifre *
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Güvenli şifre"
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
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Ekleniyor...
                </span>
              ) : 'Tekniksyen Ekle'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
