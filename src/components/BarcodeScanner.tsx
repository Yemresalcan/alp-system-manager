'use client'

import { useState, useRef, useEffect } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { Button } from '@/components/ui/button'
import { Camera, CameraOff, RotateCcw, Check, X } from 'lucide-react'
import { detectEquipmentType, EQUIPMENT_TYPES } from '@/lib/supabase'

interface BarcodeScannerProps {
  onScan: (data: string) => void
  onClose: () => void
  isOpen: boolean
  title?: string
  placeholder?: string
}

export default function BarcodeScanner({ 
  onScan, 
  onClose, 
  isOpen, 
  title = "Barkod Okut",
  placeholder = "Ekipman seri numarasını okutun (Modem, TV, STB, RF, Uydu Kartı)" 
}: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [scannedData, setScannedData] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')

  // Kamera izni kontrolü
  useEffect(() => {
    if (isOpen) {
      checkCameraPermission()
    }
  }, [isOpen])

  const checkCameraPermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName })
      setCameraPermission(permission.state)
      
      permission.addEventListener('change', () => {
        setCameraPermission(permission.state)
      })
    } catch (err) {
      console.log('Permission API not supported')
    }
  }

  const handleScan = (result: any) => {
    setIsLoading(true)
    console.log('🔍 Ham barkod verisi:', result)
    console.log('🔍 Veri tipi:', typeof result)
    console.log('🔍 Array mi?:', Array.isArray(result))
    
    let scannedValue = ''
    
    // Eğer array ise (detectedCodes)
    if (Array.isArray(result) && result.length > 0) {
      const firstResult = result[0]
      scannedValue = firstResult?.text || firstResult?.rawValue || firstResult?.data || firstResult || ''
      console.log('📱 Arrayden ilk element:', firstResult)
    }
    // Eğer string ise direkt kullan
    else if (typeof result === 'string') {
      scannedValue = result
    }
    // Eğer obje ise property'lerden değer çıkar
    else if (result && typeof result === 'object') {
      scannedValue = result.text || result.rawValue || result.data || result.value || ''
    }
    // Son seçenek olarak string'e dönüştür
    else {
      scannedValue = String(result || '')
    }
    
    console.log('📝 Çıkarılan metin:', scannedValue)
    console.log('📊 Sonuç uzunluğu:', scannedValue.length)
    console.log('📝 Sonuç içeriği:', JSON.stringify(scannedValue))
    
    if (!scannedValue || scannedValue.toString().trim().length === 0) {
      console.error('❌ Boş barkod verisi')
      setError('Barkod verisi boş okundu')
      setIsLoading(false)
      return
    }
    
    let cleanResult = scannedValue.toString().trim()
    
    // Seri numarası formatını kontrol et (SN: ile başlıyorsa)
    if (cleanResult.includes('SN:')) {
      const snMatch = cleanResult.match(/SN:\s*([A-Z0-9]+)/i)
      if (snMatch && snMatch[1]) {
        cleanResult = snMatch[1]
        console.log('🏷️ SN etiketi bulundu, seri numarası:', cleanResult)
      }
    }
    
    // Ekipman tipini tespit et
    const detectedType = detectEquipmentType(cleanResult)
    const equipmentInfo = EQUIPMENT_TYPES[detectedType]
    
    console.log('🔧 Tespit edilen ekipman tipi:', detectedType, equipmentInfo)
    console.log(`${equipmentInfo.icon} ${equipmentInfo.label} - Seri No: ${cleanResult}`)
    
    setScannedData(cleanResult)
    setError('')
    
    // Hemen veri gönder
    console.log('📤 Veri gönderiliyor:', cleanResult)
    onScan(cleanResult)
    
    // Loading'i kaldır ve modalı kapat
    setTimeout(() => {
      setIsLoading(false)
      console.log('⏰ Modal kapatılıyor')
      handleClose()
    }, 1500)
  }

  const handleError = (error: any) => {
    console.error('❌ Barkod okuma hatası:', error)
    setError('Kamera erişimi sağlanamadı veya barkod okunamadı')
  }

  const startScanning = async () => {
    try {
      setError('')
      setScannedData('')
      setIsLoading(false)
      setIsScanning(true)
    } catch (err) {
      setError('Kamera başlatılamadı')
      setIsScanning(false)
      setIsLoading(false)
    }
  }

  const stopScanning = () => {
    setIsScanning(false)
    setScannedData('')
    setIsLoading(false)
  }

  const handleClose = () => {
    console.log('🚪 BarcodeScanner kapanıyor')
    stopScanning()
    setError('')
    setScannedData('')
    onClose()
  }

  const handleManualInput = () => {
    const input = prompt('Modem seri numarasını manuel olarak girin:')
    if (input && input.trim()) {
      console.log('🖋️ Manuel giriş:', input.trim())
      setIsLoading(true)
      setScannedData(input.trim())
      onScan(input.trim())
      setTimeout(() => {
        setIsLoading(false)
        handleClose()
      }, 1000)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">{placeholder}</p>

          {/* Kamera izin durumu */}
          {cameraPermission === 'denied' && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                Kamera erişimi reddedildi. Tarayıcı ayarlarından kamera iznini aktif edin.
              </p>
            </div>
          )}

          {/* Scanner Area */}
          <div className="mb-4">
            {isScanning ? (
              <div className="relative">
                <div className="w-full h-80 bg-gray-900 rounded-lg overflow-hidden">
                  <Scanner
                    onScan={handleScan}
                    onError={handleError}
                    constraints={{
                      facingMode: 'environment', // Arka kamera
                      width: { ideal: 1280 },
                      height: { ideal: 720 }
                    }}
                    scanDelay={100}
                    formats={[
                      'qr_code',
                      'code_128',
                      'code_39',
                      'code_93',
                      'ean_13',
                      'ean_8',
                      'itf',
                      'upc_a',
                      'upc_e'
                    ]}
                  />
                </div>
                
                {/* Tarama çerçevesi - Modem etiketi barkodları için optimize edilmiş */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-96 h-16 border-2 border-white border-dashed rounded-md flex items-center justify-center">
                    <div className="text-white text-center">
                      <Camera className="h-5 w-5 mx-auto mb-1" />
                      <p className="text-xs">Barkodu çerçeveye hizalayın</p>
                    </div>
                  </div>
                </div>

                {/* Loading göstergesi */}
                {isLoading && !scannedData && (
                  <div className="absolute inset-0 bg-blue-500 bg-opacity-75 flex items-center justify-center">
                    <div className="text-white text-center px-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-2"></div>
                      <p className="text-lg font-semibold">İşleniyor...</p>
                      <p className="text-xs mt-1">Barkod verisi analiz ediliyor</p>
                    </div>
                  </div>
                )}

                {/* Başarılı okuma göstergesi */}
                {scannedData && (
                  <div className="absolute inset-0 bg-green-500 bg-opacity-75 flex items-center justify-center">
                    <div className="text-white text-center px-4">
                      <Check className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-lg font-semibold">Başarılı!</p>
                      <p className="text-sm font-mono bg-black bg-opacity-30 rounded px-2 py-1 mt-2">
                        {scannedData}
                      </p>
                      <p className="text-xs mt-1">{isLoading ? 'Veri aktarılıyor...' : 'Tamamlandı!'}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-80 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Camera className="h-16 w-16 mx-auto mb-4" />
                  <p>Barkod okuyucu hazır</p>
                  <p className="text-sm">Modem barkodu okutun veya son 4 haneyi klavye ile girin</p>
                </div>
              </div>
            )}
          </div>

          {/* Hata mesajı */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Kontrol butonları */}
          <div className="flex space-x-3">
            {!isScanning ? (
              <>
                <Button
                  onClick={startScanning}
                  className="flex-1 flex items-center justify-center space-x-2"
                  disabled={cameraPermission === 'denied'}
                >
                  <Camera className="h-4 w-4" />
                  <span>Taramaya Başla</span>
                </Button>
                <Button
                  onClick={handleManualInput}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <span>Manuel Gir</span>
                </Button>
              </>
            ) : (
              <Button
                onClick={stopScanning}
                variant="outline"
                className="flex-1 flex items-center justify-center space-x-2"
              >
                <CameraOff className="h-4 w-4" />
                <span>Taramayı Durdur</span>
              </Button>
            )}
          </div>

          {/* Yardım metni */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-600">
              💡 <strong>İpucu:</strong> Modem etiketindeki <strong>SN:</strong> ile başlayan 
              seri numarası barkodunu yatay olarak çerçeveye hizalayın. İyi aydınlatılmış 
              ortamda, kameraya 15-25 cm mesafede tutun.
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <Button onClick={handleClose} variant="outline">
            İptal
          </Button>
        </div>
      </div>
    </div>
  )
}
