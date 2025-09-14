'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { taskAPI } from '@/lib/api-client'
import { Task } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import BarcodeScanner from '@/components/BarcodeScanner'
import { useAssignEquipment } from '@/hooks/useEquipmentTracking'
import { EquipmentAssignment, EquipmentType, detectEquipmentType, EQUIPMENT_TYPES } from '@/lib/supabase'
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
  X,
  Scan
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
  modem_serial_number: string // Keep for backward compatibility
  location: string
  notes: string
  photos: File[]
  // New dynamic equipment serials
  equipment_serials: {
    [key in EquipmentType]?: string
  }
}

interface EquipmentTrackingInfo {
  id: string
  serial_number: string
  equipment_type: string
  equipment_label: string
  equipment_icon: string
  assigned_at: string
}

// Keep for backward compatibility
interface ModemTrackingInfo {
  id: string
  serial_number: string
  assigned_at: string
}

export default function TaskWizard({ onComplete, onCancel, onToast }: TaskWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<TaskFormData>({
    task_type: '',
    service_number: '',
    modem_serial_number: '',
    location: '',
    notes: '',
    photos: [],
    equipment_serials: {}
  })
  const [createdTask, setCreatedTask] = useState<Task | null>(null)
  // Multiple barcode scanners for different equipment types
  const [activeBarcodeScanner, setActiveBarcodeScanner] = useState<{
    isOpen: boolean
    equipmentType: EquipmentType | null
  }>({
    isOpen: false,
    equipmentType: null
  })
  // New equipment assignments array
  const [equipmentAssignments, setEquipmentAssignments] = useState<EquipmentTrackingInfo[]>([])
  // Keep for backward compatibility
  const [modemTrackingInfo, setModemTrackingInfo] = useState<ModemTrackingInfo | null>(null)
  const [assigningEquipment, setAssigningEquipment] = useState(false)
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)

  // React Query mutation
  const assignEquipmentMutation = useAssignEquipment()

  // Ekipman atama fonksiyonu (React Query mutation ile)
  const assignEquipmentToTechnician = async (serialNumber: string, source: 'barcode' | 'manual' = 'manual') => {
    if (!serialNumber.trim() || !formData.task_type) {
      console.log('⏩ Ekipman ataması atlandı - eksik bilgi')
      return null
    }

    try {
      setAssigningEquipment(true)
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      console.log('👤 Auth kontrolü:', { user: user?.id, profile_id: user?.user_metadata?.profile_id, error: authError })
      
      if (authError) {
        throw new Error(`Auth hatası: ${authError.message}`)
      }
      
      if (!user) {
        throw new Error('Kullanıcı oturum açmamış')
      }
      
      // Profile ID'yi belirle (önce metadata'dan, yoksa user.id kullan)
      const profileId = user.user_metadata?.profile_id || user.id
      console.log('🆔 Kullanılacak profile_id:', profileId)
      
      if (!profileId) {
        console.warn('⚠️ Profile ID bulunamadı, user metadata:', user.user_metadata)
        throw new Error('Kullanıcı profil bilgisi eksik.')
      }
      
      // React Query mutation kullan
      return new Promise((resolve, reject) => {
        assignEquipmentMutation.mutate({
          serial_number: serialNumber,
          technician_id: profileId,
          assigned_by: user.id,
          task_type: formData.task_type,
          service_number: formData.service_number,
          location: formData.location,
          notes: `${source === 'barcode' ? 'Barkod okutma' : 'Manuel giriş'} ile kullanıma alındı`
        }, {
          onSuccess: (result) => {
            console.log('✅ Ekipman atama başarılı (React Query):', result)
            console.log('📋 API Response Details:', {
              success: result.success,
              message: result.message,
              equipment_id: result.equipment?.id,
              equipment_status: result.equipment?.current_status,
              equipment_type: result.assignment_details?.equipment_type,
              assigned_technician: result.equipment?.assigned_technician_name
            })
            
            // Ekipman tracking bilgisini kaydet  
            const equipmentId = result.equipment?.id || ''
            const equipmentType = result.assignment_details?.equipment_type || 'modem'
            const equipmentLabel = result.assignment_details?.equipment_label || 'Ekipman'
            const equipmentIcon = result.assignment_details?.equipment_icon || '📡'
            
            console.log('🆔 Equipment ID çıkarıldı:', equipmentId, 'Type:', equipmentType)
            
            const equipmentInfo = {
              id: equipmentId,
              serial_number: serialNumber,
              equipment_type: equipmentType,
              equipment_label: equipmentLabel,
              equipment_icon: equipmentIcon,
              assigned_at: result.assignment_details?.assigned_date || new Date().toISOString()
            }
            
            // Add to equipment assignments array
            setEquipmentAssignments(prev => {
              // Remove existing assignment with same serial number
              const filtered = prev.filter(eq => eq.serial_number !== serialNumber)
              return [...filtered, equipmentInfo]
            })
            
            // Keep backward compatibility
            if (equipmentType === 'modem') {
              const modemInfo = {
                id: equipmentId,
                serial_number: serialNumber,
                assigned_at: equipmentInfo.assigned_at
              }
              setModemTrackingInfo(modemInfo)
            }
            
            const sourceText = source === 'barcode' ? 'barkod okutma' : 'manuel giriş'
            onToast('success', `${equipmentIcon} ${equipmentLabel} Kullanımda`, `"${serialNumber}" ${sourceText} ile kullanıma alındı`)
            
            resolve(equipmentInfo)
          },
          onError: (error: any) => {
            console.error('❌ Ekipman atama hatası (React Query):', error)
            
            // Detect equipment type for error fallback
            const equipmentType = detectEquipmentType(serialNumber)
            const equipmentInfo = EQUIPMENT_TYPES[equipmentType]
            
            onToast('error', `⚠️ ${equipmentInfo.label} Uyarısı`, error.message || 'Ekipman ataması yapılamadı')
            
            // API başarısız olsa da ekipman bilgisini manuel kaydet
            const fallbackEquipmentInfo = {
              id: '', // ID yok ama seri numarası var
              serial_number: serialNumber,
              equipment_type: equipmentType,
              equipment_label: equipmentInfo.label,
              equipment_icon: equipmentInfo.icon,
              assigned_at: new Date().toISOString()
            }
            
            setEquipmentAssignments(prev => {
              const filtered = prev.filter(eq => eq.serial_number !== serialNumber)
              return [...filtered, fallbackEquipmentInfo]
            })
            
            // Keep backward compatibility for modem
            if (equipmentType === 'modem') {
              const modemInfo = {
                id: '',
                serial_number: serialNumber,
                assigned_at: fallbackEquipmentInfo.assigned_at
              }
              setModemTrackingInfo(modemInfo)
            }
            
            console.log('⚠️ Ekipman bilgisi manuel kaydedildi (API başarısız)', fallbackEquipmentInfo)
            
            resolve(fallbackEquipmentInfo)
          }
        })
      })
      
    } catch (error) {
      console.error('❌ Ekipman atama genel hatası:', error)
      
      const equipmentType = detectEquipmentType(serialNumber)
      const equipmentInfo = EQUIPMENT_TYPES[equipmentType]
      
      onToast('error', `❌ ${equipmentInfo.label} Hatası`, `Ekipman ataması başarısız: ${error}`)
      
      // Fallback equipment info
      const fallbackEquipmentInfo = {
        id: '',
        serial_number: serialNumber,
        equipment_type: equipmentType,
        equipment_label: equipmentInfo.label,
        equipment_icon: equipmentInfo.icon,
        assigned_at: new Date().toISOString()
      }
      
      setEquipmentAssignments(prev => {
        const filtered = prev.filter(eq => eq.serial_number !== serialNumber)
        return [...filtered, fallbackEquipmentInfo]
      })
      
      // Keep backward compatibility for modem
      if (equipmentType === 'modem') {
        const modemInfo = {
          id: '',
          serial_number: serialNumber,
          assigned_at: fallbackEquipmentInfo.assigned_at
        }
        setModemTrackingInfo(modemInfo)
      }
      
      return fallbackEquipmentInfo
    } finally {
      setAssigningEquipment(false)
    }
  }

  // Seçili görev tipine göre gerekli ekipmanları döndür
  const getRequiredEquipmentTypes = (): EquipmentType[] => {
    if (!formData.task_type) return []
    const taskType = taskTypes.find(t => t.value === formData.task_type)
    return taskType?.requiredEquipment || []
  }

  // Belirli bir ekipman tipi için seri numarası değiştir
  const handleEquipmentSerialChange = (equipmentType: EquipmentType, value: string) => {
    const newEquipmentSerials = {
      ...formData.equipment_serials,
      [equipmentType]: value
    }
    
    setFormData({ 
      ...formData, 
      equipment_serials: newEquipmentSerials,
      // Backward compatibility - modem için eski field'i da güncelle
      modem_serial_number: equipmentType === 'modem' ? value : formData.modem_serial_number
    })
    
    // Önceki timeout'u iptal et
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }
    
    // Eğer değer varsa ve görev tipi seçilmişse atama yap (son 4 hane yeterli)
    if (value.trim().length >= 4 && formData.task_type && !assigningEquipment) {
      debounceTimeout.current = setTimeout(async () => {
        console.log(`⏰ Debounce tamamlandı, ${equipmentType} ataması yapılıyor...`)
        
        // STB için özel handling - otomatik HR/NT tespit
        if (equipmentType === 'stb') {
          const detectedType = detectEquipmentType(value.trim())
          console.log(`🔍 STB tip tespit: ${value.trim()} → ${detectedType}`)
          
          if (detectedType === 'stb_hr' || detectedType === 'stb_nt') {
            // Tespit edilen gerçek STB tipini kullan
            await assignEquipmentToTechnician(value.trim(), 'manual')
          } else {
            // STB olarak tespit edilemedi, varsayılan olarak STB HR olarak işle
            console.log('⚠️ STB tipi tespit edilemedi, STB olarak devam ediliyor')
            await assignEquipmentToTechnician(value.trim(), 'manual')
          }
        } else {
          // Normal ekipman ataması
          await assignEquipmentToTechnician(value.trim(), 'manual')
        }
      }, 1000) // 1 saniye bekle (4 hane için daha hızlı)
    }
  }
  
  // Elle girilen ekipman seri numarasını işle (backward compatibility)
  const handleModemSerialChange = (value: string) => {
    handleEquipmentSerialChange('modem', value)
  }

  // Görev tipi değiştiğinde mevcut ekipman numaraları varsa atama yap
  useEffect(() => {
    if (formData.task_type && !assigningEquipment) {
      // Her ekipman tipi için kontrol et
      Object.entries(formData.equipment_serials).forEach(async ([equipmentType, serialNumber]) => {
        if (serialNumber && serialNumber.trim().length >= 4) {
          // STB için özel kontrol - hem stb_hr hem stb_nt'yi kontrol et
          let alreadyAssigned = false
          if (equipmentType === 'stb') {
            alreadyAssigned = !!equipmentAssignments.find(
              eq => eq.serial_number === serialNumber.trim() && (eq.equipment_type === 'stb_hr' || eq.equipment_type === 'stb_nt')
            )
          } else {
            alreadyAssigned = !!equipmentAssignments.find(
              eq => eq.serial_number === serialNumber.trim() && eq.equipment_type === equipmentType
            )
          }
          
          if (!alreadyAssigned) {
            console.log(`📋 Görev tipi seçildi, mevcut ${equipmentType} numarası için atama yapılıyor...`, serialNumber.trim())
            await assignEquipmentToTechnician(serialNumber.trim(), 'manual')
          }
        }
      })
      
      // Backward compatibility - modem için de kontrol et
      if (formData.modem_serial_number.trim().length >= 4) {
        const alreadyAssigned = equipmentAssignments.find(eq => eq.serial_number === formData.modem_serial_number.trim())
        if (!alreadyAssigned && !modemTrackingInfo && !formData.equipment_serials.modem) {
          console.log('📋 Görev tipi seçildi, mevcut modem numarası için atama yapılıyor (backward compatibility)...')
          assignEquipmentToTechnician(formData.modem_serial_number.trim(), 'manual')
        }
      }
    }
  }, [formData.task_type])

  // Cleanup function for debounce
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [])

  // Basit 4 görev tipi
  const taskTypes = [
    {
      value: 'sadece_modem',
      label: 'Sadece Modem',
      icon: <Cable className="h-8 w-8" />,
      color: 'bg-blue-500',
      description: 'Sadece modem kurulumu',
      requiredEquipment: ['modem'] as EquipmentType[]
    },
    {
      value: 'modem_stb',
      label: 'Modem + STB',
      icon: <div className="flex space-x-1">
        <Cable className="h-4 w-4" />
        <span className="text-lg">📱</span>
      </div>,
      color: 'bg-green-500',
      description: 'Modem ve STB kurulumu (HR/NT otomatik tespit)',
      requiredEquipment: ['modem', 'stb'] as EquipmentType[] // STB tip otomatik tespit edilecek
    },
    {
      value: 'modem_tv',
      label: 'Modem + TV Heryerde',
      icon: <div className="flex space-x-1">
        <Cable className="h-4 w-4" />
        <span className="text-lg">📺</span>
        <span className="text-sm">📻</span>
      </div>,
      color: 'bg-purple-500',
      description: 'Modem, TV ve RF kumanda kurulumu',
      requiredEquipment: ['modem', 'tv', 'rf_remote'] as EquipmentType[]
    },
    {
      value: 'donusum',
      label: 'Dönüşüm',
      icon: <Wrench className="h-8 w-8" />,
      color: 'bg-orange-500',
      description: 'Mevcut bağlantının dönüştürülmesi',
      requiredEquipment: ['modem'] as EquipmentType[]
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

      // Gerekli ekipman kontrolü
      const requiredEquipment = getRequiredEquipmentTypes()
      const missingEquipment = requiredEquipment.filter(equipmentType => {
        const serialValue = formData.equipment_serials[equipmentType]
        return !serialValue || serialValue.trim().length < 4
      })

      if (missingEquipment.length > 0) {
        const missingNames = missingEquipment.map(type => EQUIPMENT_TYPES[type].label).join(', ')
        onToast('error', 'Ekipman Eksik', `Lütfen şu ekipmanların seri numaralarını girin: ${missingNames}`)
        return
      }

      console.log('✅ Tüm gerekli ekipman seri numaraları girildi:', formData.equipment_serials)

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
      const taskPayload: any = {
        technician_id: user.id,
        task_type: formData.task_type,
        service_number: formData.service_number.trim(),
        location: formData.location.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        status: 'in_progress',
        started_at: new Date().toISOString()
      }
      
      // Equipment assignments ekle (dinamik form verilerinden)
      console.log('🔍 Form equipment serials:', formData.equipment_serials)
      console.log('🔍 Equipment assignments state:', equipmentAssignments)
      console.log('🔍 Mevcut modemTrackingInfo (backward compatibility):', modemTrackingInfo)
      
      // Form verilerinden equipment assignments oluştur
      const equipmentAssignmentData: EquipmentAssignment[] = []
      
      Object.entries(formData.equipment_serials).forEach(([equipmentType, serialNumber]) => {
        if (serialNumber && serialNumber.trim()) {
          // STB için özel handling - gerçek assignment tipini bul
          let actualAssignmentInfo = null
          let actualEquipmentType = equipmentType as EquipmentType
          
          if (equipmentType === 'stb') {
            // STB için hem stb_hr hem stb_nt assignment'ını kontrol et
            actualAssignmentInfo = equipmentAssignments.find(
              eq => eq.serial_number === serialNumber.trim() && (eq.equipment_type === 'stb_hr' || eq.equipment_type === 'stb_nt')
            )
            // Eğer assignment varsa gerçek tipini kullan
            if (actualAssignmentInfo) {
              actualEquipmentType = actualAssignmentInfo.equipment_type as EquipmentType
            } else {
              // Assignment yoksa seri numarasından tespit et
              const detectedType = detectEquipmentType(serialNumber.trim())
              if (detectedType === 'stb_hr' || detectedType === 'stb_nt') {
                actualEquipmentType = detectedType
              } else {
                actualEquipmentType = 'stb_hr' // varsayılan
              }
            }
          } else {
            // Normal ekipman için assignment bilgisini bul
            actualAssignmentInfo = equipmentAssignments.find(
              eq => eq.serial_number === serialNumber.trim() && eq.equipment_type === equipmentType
            )
          }
          
          const equipmentInfo = EQUIPMENT_TYPES[actualEquipmentType]
          
          equipmentAssignmentData.push({
            type: actualEquipmentType,
            serial_number: serialNumber.trim(),
            tracking_id: actualAssignmentInfo?.id || undefined,
            assigned_at: actualAssignmentInfo?.assigned_at || new Date().toISOString(),
            usage_notes: `${equipmentInfo?.icon || '🔧'} ${equipmentInfo?.label || actualEquipmentType} - görevde kullanıldı`
          })
          
          console.log(`🔧 Equipment assignment oluşturuldu: ${equipmentType} → ${actualEquipmentType} (${serialNumber.trim()})`)
        }
      })
      
      if (equipmentAssignmentData.length > 0) {
        taskPayload.equipment_assignments = equipmentAssignmentData
        console.log('🔧 Equipment assignments göreve ekleniyor:', equipmentAssignmentData)
      } else {
        console.log('⚠️ Hiçbir ekipman assignment verisi bulunamadı')
      }
      
      // Backward compatibility - modem bilgilerini ekle
      const modemSerial = formData.equipment_serials.modem || formData.modem_serial_number
      if (modemSerial && modemSerial.trim()) {
        taskPayload.modem_serial_number = modemSerial.trim()
        console.log('📋 Modem serial number task\'a ekleniyor (backward compatibility):', modemSerial.trim())
      }
      
      if (modemTrackingInfo) {
        taskPayload.modem_tracking_id = modemTrackingInfo.id
        taskPayload.modem_assigned_at = modemTrackingInfo.assigned_at
        taskPayload.modem_usage_notes = `Modem: ${modemTrackingInfo.serial_number}`
        console.log('🔗 Modem tracking bilgisi göreve ekleniyor (backward compatibility):', {
          id: modemTrackingInfo.id,
          serial: modemTrackingInfo.serial_number,
          assigned_at: modemTrackingInfo.assigned_at
        })
      } else if (equipmentAssignments.length === 0) {
        console.log('⚠️ Hiçbir ekipman ataması yapılmadı')
      }
      
      console.log('📤 Task payload API\'ye gönderiliyor:', taskPayload)
      const result = await taskAPI.createTask(taskPayload)

      console.log('✅ Görev oluşturuldu:', result.data)
      console.log('🔧 Created task equipment assignments:', result.data?.equipment_assignments)
      console.log('📋 Created task modem info (backward compatibility):', {
        modem_serial_number: result.data?.modem_serial_number,
        modem_tracking_id: result.data?.modem_tracking_id,
        modem_assigned_at: result.data?.modem_assigned_at
      })
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

                      {/* Dinamik Ekipman Alanları */}
                      {getRequiredEquipmentTypes().map((equipmentType) => {
                        const equipmentInfo = EQUIPMENT_TYPES[equipmentType]
                        const isSTB = equipmentType === 'stb'
                        
                        const serialValue = formData.equipment_serials[equipmentType] || ''
                        // STB için assignment kontrolü - hem stb_hr hem stb_nt'yi kontrol et
                        const isAssigned = isSTB ? 
                          equipmentAssignments.find(eq => eq.serial_number === serialValue && (eq.equipment_type === 'stb_hr' || eq.equipment_type === 'stb_nt')) :
                          equipmentAssignments.find(eq => eq.serial_number === serialValue && eq.equipment_type === equipmentType)
                        
                        return (
                          <div key={equipmentType}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                              {equipmentInfo.icon} {equipmentInfo.label} Seri Numarası
                              {(equipmentType === 'modem' || isSTB) && ' *'}
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                                value={serialValue}
                                onChange={(e) => handleEquipmentSerialChange(equipmentType, e.target.value)}
                            className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base"
                                placeholder={`${equipmentInfo.label} seri numarası (son 4 hane yeterli) veya barkod okutun`}
                                disabled={assigningEquipment}
                          />
                              {assigningEquipment && (
                                <div className="flex items-center px-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                                </div>
                              )}
                          <Button
                            type="button"
                                onClick={() => setActiveBarcodeScanner({
                                  isOpen: true,
                                  equipmentType: equipmentType
                                })}
                            variant="outline"
                            className="px-3 py-2 sm:py-3"
                                title={`${equipmentInfo.label} Barkod Okut`}
                          >
                            <Scan className="h-4 w-4 sm:h-5 sm:w-5" />
                          </Button>
                        </div>
                            
                            {/* Atama durumu göstergesi kaldırıldı */}
                            
                        <p className="text-xs text-gray-500 mt-1">
                              {isSTB ? 'STB üzerindeki barkodu okutun (HR/NT otomatik tespit edilir)' : `${equipmentInfo.label} üzerindeki barkodu okutarak otomatik doldurabilirsiniz`}
                        </p>
                      </div>
                        )
                      })}
                      
                      {/* Gerekli ekipman yoksa uyarı */}
                      {getRequiredEquipmentTypes().length === 0 && formData.task_type && (
                        <div className="text-center py-4 text-gray-500">
                          <span className="text-2xl">📝</span>
                          <p className="mt-2">Bu görev tipi için ekipman gerekmemektedir</p>
                        </div>
                      )}

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

      {/* Dinamik Barkod Okuyucu */}
      <BarcodeScanner
        isOpen={activeBarcodeScanner.isOpen}
        onClose={() => setActiveBarcodeScanner({ isOpen: false, equipmentType: null })}
        onScan={async (data) => {
          console.log('📥 TaskWizard - Barkod verisi alındı:', data)
          console.log('🎯 Active equipment type:', activeBarcodeScanner.equipmentType)
          
          // Detect equipment type from barcode
          const detectedType = detectEquipmentType(data)
          const detectedInfo = EQUIPMENT_TYPES[detectedType]
          
          // Use the active equipment type if specified, otherwise use detected type
          let targetEquipmentType = activeBarcodeScanner.equipmentType || detectedType
          
          // STB için özel handling - eğer STB scanner açılmışsa ama HR/NT tespit edildiyse
          if (activeBarcodeScanner.equipmentType === 'stb') {
            if (detectedType === 'stb_hr' || detectedType === 'stb_nt') {
              console.log(`🔍 STB scanner - tespit edilen gerçek tip: ${detectedType}`)
              // Form'da 'stb' olarak kaydet ama assignment'ı gerçek tipte yap
              targetEquipmentType = 'stb'
            } else {
              // STB scanner açık ama STB tespit edilemedi
              console.log('⚠️ STB scanner açık ama STB tespit edilemedi, STB olarak devam')
              targetEquipmentType = 'stb'
            }
          }
          
          const targetEquipmentInfo = EQUIPMENT_TYPES[targetEquipmentType]
          
          console.log('🔧 Target equipment type:', targetEquipmentType, targetEquipmentInfo)
          console.log('🔍 Detected equipment type:', detectedType, detectedInfo)
          
          // Update form data for the specific equipment type
          const newEquipmentSerials = {
            ...formData.equipment_serials,
            [targetEquipmentType]: data
          }
          
          setFormData({ 
            ...formData, 
            equipment_serials: newEquipmentSerials,
            // Backward compatibility for modem
            modem_serial_number: targetEquipmentType === 'modem' ? data : formData.modem_serial_number
          })
          
          // Assign equipment (will auto-detect actual STB type in the API)
          await assignEquipmentToTechnician(data, 'barcode')
          
          // Success toast - show detected type if STB
          const displayInfo = (activeBarcodeScanner.equipmentType === 'stb' && (detectedType === 'stb_hr' || detectedType === 'stb_nt')) 
            ? EQUIPMENT_TYPES[detectedType] 
            : targetEquipmentInfo
          onToast('success', 'Başarılı', `${displayInfo.icon} ${displayInfo.label} seri numarası: ${data}`)
          
          // Close scanner
          setActiveBarcodeScanner({ isOpen: false, equipmentType: null })
        }}
        title={activeBarcodeScanner.equipmentType ? 
          `${EQUIPMENT_TYPES[activeBarcodeScanner.equipmentType].icon} ${EQUIPMENT_TYPES[activeBarcodeScanner.equipmentType].label} Okut` : 
          'Ekipman Seri Numarası Okut'
        }
        placeholder={activeBarcodeScanner.equipmentType ? 
          `${EQUIPMENT_TYPES[activeBarcodeScanner.equipmentType].label} üzerindeki barkodu okutun` :
          'Ekipman üzerindeki barkodu okutun'
        }
      />
    </div>
  )
}
