import { supabase } from './supabase'

// API çağrıları için yardımcı fonksiyon
export const apiClient = {
  async get(url: string, params?: Record<string, string>) {
    const { data: { session } } = await supabase.auth.getSession()
    
    const searchParams = new URLSearchParams(params)
    const fullUrl = params ? `${url}?${searchParams}` : url
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'API çağrısı başarısız')
    }

    return response.json()
  },

  async post(url: string, data: any) {
    const { data: { session } } = await supabase.auth.getSession()
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'API çağrısı başarısız')
    }

    return response.json()
  },

  async put(url: string, data: any) {
    const { data: { session } } = await supabase.auth.getSession()
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'API çağrısı başarısız')
    }

    return response.json()
  },

  async delete(url: string, params?: Record<string, string>) {
    const { data: { session } } = await supabase.auth.getSession()
    
    const searchParams = new URLSearchParams(params)
    const fullUrl = params ? `${url}?${searchParams}` : url
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'API çağrısı başarısız')
    }

    return response.json()
  }
}

// Görev API'leri için özel fonksiyonlar
export const taskAPI = {
  async getTasks(filters: {
    technician_id?: string
    status?: string
    date?: string
    task_type?: string
  } = {}) {
    return apiClient.get('/api/tasks', filters)
  },

  async createTask(taskData: {
    technician_id: string
    task_type: string
    service_number: string
    modem_serial_number?: string
    notes?: string
    location?: string
  }) {
    return apiClient.post('/api/tasks', taskData)
  },

  async updateTask(taskData: {
    id: string
    status?: string
    notes?: string
    location?: string
    modem_serial_number?: string
    started_at?: string
    completed_at?: string
  }) {
    return apiClient.put('/api/tasks', taskData)
  },

  async deleteTask(id: string) {
    return apiClient.delete('/api/tasks', { id })
  }
}
