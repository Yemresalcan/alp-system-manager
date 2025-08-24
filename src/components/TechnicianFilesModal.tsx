'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import FileList from './FileList'

interface Technician {
  id: string
  full_name: string
  email: string
}

interface TechnicianFilesModalProps {
  isOpen: boolean
  onClose: () => void
  technician: Technician | null
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

export default function TechnicianFilesModal({ 
  isOpen, 
  onClose, 
  technician, 
  onToast 
}: TechnicianFilesModalProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  if (!isOpen || !technician) return null

  const handleFileSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {technician.full_name} - Dosyaları
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {technician.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <FileList
            technicianId={technician.id}
            showTechnicianName={false}
            onToast={onToast}
            refreshTrigger={refreshTrigger}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={onClose}
            variant="outline"
            className="mr-3"
          >
            Kapat
          </Button>
        </div>
      </div>
    </div>
  )
}
