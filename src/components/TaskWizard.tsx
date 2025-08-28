'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          technician_id: user.id,
          task_type: formData.task_type,
          service_number: formData.service_number.trim(),
          location: formData.location.trim() || null,
          notes: formData.notes.trim() || null
        })
      })

      console.log('API Response status:', response.status)
      const result = await response.json()
      console.log('API Response data:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Görev oluşturulamadı')
      }

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
    setFormData(prev => ({ ...prev, photos: [...prev.photos, ...newPhotos] }))

    // Fotoğrafları yükle
    for (const file of newPhotos) {
      try {
        const formData = new FormData()
        formData.append('task_id', createdTask.id)
        formData.append('file', file)
        formData.append('description', `Görev fotoğrafı - ${new Date().toLocaleTimeString()}`)

        const response = await fetch('/api/tasks/photos', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Fotoğraf yüklenemedi')
        }

        onToast('success', 'Başarılı', `${file.name} yüklendi`)
      } catch (error: any) {
        console.error('Fotoğraf yükleme hatası:', error)
        onToast('error', 'Hata', `${file.name} yüklenemedi: ${error.message}`)
      }
    }
  }

  const handleComplete = async () => {
    if (!createdTask) return

    try {
      setLoading(true)

      // Görevi tamamlandı olarak işaretle
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: createdTask.id,
          status: 'completed'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Görev tamamlanamadı')
      }

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onCancel}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
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
                      ? 'bg-blue-600 text-white'
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
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 pb-24">
        <div className="max-w-2xl w-full">
          
          {/* Step 1: İş Tipi Seçimi */}
          {currentStep === 1 && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-8">
                <User className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Hangi işi yapacaksınız?
                </h2>
                <p className="text-gray-600">
                  Yapacağınız iş tipini seçerek başlayın
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {taskTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFormData({ ...formData, task_type: type.value })}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      formData.task_type === type.value
                        ? 'border-blue-500 bg-blue-50'
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
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-8">
                <Hash className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Hizmet Numarası
                </h2>
                <p className="text-gray-600">
                  Müşterinin hizmet numarasını girin
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hizmet Numarası *
                  </label>
                  <input
                    type="text"
                    value={formData.service_number}
                    onChange={(e) => setFormData({ ...formData, service_number: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ek bilgiler (opsiyonel)"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Fotoğraf Yükleme */}
          {currentStep === 3 && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-8">
                <Camera className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Fotoğrafları Ekleyin
                </h2>
                <p className="text-gray-600">
                  Yaptığınız işin fotoğraflarını çekerek görevi tamamlayın
                </p>
              </div>

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
                    <Camera className="h-12 w-12 text-blue-500 mx-auto mb-4" />
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
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Fotoğraf ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="h-5 w-5 text-green-600 bg-white rounded-full" />
                        </div>
                        <button
                          onClick={() => {
                            const newPhotos = formData.photos.filter((_, i) => i !== index)
                            setFormData(prev => ({ ...prev, photos: newPhotos }))
                          }}
                          className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.photos.length === 0 && (
                <div className="text-center text-gray-500 mb-6">
                  <p>Henüz fotoğraf eklenmedi</p>
                  <p className="text-sm">En az 1 fotoğraf eklemelisiniz</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Geri</span>
          </Button>

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
  )
}
