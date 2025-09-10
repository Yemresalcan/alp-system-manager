'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { VehicleAssignment, Profile, Vehicle, VehicleNotification } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Car,
  Calendar,
  MapPin,
  Fuel,
  Clock,
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  Phone,
  Mail,
  FileText
} from 'lucide-react'

interface TechnicianVehicleProps {
  technicianId: string
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

interface VehicleAssignmentWithDetails extends VehicleAssignment {
  vehicles: Vehicle
  assigned_by_profile: Profile
}

export default function TechnicianVehicle({ technicianId, onToast }: TechnicianVehicleProps) {
  const [assignments, setAssignments] = useState<VehicleAssignmentWithDetails[]>([])
  const [notifications, setNotifications] = useState<VehicleNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null)

  const conditionColors = {
    excellent: 'text-green-600 bg-green-50 border-green-200',
    good: 'text-blue-600 bg-blue-50 border-blue-200',
    fair: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    poor: 'text-orange-600 bg-orange-50 border-orange-200',
    damaged: 'text-red-600 bg-red-50 border-red-200'
  }

  const conditionLabels = {
    excellent: 'Mükemmel',
    good: 'İyi',
    fair: 'Orta',
    poor: 'Kötü',
    damaged: 'Hasarlı'
  }

  const statusColors = {
    active: 'text-green-600 bg-green-50 border-green-200',
    returned: 'text-blue-600 bg-blue-50 border-blue-200',
    overdue: 'text-red-600 bg-red-50 border-red-200'
  }

  const statusLabels = {
    active: 'Aktif',
    returned: 'İade Edildi',
    overdue: 'Süresi Geçmiş'
  }

