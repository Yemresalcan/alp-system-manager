'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { 
  Upload, 
  File, 
  X, 
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'

interface FileUploadManagerProps {
  technicianId: string
  onSuccess: () => void
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

interface UploadingFile {
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

export default function FileUploadManager({ 
  technicianId, 
  onSuccess, 
  onToast 
}: FileUploadManagerProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [dragActive, setDragActive] = useState(false)

  // Dosya yükleme fonksiyonu
  const uploadFile = useCallback(async (file: File) => {
    const fileId = Math.random().toString(36).substr(2, 9)
    const fileName = `${Date.now()}-${file.name}`
    const filePath = `${technicianId}/${fileName}`

    // Upload state'i güncelle
    setUploadingFiles(prev => [...prev, {
      file,
      progress: 0,
      status: 'uploading'
    }])

    try {
      // 1. Dosyayı Supabase Storage'a yükle
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('technician-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Database'e kaydet
      const { error: dbError } = await supabase
        .from('technician_files')
        .insert({
          technician_id: technicianId,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          file_type: file.type
        })

      if (dbError) throw dbError

      // Success
      setUploadingFiles(prev => 
        prev.map(f => 
          f.file === file 
            ? { ...f, progress: 100, status: 'success' }
            : f
        )
      )

      onToast('success', 'Yüklendi', `${file.name} başarıyla yüklendi`)
      onSuccess()

      // 2 saniye sonra listeden kaldır
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.file !== file))
      }, 2000)

    } catch (error: any) {
      console.error('Upload error:', error)
      
      setUploadingFiles(prev => 
        prev.map(f => 
          f.file === file 
            ? { ...f, status: 'error', error: error.message }
            : f
        )
      )

      onToast('error', 'Yükleme Hatası', error.message)
    }
  }, [technicianId, onSuccess, onToast])

  // Dosya seçimi
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    Array.from(files).forEach(file => {
      // Dosya boyutu kontrolü (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        onToast('error', 'Dosya Çok Büyük', `${file.name} 10MB'dan büyük olamaz`)
        return
      }

      uploadFile(file)
    })
  }, [uploadFile, onToast])

  // Drag & Drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [handleFileSelect])

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Dosya Yükle
        </h3>
        <p className="text-gray-600 mb-4">
          Dosyaları buraya sürükleyin veya seçmek için tıklayın
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Maksimum dosya boyutu: 10MB
        </p>
        
        <input
          type="file"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          id="file-upload"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
        />
        
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="h-4 w-4 mr-2" />
            Dosya Seç
          </label>
        </Button>
      </div>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">Yüklenen Dosyalar</h4>
          {uploadingFiles.map((uploadFile, index) => (
            <div
              key={index}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
            >
              <File className="h-5 w-5 text-gray-500" />
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {uploadFile.file.name}
                </p>
                <p className="text-sm text-gray-500">
                  {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {uploadFile.status === 'uploading' && (
                  <>
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                    <span className="text-sm text-blue-600">Yükleniyor...</span>
                  </>
                )}
                
                {uploadFile.status === 'success' && (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">Başarılı</span>
                  </>
                )}
                
                {uploadFile.status === 'error' && (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600">Hata</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
