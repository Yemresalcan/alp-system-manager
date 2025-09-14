'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { 
  Upload, 
  FileText, 
  Download, 
  X, 
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react'

interface ExcelUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

export default function ExcelUploadModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onToast 
}: ExcelUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    // Dosya boyutu kontrolü (5MB)
    if (file.size > 5 * 1024 * 1024) {
      onToast('error', 'Hata', 'Dosya boyutu 5MB\'dan büyük olamaz')
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
      setUploading(true)

      // Kullanıcı bilgilerini al
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Giriş yapmalısınız')
      }

      // FormData oluştur
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('userId', user.id)

      console.log('📊 Excel dosyası yükleniyor:', selectedFile.name)

      // API'ye gönder
      const response = await fetch('/api/inventory/bulk-upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload başarısız')
      }

      setUploadResult(result)
      
      if (result.success) {
        onToast('success', 'Başarılı', result.message)
        onSuccess() // Ana listeyi yenile
      }

    } catch (error: any) {
      console.error('Upload hatası:', error)
      onToast('error', 'Hata', error.message || 'Upload başarısız')
      setUploadResult({ 
        success: false, 
        error: error.message,
        addedCount: 0,
        errorCount: 0
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/inventory/bulk-upload', {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Template indirilemedi')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'envanter_template.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      onToast('success', 'Template İndirildi', 'Örnek Excel dosyasını indirme tamamlandı')

    } catch (error: any) {
      console.error('Template indirme hatası:', error)
      onToast('error', 'Hata', 'Template indirilemedi')
    }
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Excel'den Toplu Envanter Yükle
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          
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
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Download className="h-4 w-4 mr-1" />
                İndir
              </Button>
            </div>
          </div>

          {/* Dosya Seçimi */}
          <div className="space-y-2">
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
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Dosya Seç
              </Button>
            </div>
            
            {selectedFile && (
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <FileText className="h-5 w-5 text-gray-400" />
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
                  <X className="h-4 w-4" />
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
              <div className="flex items-center space-x-2 mb-2">
                {uploadResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <p className={`font-medium ${
                  uploadResult.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {uploadResult.success ? 'Upload Başarılı!' : 'Upload Başarısız'}
                </p>
              </div>
              
              {uploadResult.success && (
                <div className="text-sm text-green-700 space-y-1">
                  <p>✅ {uploadResult.addedCount} öğe eklendi</p>
                  {uploadResult.errorCount > 0 && (
                    <p>⚠️ {uploadResult.errorCount} satırda hata</p>
                  )}
                </div>
              )}

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mt-2 text-xs text-gray-600 space-y-1">
                  <p className="font-medium">Hatalar:</p>
                  {uploadResult.errors.slice(0, 3).map((error: string, index: number) => (
                    <p key={index} className="text-red-600">• {error}</p>
                  ))}
                  {uploadResult.errors.length > 3 && (
                    <p className="text-gray-500">...ve {uploadResult.errors.length - 3} hata daha</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bilgi Kutusu */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-700">
                <p className="font-medium mb-1">Excel Format Kuralları:</p>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  <li><strong>Ürün Adı:</strong> Zorunlu alan</li>
                  <li><strong>Seri Numarası:</strong> Benzersiz olmalı</li>
                  <li><strong>Kategori:</strong> device, cable, tool, safety, vb.</li>
                  <li><strong>Adet:</strong> Sayısal değer (varsayılan: 1)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Alt Butonlar */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <Button onClick={handleClose} variant="outline">
            {uploadResult?.success ? 'Kapat' : 'İptal'}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="min-w-[100px]"
          >
            {uploading ? (
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