  useEffect(() => {
    loadData()
  }, [technicianId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Araç atamalarını yükle
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('vehicle_assignments')
        .select(`
          *,
          vehicles (*)
        `)
        .eq('technician_id', technicianId)
        .order('assigned_date', { ascending: false })

      if (assignmentsError) throw assignmentsError

      // Atama yapan profilleri ayrı olarak yükle
      const assignmentsWithProfiles = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone')
            .eq('id', assignment.assigned_by)
            .single()

          return {
            ...assignment,
            assigned_by_profile: profileData
          }
        })
      )

      if (assignmentsError) throw assignmentsError

      // Bildirimleri yükle
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('vehicle_notifications')
        .select('*')
        .eq('technician_id', technicianId)
        .order('sent_at', { ascending: false })
        .limit(10)

      if (notificationsError) throw notificationsError

      setAssignments(assignmentsWithProfiles || [])
      setNotifications(notificationsData || [])

    } catch (error: any) {
      console.error('Veri yükleme hatası:', error)
      onToast('error', 'Hata', 'Araç bilgileri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('vehicle_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)

      if (error) throw error

      // Yerel state'i güncelle
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      )

    } catch (error: any) {
      console.error('Bildirim güncelleme hatası:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getVehicleTypeIcon = (type: string) => {
    return <Car className="h-5 w-5 text-gray-600" />
  }

  const isOverdue = (assignment: VehicleAssignmentWithDetails) => {
    if (!assignment.expected_return_date || assignment.assignment_status !== 'active') return false
    return new Date(assignment.expected_return_date) < new Date()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const activeAssignments = assignments.filter(a => a.assignment_status === 'active')
  const unreadNotifications = notifications.filter(n => !n.is_read)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Araçlarım</h2>
          <p className="text-gray-600">Size atanan araç bilgileri ve bildirimleri</p>
        </div>
        <div className="flex items-center space-x-4">
          {unreadNotifications.length > 0 && (
            <div className="flex items-center space-x-2 bg-red-50 text-red-700 px-3 py-1 rounded-full">
              <Bell className="h-4 w-4" />
              <span className="text-sm font-medium">{unreadNotifications.length} yeni bildirim</span>
            </div>
          )}
        </div>
      </div>

      {/* Active Assignments */}
      {activeAssignments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Aktif Araç Atamaları ({activeAssignments.length})
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {activeAssignments.map((assignment) => (
              <div key={assignment.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getVehicleTypeIcon(assignment.vehicles.vehicle_type)}
                    <h4 className="text-lg font-medium text-gray-900">
                      {assignment.vehicles.name}
                    </h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                      statusColors[assignment.assignment_status as keyof typeof statusColors]
                    }`}>
                      {statusLabels[assignment.assignment_status as keyof typeof statusLabels]}
                    </span>
                    {isOverdue(assignment) && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full border bg-red-50 text-red-600 border-red-200">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Süresi Geçmiş
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={() => setExpandedAssignment(expandedAssignment === assignment.id ? null : assignment.id)}
                    variant="outline"
                    size="sm"
                  >
                    <Info className="h-4 w-4 mr-1" />
                    Detay
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-500">Plaka:</span>
                    <p className="text-gray-900">{assignment.vehicles.license_plate}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Marka/Model:</span>
                    <p className="text-gray-900">{assignment.vehicles.brand} {assignment.vehicles.model}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Teslim Tarihi:</span>
                    <p className="text-gray-900">{formatDate(assignment.assigned_date)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Beklenen İade:</span>
                    <p className={`${isOverdue(assignment) ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                      {assignment.expected_return_date 
                        ? new Date(assignment.expected_return_date).toLocaleDateString('tr-TR')
                        : 'Belirtilmemiş'
                      }
                    </p>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedAssignment === assignment.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">Teslim Bilgileri</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Durum:</span>
                            <span className={`px-2 py-1 text-xs rounded-full border ${
                              conditionColors[assignment.condition_on_delivery as keyof typeof conditionColors]
                            }`}>
                              {conditionLabels[assignment.condition_on_delivery as keyof typeof conditionLabels]}
                            </span>
                          </div>
                          {assignment.mileage_on_delivery && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Kilometre:</span>
                              <span className="text-gray-900">{assignment.mileage_on_delivery.toLocaleString()} km</span>
                            </div>
                          )}
                          {assignment.fuel_level_on_delivery && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Yakıt:</span>
                              <span className="text-gray-900">%{assignment.fuel_level_on_delivery}</span>
                            </div>
                          )}
                          {assignment.delivery_notes && (
                            <div>
                              <span className="text-gray-500">Notlar:</span>
                              <p className="text-gray-900 mt-1">{assignment.delivery_notes}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">Atama Bilgileri</h5>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-500">Atayan:</span>
                            <p className="text-gray-900">{assignment.assigned_by_profile?.full_name || 'Bilinmiyor'}</p>
                          </div>
                          {assignment.assigned_by_profile?.email && (
                            <div className="flex items-center space-x-2">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-900">{assignment.assigned_by_profile.email}</span>
                            </div>
                          )}
                          {assignment.assigned_by_profile?.phone && (
                            <div className="flex items-center space-x-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-900">{assignment.assigned_by_profile.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Son Bildirimler ({notifications.length})
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${
                  !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => !notification.is_read && markNotificationAsRead(notification.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Bell className={`h-4 w-4 ${!notification.is_read ? 'text-blue-600' : 'text-gray-400'}`} />
                      <h4 className={`font-medium ${!notification.is_read ? 'text-blue-900' : 'text-gray-900'}`}>
                        {notification.title}
                      </h4>
                      {!notification.is_read && (
                        <span className="inline-flex h-2 w-2 bg-blue-600 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-2">{formatDate(notification.sent_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Active Assignments */}
      {activeAssignments.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Car className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Aktif araç atamanız yok</h3>
          <p className="mt-2 text-gray-600">
            Size atanan bir araç bulunmuyor. Yeni atamalar için yöneticinizle iletişime geçin.
          </p>
        </div>
      )}

      {/* Past Assignments */}
      {assignments.filter(a => a.assignment_status === 'returned').length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Geçmiş Atamalar ({assignments.filter(a => a.assignment_status === 'returned').length})
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {assignments.filter(a => a.assignment_status === 'returned').slice(0, 3).map((assignment) => (
              <div key={assignment.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getVehicleTypeIcon(assignment.vehicles.vehicle_type)}
                    <div>
                      <h4 className="font-medium text-gray-900">{assignment.vehicles.name}</h4>
                      <p className="text-sm text-gray-600">{assignment.vehicles.license_plate}</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                      statusColors[assignment.assignment_status as keyof typeof statusColors]
                    }`}>
                      {statusLabels[assignment.assignment_status as keyof typeof statusLabels]}
                    </span>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p>{formatDate(assignment.assigned_date)} - {assignment.actual_return_date && formatDate(assignment.actual_return_date)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
