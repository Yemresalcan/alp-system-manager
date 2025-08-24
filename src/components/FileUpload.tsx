'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Upload, X, File, Image, FileText, Archive } from 'lucide-react'

interface FileUploadProps {
  technicianId: string
  onSuccess: () => void
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

const FILE_CATEGORIES = [
  { value: 'report', label: 'Rapor', icon: FileText },
  { value: 'invoice', label: 'Fatura', icon: File },
  { value: 'photo', label: 'Fotoğraf', icon: Image },
  { value: 'document', label: 'Döküman', icon: FileText },
  { value: 'other', label: 'Diğer', icon: Archive }
]

export default function FileUpload({ technicianId, onSuccess, onToast }: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [category, setCategory] = useState('other')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setSelectedFiles(prev => [...prev, ...files])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image
    if (fileType.includes('pdf') || fileType.includes('document')) return FileText
    return File
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      onToast('error', 'Dosya Seçin', 'Lütfen yüklemek için dosya seçin.')
      return
    }

    setUploading(true)
    let successCount = 0
    let errorCount = 0

    try {
      for (const file of selectedFiles) {
        try {
          // Unique file name oluştur
          const fileExt = file.name.split('.').pop()
          const fileName = `${technicianId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

          // Storage'a yükle
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('technician-files')
            .upload(fileName, file)

          if (uploadError) throw uploadError

          // Database'e kaydet
          const { error: dbError } = await supabase
            .from('technician_files')
            .insert({
              technician_id: technicianId,
              file_name: file.name,
              file_path: uploadData.path,
              file_size: file.size,
              file_type: file.type,
              category: category,
              description: description || null,
              uploaded_by: technicianId
            })

          if (dbError) {
            // Storage'dan sil eğer DB'ye kaydedilemezse
            await supabase.storage
              .from('technician-files')
              .remove([fileName])
            throw dbError
          }

          successCount++
        } catch (error) {
          console.error('Dosya yükleme hatası:', error)
          errorCount++
        }
      }

      // Sonuçları bildir
      if (successCount > 0) {
        onToast('success', 'Dosyalar Yüklendi', `${successCount} dosya başarıyla yüklendi.`)
        setSelectedFiles([])
        setDescription('')
        setCategory('other')
        onSuccess()
      }

      if (errorCount > 0) {
        onToast('error', 'Yükleme Hatası', `${errorCount} dosya yüklenemedi.`)
      }

    } catch (error: any) {
      console.error('Genel yükleme hatası:', error)
      onToast('error', 'Yükleme Hatası', 'Dosyalar yüklenirken bir hata oluştu.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Dosya Seçme Alanı */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Dosya Yükle
        </h3>
        <p className="text-gray-600 mb-4">
          Dosyaları sürükleyip bırakın veya seçin
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="*/*"
        />
        <Button
          type="button"
          onClick={() => {
            console.log('Dosya seç butonuna tıklandı')
            fileInputRef.current?.click()
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Dosya Seç
        </Button>
      </div>

      {/* Seçili Dosyalar */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Seçili Dosyalar ({selectedFiles.length})</h4>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => {
              const IconComponent = getFileIcon(file.type)
              return (
                <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <IconComponent className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Kategori ve Açıklama */}
      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategori
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {FILE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Açıklama (Opsiyonel)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dosya açıklaması..."
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Yükleme Butonu */}
      {selectedFiles.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="bg-green-600 hover:bg-green-700 text-white px-6"
          >
            {uploading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Yükleniyor...
              </div>
            ) : (
              `${selectedFiles.length} Dosyayı Yükle`
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
