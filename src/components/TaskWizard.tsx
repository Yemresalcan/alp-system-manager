'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { taskAPI } from '@/lib/api-client'
import { Task, TaskType } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Camera, 
  Upload,
  MapPin,
  Wrench,
  Wifi,
  Cable,
  Truck,
  MoreHorizontal,
  User,
  Hash,
  FileText,
  Calendar,
  Clock,
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

  const handlePhotoUpload = async (files: FileList) => {
    if (!createdTask) return

    const newPhotos = Array.from(files)
    
    // Dosya boyutu kontrolü (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    const oversizedFiles = newPhotos.filter(photo => photo.size > maxSize)
    if (oversizedFiles.length > 0) {
      onToast('error', 'Dosya Çok Büyük', `Dosya boyutu 5MB'dan küçük olmalıdır`)
      return
    }

    // Toplam fotoğraf sayısı kontrolü (max 10)
    if (formData.photos.length + newPhotos.length > 10) {
      onToast('error', 'Çok Fazla Fotoğraf', `En fazla 10 fotoğraf yükleyebilirsiniz`)
      return
    }
    
    // Duplicate kontrolü - dosya adı ve boyutuna göre
    const existingPhotoKeys = formData.photos.map(photo => `${photo.name}-${photo.size}`)
    const uniqueNewPhotos = newPhotos.filter(newPhoto => {
      const photoKey = `${newPhoto.name}-${newPhoto.size}`
      return !existingPhotoKeys.includes(photoKey)
    })

    if (uniqueNewPhotos.length === 0) {
      onToast('error', 'Duplicate Fotoğraf', 'Bu fotoğraflar zaten eklenmiş')
      return
    }

    // Benzersiz fotoğrafları state'e ekle
    setFormData(prev => ({ ...prev, photos: [...prev.photos, ...uniqueNewPhotos] }))

    // Fotoğrafları yükle
    for (const file of uniqueNewPhotos) {
      try {
        const formDataUpload = new FormData()
        formDataUpload.append('task_id', createdTask.id)
        formDataUpload.append('file', file)
        formDataUpload.append('description', `Görev fotoğrafı - ${new Date().toLocaleTimeString()}`)

        const response = await fetch('/api/tasks/photos', {
          method: 'POST',
          body: formDataUpload
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Fotoğraf yüklenemedi')
        }

        onToast('success', 'Başarılı', `${file.name} yüklendi`)
      } catch (error: any) {
        console.error('Fotoğraf yükleme hatası:', error)
        onToast('error', 'Hata', `${file.name} yüklenemedi: ${error.message}`)
        
        // Hata durumunda fotoğrafı state'den kaldır
        setFormData(prev => ({
          ...prev,
          photos: prev.photos.filter(photo => photo !== file)
        }))
      }
    }

    // Input'ları temizle (önemli!)
    const cameraInput = document.getElementById('camera-capture') as HTMLInputElement
    const uploadInput = document.getElementById('photo-upload') as HTMLInputElement
    if (cameraInput) cameraInput.value = ''
    if (uploadInput) uploadInput.value = ''
  }

  const handlePhotoDelete = (index: number) => {
    const photoToDelete = formData.photos[index]
    const newPhotos = formData.photos.filter((_, i) => i !== index)
    setFormData(prev => ({ ...prev, photos: newPhotos }))
    
    // URL'yi serbest bırak (memory leak'i önlemek için)
    URL.revokeObjectURL(URL.createObjectURL(photoToDelete))
    
    onToast('success', 'Fotoğraf Silindi', `${photoToDelete.name} kaldırıldı`)
  }

  const handleComplete = async () => {
    if (!createdTask) return

    try {
      setLoading(true)

      // Görevi tamamlandı olarak işaretle - Yeni API client kullan
      await taskAPI.updateTask({
        id: createdTask.id,
        status: 'completed'
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
      
      {/* Modal Content */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={onCancel}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
                <h1 className="text-xl font-semibold text-gray-900">
                  Yeni Görev Oluştur
                </h1>
              </div>

              {/* Progress */}
              <div className="flex items-center space-x-2">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step <= currentStep
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step < currentStep ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      step
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-160px)]">
            <div className="p-6">
              <div className="max-w-2xl mx-auto space-y-6">
          
                {/* Step 1: İş Tipi Seçimi */}
                {currentStep === 1 && (
                  <div className="text-center">
                    <User className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Hangi işi yapacaksınız?
                    </h2>
                    <p className="text-gray-600 mb-8">
                      Yapacağınız iş tipini seçerek başlayın
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {taskTypes.map((type) => (
                        <button
                          key={type.value}
                          onClick={() => setFormData({ ...formData, task_type: type.value })}
                          className={`p-6 rounded-lg border-2 transition-all ${
                            formData.task_type === type.value
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-16 h-16 rounded-lg ${type.color} flex items-center justify-center mx-auto mb-4 text-white`}>
                            {type.icon}
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {type.label}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {type.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: Hizmet Numarası */}
                {currentStep === 2 && (
                  <div className="text-center">
                    <Hash className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Hizmet Numarası
                    </h2>
                    <p className="text-gray-600 mb-8">
                      Müşterinin hizmet numarasını girin
                    </p>

                    <div className="space-y-6 text-left">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hizmet Numarası *
                        </label>
                        <input
                          type="text"
                          value={formData.service_number}
                          onChange={(e) => setFormData({ ...formData, service_number: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
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
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {/* Kamera ile Çek */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          id="camera-capture"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
                          className="hidden"
                        />
                        <label htmlFor="camera-capture" className="cursor-pointer block">
                          <Camera className="h-12 w-12 text-green-500 mx-auto mb-4" />
                          <p className="text-lg font-medium text-gray-900 mb-2">
                            Kamera ile Çek
                          </p>
                          <p className="text-gray-600">
                            Cihazın kamerasını kullan
                          </p>
                        </label>
                      </div>

                      {/* Galeri/Dosyadan Seç */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          id="photo-upload"
                          multiple
                          accept="image/*"
                          onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
                          className="hidden"
                        />
                        <label htmlFor="photo-upload" className="cursor-pointer block">
                          <Upload className="h-12 w-12 text-green-500 mx-auto mb-4" />
                          <p className="text-lg font-medium text-gray-900 mb-2">
                            Dosyadan Seç
                          </p>
                          <p className="text-gray-600">
                            Galeriden birden fazla seç
                          </p>
                        </label>
                      </div>
                    </div>

                    {/* Yüklenen Fotoğraflar */}
                    {formData.photos.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">
                          Yüklenen Fotoğraflar ({formData.photos.length})
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                          {formData.photos.map((photo, index) => (
                            <div key={`${photo.name}-${photo.size}-${index}`} className="relative">
                              <img
                                src={URL.createObjectURL(photo)}
                                alt={`Fotoğraf ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border"
                              />
                              <button
                                onClick={() => handlePhotoDelete(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                title="Fotoğrafı sil"
                              >
                                ×
                              </button>
                            </div>
                          ))}
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
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex justify-between items-center">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={loading}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Geri</span>
                </Button>
              ) : (
                <div />
              )}

              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  className="flex items-center space-x-2"
                >
                  <span>{loading ? 'İşleniyor...' : 'İleri'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleComplete}
                  disabled={loading || formData.photos.length === 0}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
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
