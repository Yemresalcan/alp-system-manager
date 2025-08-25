'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { getCityOptions } from '@/lib/cities'
import { X, User, Mail, Phone, MapPin, Lock, Eye, EyeOff, Shuffle } from 'lucide-react'

interface CleanTechnicianFormProps {
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

export default function CleanTechnicianForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onToast, 
  technician 
}: CleanTechnicianFormProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: 'teknisyen123', // Varsayılan şifre
    phone: '',
    city: 'antalya'
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Form verilerini sıfırla/güncelle
  useEffect(() => {
    if (technician) {
      // Düzenleme modu
      setFormData({
        full_name: technician.full_name || '',
        email: technician.email || '',
        password: '', // Şifre güncelleme için boş
        phone: technician.phone || '',
        city: technician.city || 'antalya'
      })
    } else {
      // Yeni ekleme modu
      setFormData({
        full_name: '',
        email: '',
        password: 'teknisyen123', // Varsayılan şifre
        phone: '',
        city: 'antalya'
      })
    }
  }, [technician, isOpen])

  // Random email oluştur
  const generateRandomEmail = () => {
    const randomNum = Math.floor(Math.random() * 10000)
    const domains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com']
    const randomDomain = domains[Math.floor(Math.random() * domains.length)]
    return `teknisyen${randomNum}@${randomDomain}`
  }

  // Email temizle ve düzelt
  const cleanEmail = (email: string): string => {
    if (!email.trim()) return generateRandomEmail()
    
    let cleaned = email.toLowerCase().trim()
    
    // Türkçe karakterleri değiştir
    cleaned = cleaned
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/[^a-z0-9@._-]/g, '') // Sadece geçerli karakterleri bırak
    
    // Eğer @ yoksa gerçek domain ekle
    if (!cleaned.includes('@')) {
      const domains = ['gmail.com', 'outlook.com', 'hotmail.com']
      const randomDomain = domains[Math.floor(Math.random() * domains.length)]
      cleaned = `${cleaned}@${randomDomain}`
    }
    
    // Eğer domain uzantısı yoksa .com ekle
    if (cleaned.includes('@') && !cleaned.split('@')[1].includes('.')) {
      cleaned = `${cleaned}.com`
    }
    
    // Email regex ile kontrol et
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(cleaned)) {
      return generateRandomEmail()
    }
    
    return cleaned
  }

  // Form gönder
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (technician) {
        // GÜNCELLEME MODU - API kullan
        console.log('🔧 Teknisyen güncelleniyor (API):', technician.id)
        
        const response = await fetch('/api/admin/technicians', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: technician.id,
            full_name: formData.full_name,
            phone: formData.phone,
            city: formData.city
          })
        })

        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Güncelleme başarısız')
        }

        console.log('✅ Güncelleme başarılı:', result)
        onToast('success', 'Güncellendi', result.message)
        
      } else {
        // YENİ EKLEME MODU - API kullan
        console.log('🔧 Yeni teknisyen ekleniyor (API)...')
        
        // Email'i temizle ve düzelt
        const cleanedEmail = cleanEmail(formData.email)
        console.log('🔍 Email İşleme:')
        console.log('   Orijinal email:', formData.email)
        console.log('   Temizlenmiş email:', cleanedEmail)
        
        // Email doğrulama - eğer hala geçersizse hata ver
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!emailRegex.test(cleanedEmail)) {
          throw new Error(`Geçersiz email formatı: ${cleanedEmail}`)
        }

        const response = await fetch('/api/admin/technicians', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            full_name: formData.full_name,
            email: cleanedEmail,
            password: formData.password || 'teknisyen123',
            phone: formData.phone,
            city: formData.city
          })
        })

        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Ekleme başarısız')
        }

        console.log('✅ Ekleme başarılı:', result)
        onToast('success', 'Eklendi', result.message)
        
        // Giriş bilgilerini konsola yazdır
        console.log('🔑 Teknisyen Giriş Bilgileri:')
        console.log('Email:', cleanedEmail)
        console.log('Şifre:', formData.password || 'teknisyen123')
      }

      // Başarılı - formu kapat ve listeyi yenile
      onSuccess()
      onClose()
      
    } catch (error: any) {
      console.error('Form hatası:', error)
      onToast('error', 'Hata', error.message || 'İşlem başarısız oldu')
    } finally {
      setLoading(false)
    }
  }

  // Input değişikliği
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // Random email oluştur butonu
  const handleGenerateEmail = () => {
    const randomEmail = generateRandomEmail()
    setFormData({
      ...formData,
      email: randomEmail
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-xl">
          <h2 className="text-xl font-bold">
            {technician ? '✏️ Teknisyeni Düzenle' : '➕ Yeni Teknisyen Ekle'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Ad Soyad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-2 text-blue-500" />
              Ad Soyad
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="örn: Ahmet Yılmaz"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="h-4 w-4 inline mr-2 text-blue-500" />
              Email
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={!!technician} // Düzenlemede email değiştirilemez
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100"
                placeholder="örn: ahmet veya ahmet@example.com"
              />
              {!technician && (
                <Button
                  type="button"
                  onClick={handleGenerateEmail}
                  className="px-3 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  title="Otomatik email oluştur"
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
              )}
            </div>
            {!technician && (
              <p className="text-xs text-gray-500 mt-2 bg-blue-50 p-2 rounded border-l-4 border-blue-400">
                💡 Sadece isim yazabilirsiniz (örn: "ahmet") - otomatik @alpsistem.com eklenir
              </p>
            )}
          </div>

          {/* Şifre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Lock className="h-4 w-4 inline mr-2 text-blue-500" />
              Şifre {technician && <span className="text-gray-500">(değiştirmek için doldurun)</span>}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required={!technician} // Yeni ekleme için zorunlu
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder={technician ? "Yeni şifre (opsiyonel)" : "Şifre"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Telefon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="h-4 w-4 inline mr-2 text-blue-500" />
              Telefon
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="örn: 0555 123 45 67"
            />
          </div>

          {/* Şehir */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 inline mr-2 text-blue-500" />
              Şehir
            </label>
            <select
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              {getCityOptions([]).map((city) => (
                <option key={city.value} value={city.value}>
                  {city.label}
                </option>
              ))}
            </select>
          </div>

          {/* Butonlar */}
          <div className="flex gap-3 pt-6">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg transition-colors"
              disabled={loading}
            >
              ❌ İptal
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors"
              disabled={loading}
            >
              {loading ? '⏳ İşleniyor...' : (technician ? '✅ Güncelle' : '➕ Ekle')}
            </Button>
          </div>

          {/* Bilgi notu */}
          {!technician && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-green-700">
                🔑 <strong>Giriş Bilgileri:</strong> Eklenen teknisyen oluşturulan email ve şifre ile sisteme giriş yapabilir.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
