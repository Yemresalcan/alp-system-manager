'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { getCityOptions } from '@/lib/cities'
import { X, User, Mail, Phone, MapPin, Lock } from 'lucide-react'

interface SimpleTechnicianFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
  technician?: {
    id: string
    full_name: string
    email: string
    phone: string | null
    city: string
  } | null
}

export default function SimpleTechnicianForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onToast, 
  technician 
}: SimpleTechnicianFormProps) {
  const [formData, setFormData] = useState({
    full_name: technician?.full_name || '',
    email: technician?.email || '',
    password: '',
    phone: technician?.phone || '',
    city: technician?.city || 'antalya'
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (technician) {
        // Güncelleme
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            city: formData.city
          })
          .eq('id', technician.id)

        if (error) throw error
        onToast('success', 'Güncellendi', `${formData.full_name} bilgileri güncellendi`)
      } else {
        // Yeni ekleme - Güvenli yaklaşım
        console.log('Yeni kullanıcı ekleniyor:', formData.email)
        
        try {
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
            console.error('Auth hatası:', authError)
            throw new Error(`Kullanıcı oluşturulamadı: ${authError.message}`)
          }
          
          if (!authData.user) {
            throw new Error('Kullanıcı verisi alınamadı')
          }

          console.log('Auth başarılı, User ID:', authData.user.id)

          // Trigger'ın çalışması için bekle
          await new Promise(resolve => setTimeout(resolve, 3000))

          // Profil var mı kontrol et
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', authData.user.id)
            .single()

          if (!existingProfile) {
            // Manuel profil oluştur
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: authData.user.id,
                email: formData.email,
                full_name: formData.full_name,
                phone: formData.phone,
                city: formData.city,
                role: 'technician'
              })
              
            if (insertError) {
              console.error('Profil insert hatası:', insertError)
              throw new Error(`Profil oluşturulamadı: ${insertError.message}`)
            }
          } else {
            // Profil var, güncelle
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                full_name: formData.full_name,
                phone: formData.phone,
                city: formData.city,
                role: 'technician'
              })
              .eq('id', authData.user.id)
              
            if (updateError) {
              console.error('Profil update hatası:', updateError)
              throw new Error(`Profil güncellenemedi: ${updateError.message}`)
            }
          }

          console.log('Profil işlemi tamamlandı')
          onToast('success', 'Eklendi', `${formData.full_name} başarıyla eklendi`)
          
        } catch (authException) {
          console.error('Auth exception:', authException)
          throw authException
        }
      }

      onSuccess()
      onClose()
      
      // Formu temizle
      setFormData({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        city: 'antalya'
      })
    } catch (error: any) {
      console.error('Form hatası:', error)
      onToast('error', 'Hata', error.message || 'İşlem başarısız')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {technician ? 'Tekniksyen Düzenle' : 'Yeni Tekniksyen'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Ad Soyad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-2" />
              Ad Soyad
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Yunus Emre Salcan"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="h-4 w-4 inline mr-2" />
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={!!technician}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              placeholder="yunus@alpsistem.com"
            />
          </div>

          {/* Şifre - Sadece yeni ekleme için */}
          {!technician && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="h-4 w-4 inline mr-2" />
                Şifre
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Güvenli şifre"
              />
            </div>
          )}

          {/* Telefon */}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0555 123 45 67"
            />
          </div>

          {/* Şehir */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 inline mr-2" />
              Şehir
            </label>
            <select
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {getCityOptions([]).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {technician ? 'Güncelleniyor...' : 'Ekleniyor...'}
                </span>
              ) : (
                technician ? 'Güncelle' : 'Ekle'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
