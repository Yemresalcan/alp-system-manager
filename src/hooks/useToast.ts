'use client'

import { useState, useCallback } from 'react'
import { ToastProps } from '@/components/ui/toast'

interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback((options: ToastOptions) => {
    const id = Date.now().toString()
    
    const newToast: ToastProps = {
      id,
      ...options,
      onClose: removeToast
    }

    setToasts(prev => [...prev, newToast])
    return id
  }, [removeToast])

  const toast = {
    success: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'success', title, message, duration }),
    error: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'error', title, message, duration }),
    warning: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'warning', title, message, duration }),
    info: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'info', title, message, duration })
  }

  return { toasts, toast, removeToast }
}