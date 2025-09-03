'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { taskAPI } from '@/lib/api-client'
import { Task } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Camera,
  Upload,
  Wrench,
  Wifi,
  Cable,
  Truck,
  MoreHorizontal,
  User,
  Hash,
  X
} from 'lucide-react'

interface TaskWizardProps {
  onComplete: () => void
  onCancel: () => void
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

type Step = 1 | 2 | 3

interface TaskFormData {
  task_type: string
  service_number: string
  location: string
  notes: string
  photos: File[]
}

export default function TaskWizard({ onComplete, onCancel, onToast }: TaskWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<TaskFormData>({
    task_type: '',
    service_number: '',
    location: '',
    notes: '',
    photos: []
  })
  const [createdTask, setCreatedTask] = useState<Task | null>(null)

  // Görev tipleri
  const taskTypes = [
    {
      value: 'fiber_kurulum',
      label: 'Fiber Kurulum',
      icon: <Cable className="h-8 w-8" />,
      color: 'bg-blue-500',
      description: 'Fiber internet bağlantısı kurulumu'
    },
    {
      value: 'normal_kurulum',
      label: 'Normal Kurulum',
      icon: <Wifi className="h-8 w-8" />,
      color: 'bg-green-500',
      description: 'Standart internet bağlantısı kurulumu'
    },
    {
      value: 'fiber_donusum',
      label: 'Fiber Dönüşüm',
      icon: <Wrench className="h-8 w-8" />,
      color: 'bg-purple-500',
      description: 'Mevcut bağlantının fiber\'e dönüştürülmesi'
    },
    {
      value: 'nakil',
      label: 'Nakil',
      icon: <Truck className="h-8 w-8" />,
      color: 'bg-orange-500',
      description: 'Bağlantının başka adrese taşınması'
    },
    {
      value: 'diger',
      label: 'Diğer',
      icon: <MoreHorizontal className="h-8 w-8" />,
      color: 'bg-gray-500',
      description: 'Diğer işlemler'
    }
  ]

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!formData.task_type) {
        onToast('error', 'Hata', 'Lütfen bir iş tipi seçin')
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!formData.service_number.trim()) {
        onToast('error', 'Hata', 'Lütfen hizmet numarasını girin')
        return
      }

