'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useEquipmentExcelUpload, useEquipmentExcelDownload } from '@/hooks/useEquipmentTracking'
import { 
  Upload, 
  FileText, 
  Download, 
  X, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Hash,
  Building,
  Package
} from 'lucide-react'

interface ModemExcelUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

export default function ModemExcelUploadModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onToast 
}: ModemExcelUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // React Query mutations
  const uploadMutation = useEquipmentExcelUpload()
  const downloadMutation = useEquipmentExcelDownload()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    
    if (!file) {
      setSelectedFile(null)
      return
    }

    // Dosya tipi kontrolü
    const validTypes = [
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    ]

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xls|xlsx)$/i)) {
      onToast('error', 'Hata', 'Sadece Excel dosyaları (.xls, .xlsx) kabul edilir')
      e.target.value = ''
      return
    }

    // Dosya boyutu kontrolü (10MB)
    if (file.size > 10 * 1024 * 1024) {
      onToast('error', 'Hata', 'Dosya boyutu 10MB\'dan büyük olamaz')
      e.target.value = ''
      return
    }

    setSelectedFile(file)
    setUploadResult(null)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      onToast('error', 'Hata', 'Lütfen bir dosya seçin')
      return
    }

    try {
      // Kullanıcı bilgilerini al
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Giriş yapmalısınız')
      }

      // FormData oluştur ve validate et
      const formData = new FormData()
      
      // File validation
      if (!selectedFile || !(selectedFile instanceof File)) {
        throw new Error('Geçersiz dosya objesi')
      }
      
      console.log('📁 File details:', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        lastModified: selectedFile.lastModified
      })
      
      formData.append('file', selectedFile)
      formData.append('userId', user.id)

      console.log('📋 Modem Excel dosyası yükleniyor (React Query):', selectedFile.name)

      // React Query mutation kullan
      uploadMutation.mutate(formData, {
        onSuccess: (result) => {
          console.log('✅ Excel upload başarılı:', result)
          setUploadResult(result)
          
          if (result.success) {
            onToast('success', 'Başarılı', result.message)
            onSuccess() // Ana listeyi yenile
          }
        },
        onError: (error: any) => {
          console.error('❌ Excel upload hatası:', error)
          onToast('error', 'Hata', error.message || 'Upload başarısız')
          setUploadResult({ 
            success: false, 
            error: error.message,
            addedCount: 0,
            existingCount: 0,
            errorCount: 0
          })
        }
      })

    } catch (error: any) {
      console.error('❌ Excel upload genel hatası:', error)
      onToast('error', 'Hata', error.message || 'Upload başarısız')
    }
  }

  const handleDownloadTemplate = () => {
    downloadMutation.mutate(undefined, {
      onSuccess: () => {
        onToast('success', 'Template İndirildi', 'Örnek Excel dosyasını indirme tamamlandı')
      },
      onError: (error: any) => {
        console.error('Template indirme hatası:', error)
        onToast('error', 'Hata', error.message || 'Template indirilemedi')
      }
    })
  }

  const resetModal = () => {
    setSelectedFile(null)
    setUploadResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Hash className="h-6 w-6 mr-2 text-blue-600" />
            Modem Listesi Excel Upload
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Template İndir */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Örnek Excel Template
                  </p>
                  <p className="text-xs text-blue-600">
                    Doğru format için örnek dosyayı indirin
                  </p>
                </div>
              </div>
              <Button
                onClick={handleDownloadTemplate}
                variant="outline"
                size="sm"
                disabled={downloadMutation.isPending}
                className="border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
              >
                {downloadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    İndiriliyor...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-1" />
                    Template İndir
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Format Bilgisi */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Package className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-2">Excel Format Kuralları:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs space-y-1">
                  <div>
                    <strong>Gerekli Kolonlar:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Modem Seri Numarası</li>
                      <li>Belge Numarası</li>
                      <li>Firma</li>
                    </ul>
                  </div>
                  <div>
                    <strong>İsteğe Bağlı:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Stok Adı</li>
                      <li>Stok Durumu</li>
                      <li>Depo Hareket Tarihi</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dosya Seçimi */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Excel Dosyası Seç (.xls, .xlsx)
            </label>
            <div className="flex items-center space-x-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex-1"
                disabled={uploadMutation.isPending}
              >
                <Upload className="h-4 w-4 mr-2" />
                Dosya Seç
              </Button>
            </div>
            
            {selectedFile && (
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border">
                <FileText className="h-6 w-6 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Upload Sonucu */}
          {uploadResult && (
            <div className={`p-4 rounded-lg border ${
              uploadResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2 mb-3">
                {uploadResult.success ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                )}
                <p className={`font-medium ${
                  uploadResult.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {uploadResult.success ? 'Upload Başarılı!' : 'Upload Başarısız'}
                </p>
              </div>
              
              {uploadResult.success && (
                <div className="text-sm space-y-3">
                  {/* Ana istatistikler */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      <span>{uploadResult.addedCount} yeni modem eklendi</span>
                    </div>
                    {uploadResult.existingCount > 0 && (
                      <div className="flex items-center space-x-2 text-blue-600">
                        <Package className="h-4 w-4" />
                        <span>{uploadResult.existingCount} modem zaten mevcuttu</span>
                      </div>
                    )}
                    {uploadResult.errorCount > 0 && (
                      <div className="flex items-center space-x-2 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{uploadResult.errorCount} satırda hata</span>
                      </div>
                    )}
                  </div>

                  {/* Mevcut modemler listesi */}
                  {uploadResult.existing && uploadResult.existing.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="font-medium text-blue-900 mb-2">
                        Zaten Sistemde Olan Modemler:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {uploadResult.existing.slice(0, 5).map((serial: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-mono"
                          >
                            {serial}
                          </span>
                        ))}
                        {uploadResult.existing.length > 5 && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded">
                            ...ve {uploadResult.existing.length - 5} tane daha
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        Bu modemler atlanarak sadece yeni olanlar eklendi
                      </p>
                    </div>
                  )}
                </div>
              )}

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mt-3 text-xs space-y-1">
                  <p className="font-medium text-gray-700">Hatalar:</p>
                  {uploadResult.errors.slice(0, 5).map((error: string, index: number) => (
                    <p key={index} className="text-red-600 bg-red-100 px-2 py-1 rounded">
                      • {error}
                    </p>
                  ))}
                  {uploadResult.errors.length > 5 && (
                    <p className="text-gray-500 italic">
                      ...ve {uploadResult.errors.length - 5} hata daha
                    </p>
                  )}
                </div>
              )}

              {uploadResult.existing && uploadResult.existing.length > 0 && (
                <div className="mt-3 text-xs">
                  <p className="font-medium text-gray-700">Mevcut Seri Numaraları:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {uploadResult.existing.slice(0, 5).map((serial: string, index: number) => (
                      <span key={index} className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs">
                        {serial}
                      </span>
                    ))}
                    {uploadResult.existing.length > 5 && (
                      <span className="text-gray-500 italic">
                        ...ve {uploadResult.existing.length - 5} tane daha
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alt Butonlar */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <Button onClick={handleClose} variant="outline">
            {uploadResult?.success ? 'Kapat' : 'İptal'}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            className="min-w-[120px]"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Yükleniyor...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Yükle
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