      // Görev oluştur
      await createTask()
      setCurrentStep(3)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step)
    }
  }

  const createTask = async () => {
    try {
      setLoading(true)

      // Kullanıcı bilgilerini al
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Kullanıcı bulunamadı')
      }

      console.log('Görev oluşturuluyor...', {
        technician_id: user.id,
        task_type: formData.task_type,
        service_number: formData.service_number
      })

      // Yeni API client kullan
      const result = await taskAPI.createTask({
        technician_id: user.id,
        task_type: formData.task_type,
        service_number: formData.service_number.trim(),
        location: formData.location.trim() || undefined,
        notes: formData.notes.trim() || undefined
      })

      console.log('Görev oluşturuldu:', result.data)
      setCreatedTask(result.data)
      onToast('success', 'Başarılı', 'Görev oluşturuldu')

    } catch (error: any) {
      console.error('Görev oluşturma hatası:', error)
      onToast('error', 'Hata', error.message || 'Görev oluşturulamadı')

      // Hata durumunda geri dön
      setCurrentStep(2)
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      console.log('❌ Dosya seçilmedi')
      return
    }

    if (!createdTask) {
      onToast('error', 'Hata', 'Önce görev oluşturulmalı')
      return
    }

    console.log('📸 Fotoğraf yükleme başladı:', files.length, 'dosya')
    const newPhotos = Array.from(files)

    // Dosya tipi kontrolü
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const invalidFiles = newPhotos.filter(photo => !validTypes.includes(photo.type))
    if (invalidFiles.length > 0) {
      onToast('error', 'Geçersiz Dosya Tipi', 'Sadece JPG, PNG ve WebP dosyaları desteklenir')
      return
    }

    // Dosya boyutu kontrolü (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    const oversizedFiles = newPhotos.filter(photo => photo.size > maxSize)
    if (oversizedFiles.length > 0) {
      onToast('error', 'Dosya Çok Büyük', `Dosya boyutu 5MB'dan küçük olmalıdır`)
      return
    }

    // Toplam fotoğraf sayısı kontrolü (max 10)
    if (formData.photos.length + newPhotos.length > 10) {
      onToast('error', 'Çok Fazla Fotoğraf', `En fazla 10 fotoğraf yükleyebilirsiniz (Şu an: ${formData.photos.length})`)
      return
    }

    // Duplicate kontrolü - daha güvenilir yöntem
    const existingPhotoKeys = formData.photos.map(photo => `${photo.name}-${photo.size}-${photo.lastModified}`)
    const uniqueNewPhotos = newPhotos.filter(newPhoto => {
      const photoKey = `${newPhoto.name}-${newPhoto.size}-${newPhoto.lastModified}`
      return !existingPhotoKeys.includes(photoKey)
    })

    if (uniqueNewPhotos.length === 0) {
      onToast('error', 'Duplicate Fotoğraf', 'Bu fotoğraflar zaten eklenmiş')
      return
    }

    console.log('✅ Geçerli fotoğraflar:', uniqueNewPhotos.length)

    // Önce state'e ekle (UI için)
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...uniqueNewPhotos]
    }))

    // Fotoğrafları tek tek yükle
    let successCount = 0
    let failedPhotos: File[] = []

    for (const file of uniqueNewPhotos) {
      try {
        console.log('📤 Yükleniyor:', file.name, file.size, 'bytes')

        const formDataUpload = new FormData()
        formDataUpload.append('task_id', createdTask.id)
        formDataUpload.append('file', file)
        formDataUpload.append('description', `Görev fotoğrafı - ${new Date().toLocaleString('tr-TR')}`)

        const response = await fetch('/api/tasks/photos', {
          method: 'POST',
          body: formDataUpload,
          headers: {
            // Content-Type'ı FormData için otomatik ayarlanır
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Bilinmeyen hata' }))
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const result = await response.json()
        console.log('✅ Yüklendi:', file.name, result)
        successCount++

      } catch (error: any) {
        console.error('❌ Fotoğraf yükleme hatası:', file.name, error)
        failedPhotos.push(file)

        // Başarısız fotoğrafı state'den kaldır
        setFormData(prev => ({
          ...prev,
          photos: prev.photos.filter(photo => photo !== file)
        }))
      }
    }

    // Sonuç bildirimi
    if (successCount > 0) {
      onToast('success', 'Başarılı', `${successCount} fotoğraf yüklendi`)
    }

    if (failedPhotos.length > 0) {
      onToast('error', 'Kısmi Hata', `${failedPhotos.length} fotoğraf yüklenemedi`)
    }

    // Input'ları temizle (çok önemli!)
    setTimeout(() => {
      try {
        const cameraInput = document.getElementById('camera-capture') as HTMLInputElement
        const uploadInput = document.getElementById('photo-upload') as HTMLInputElement

        if (cameraInput) {
          cameraInput.value = ''
          cameraInput.files = null
          console.log('🧹 Kamera input temizlendi')
        }

        if (uploadInput) {
          uploadInput.value = ''
          uploadInput.files = null
          console.log('🧹 Upload input temizlendi')
        }
      } catch (error) {
        console.warn('Input temizleme hatası:', error)
      }
    }, 200)
  }

  const handlePhotoDelete = (index: number) => {
    const photoToDelete = formData.photos[index]
    if (!photoToDelete) return

    console.log('🗑️ Fotoğraf siliniyor:', photoToDelete.name)

    const newPhotos = formData.photos.filter((_, i) => i !== index)
    setFormData(prev => ({ ...prev, photos: newPhotos }))

    // Memory leak'i önlemek için object URL'yi temizle
    try {
      const objectUrl = URL.createObjectURL(photoToDelete)
      URL.revokeObjectURL(objectUrl)
    } catch (error) {
      console.warn('Object URL temizlenemedi:', error)
    }

    onToast('success', 'Fotoğraf Silindi', `${photoToDelete.name} kaldırıldı`)
  }

  const handleComplete = async () => {
    if (!createdTask) return

    try {
      setLoading(true)

      // Görevi tamamlandı olarak işaretle
      await taskAPI.updateTask({
        id: createdTask.id,
        status: 'completed',
        completed_at: new Date().toISOString()
      })

      onToast('success', 'Tebrikler!', 'Görev başarıyla tamamlandı')
      onComplete()

    } catch (error: any) {
      console.error('Görev tamamlama hatası:', error)
      onToast('error', 'Hata', error.message || 'Görev tamamlanamadı')
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Background Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onCancel} />

      {/* Modal Content - Mobile Optimized */}
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">

          {/* Header - Mobile Optimized */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <button
                  onClick={onCancel}
                  className="p-1 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Yeni Görev Oluştur
                </h1>
              </div>

              {/* Progress - Mobile Optimized */}
              <div className="flex items-center space-x-1 sm:space-x-2">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${step <= currentStep
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                      }`}
                  >
                    {step < currentStep ? (
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      step
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content - Mobile Optimized */}
          <div className="overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-160px)]">
            <div className="p-4 sm:p-6">
              <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">

                {/* Step 1: İş Tipi Seçimi - Mobile Optimized */}
                {currentStep === 1 && (
                  <div className="text-center">
                    <User className="h-10 w-10 sm:h-12 sm:w-12 text-green-600 mx-auto mb-3 sm:mb-4" />
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                      Hangi işi yapacaksınız?
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                      Yapacağınız iş tipini seçerek başlayın
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {taskTypes.map((type) => (
                        <button
                          key={type.value}
                          onClick={() => setFormData({ ...formData, task_type: type.value })}
                          className={`p-4 sm:p-6 rounded-lg border-2 transition-all ${formData.task_type === type.value
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg ${type.color} flex items-center justify-center mx-auto mb-3 sm:mb-4 text-white`}>
                            {type.icon}
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">
                            {type.label}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {type.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: Hizmet Numarası - Mobile Optimized */}
                {currentStep === 2 && (
                  <div className="text-center">
                    <Hash className="h-10 w-10 sm:h-12 sm:w-12 text-green-600 mx-auto mb-3 sm:mb-4" />
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                      Hizmet Numarası
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                      Müşterinin hizmet numarasını girin
                    </p>

                    <div className="space-y-4 sm:space-y-6 text-left">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hizmet Numarası *
                        </label>
                        <input
                          type="text"
                          value={formData.service_number}
                          onChange={(e) => setFormData({ ...formData, service_number: e.target.value })}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base sm:text-lg"
                          placeholder="Örn: 1234567890"
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Konum/Adres
                        </label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base"
                          placeholder="Müşteri adresi (opsiyonel)"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notlar
                        </label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows={3}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base"
                          placeholder="Ek bilgiler (opsiyonel)"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Fotoğraf Yükleme */}
                {currentStep === 3 && (
                  <div className="text-center">
                    <Camera className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Fotoğrafları Ekleyin
                    </h2>
                    <p className="text-gray-600 mb-8">
                      Yaptığınız işin fotoğraflarını çekerek görevi tamamlayın
                    </p>

                    {/* Fotoğraf Yükleme Seçenekleri */}
                    <div className="space-y-4 mb-6">
                      {/* Hidden inputs */}
                      <input
                        type="file"
                        id="camera-capture"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          console.log('📸 Kamera input değişti:', e.target.files?.length)
                          if (e.target.files && e.target.files.length > 0) {
                            handlePhotoUpload(e.target.files)
                          }
                        }}
                        className="hidden"
                        key={`camera-${formData.photos.length}`}
                      />

                      <input
                        type="file"
                        id="photo-upload"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          console.log('📁 Galeri input değişti:', e.target.files?.length)
                          if (e.target.files && e.target.files.length > 0) {
                            handlePhotoUpload(e.target.files)
                          }
                        }}
                        className="hidden"
                        key={`upload-${formData.photos.length}`}
                      />

                      {/* Kamera Butonu */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          console.log('📸 Kamera butonu tıklandı')
                          const input = document.getElementById('camera-capture') as HTMLInputElement
                          if (input) {
                            input.click()
                          }
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault()
                          console.log('📸 Kamera butonu touch edildi')
                          const input = document.getElementById('camera-capture') as HTMLInputElement
                          if (input) {
                            input.click()
                          }
                        }}
                        className="w-full border-2 border-dashed border-gray-300 hover:border-green-400 active:border-green-500 active:bg-green-100 rounded-lg p-6 text-center transition-colors hover:bg-green-50"
                      >
                        <Camera className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">
                          📸 Kamera ile Çek
                        </p>
                        <p className="text-gray-600 text-sm">
                          Arka kamerayı kullanarak fotoğraf çek
                        </p>
                      </button>

                      {/* Galeri Butonu */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          console.log('📁 Galeri butonu tıklandı')
                          const input = document.getElementById('photo-upload') as HTMLInputElement
                          if (input) {
                            input.click()
                          }
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault()
                          console.log('📁 Galeri butonu touch edildi')
                          const input = document.getElementById('photo-upload') as HTMLInputElement
                          if (input) {
                            input.click()
                          }
                        }}
                        className="w-full border-2 border-dashed border-gray-300 hover:border-green-400 active:border-green-500 active:bg-green-100 rounded-lg p-6 text-center transition-colors hover:bg-green-50"
                      >
                        <Upload className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">
                          📁 Galeriden Seç
                        </p>
                        <p className="text-gray-600 text-sm">
                          Galeriden birden fazla fotoğraf seç
                        </p>
                      </button>
                    </div>

                    {/* Debug Bilgisi (geliştirme için) */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="mb-4 p-3 bg-gray-100 rounded-lg text-xs text-gray-600">
                        <p>Debug: Görev ID: {createdTask?.id}</p>
                        <p>Fotoğraf sayısı: {formData.photos.length}</p>
                      </div>
                    )}

                    {/* Yüklenen Fotoğraflar */}
                    {formData.photos.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-3 text-left">
                          Yüklenen Fotoğraflar ({formData.photos.length}/10)
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {formData.photos.map((photo, index) => {
                            // Güvenli object URL oluşturma
                            let imageUrl = ''
                            try {
                              imageUrl = URL.createObjectURL(photo)
                            } catch (error) {
                              console.error('Object URL oluşturulamadı:', error)
                              return null
                            }

                            return (
                              <div key={`${photo.name}-${photo.size}-${photo.lastModified}-${index}`} className="relative group">
                                <div className="aspect-square overflow-hidden rounded-lg border-2 border-gray-200">
                                  <img
                                    src={imageUrl}
                                    alt={`Fotoğraf ${index + 1}`}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    onLoad={() => {
                                      // Image yüklendikten sonra URL'yi temizle
                                      setTimeout(() => URL.revokeObjectURL(imageUrl), 1000)
                                    }}
                                    onError={() => {
                                      console.error('Fotoğraf yüklenemedi:', photo.name)
                                      URL.revokeObjectURL(imageUrl)
                                    }}
                                  />
                                </div>

                                {/* Fotoğraf bilgileri */}
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                  <p className="truncate">{photo.name}</p>
                                  <p>{(photo.size / 1024 / 1024).toFixed(1)} MB</p>
                                </div>

                                {/* Silme butonu */}
                                <button
                                  onClick={() => handlePhotoDelete(index)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600 transition-colors shadow-lg"
                                  title={`${photo.name} fotoğrafını sil`}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {formData.photos.length === 0 && (
                      <div className="text-center text-gray-500 mb-6">
                        <p>Henüz fotoğraf eklenmedi</p>
                        <p className="text-sm">En az 1 fotoğraf eklemelisiniz (Maksimum 10 adet, 5MB/dosya)</p>
                      </div>
                    )}

                    {formData.photos.length > 0 && (
                      <div className="text-center text-green-600 mb-4">
                        <p className="text-sm">
                          {formData.photos.length}/10 fotoğraf yüklendi ✓
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Fotoğrafları ekledikten sonra "Tamamla" butonuna basın
                        </p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Footer - Mobile Optimized */}
          <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50">
            <div className="flex justify-between items-center">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={loading}
                  className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 text-sm sm:text-base"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Geri</span>
                </Button>
              ) : (
                <div />
              )}

              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  className="flex items-center space-x-1 sm:space-x-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-green-600 hover:bg-green-700"
                >
                  <span>{loading ? 'İşleniyor...' : 'İleri'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleComplete}
                  disabled={loading || formData.photos.length === 0}
                  className="flex items-center space-x-1 sm:space-x-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>{loading ? 'Tamamlanıyor...' : 'Görevi Tamamla'}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
