'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Vehicle, VehicleAssignment, Profile } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Car,
  Plus,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  Calendar,
  MapPin,
  Fuel,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Save,
  Truck,
  Zap
} from 'lucide-react'

interface VehicleManagerProps {
  onToast: (type: 'success' | 'error', title: string, message?: string) => void
}

interface VehicleWithAssignment extends Vehicle {
  current_assignment?: VehicleAssignment & {
    profiles: Profile
  }
}

export default function VehicleManager({ onToast }: VehicleManagerProps) {
  const [vehicles, setVehicles] = useState<VehicleWithAssignment[]>([])
  const [technicians, setTechnicians] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithAssignment | null>(null)
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null)
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnVehicleData, setReturnVehicleData] = useState<{vehicleId: string, assignmentId: string} | null>(null)

  const [vehicleForm, setVehicleForm] = useState({
    name: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    license_plate: '',
    vehicle_type: 'car' as Vehicle['vehicle_type'],
    fuel_type: 'gasoline' as Vehicle['fuel_type'],
    color: '',
    chassis_number: '',
    engine_number: '',
    insurance_expiry: '',
    inspection_expiry: '',
    condition: 'excellent' as Vehicle['condition'],
    mileage: 0,
    notes: ''
  })

  const [assignmentForm, setAssignmentForm] = useState({
    technician_id: '',
    expected_return_date: '',
    condition_on_delivery: 'excellent' as VehicleAssignment['condition_on_delivery'],
    mileage_on_delivery: 0,
    fuel_level_on_delivery: 100,
    delivery_notes: ''
  })

  const [returnForm, setReturnForm] = useState({
    condition_on_return: 'excellent' as VehicleAssignment['condition_on_return'],
    mileage_on_return: 0,
    fuel_level_on_return: 100,
    return_notes: ''
  })

  // Araç tipleri
  const vehicleTypes = [
    { value: 'car', label: 'Otomobil', icon: Car },
    { value: 'van', label: 'Minibüs', icon: Truck },
    { value: 'truck', label: 'Kamyon', icon: Truck },
    { value: 'motorcycle', label: 'Motosiklet', icon: Car },
    { value: 'other', label: 'Diğer', icon: Car }
  ]

  const fuelTypes = [
    { value: 'gasoline', label: 'Benzin', icon: Fuel },
    { value: 'diesel', label: 'Dizel', icon: Fuel },
    { value: 'electric', label: 'Elektrik', icon: Zap },
    { value: 'hybrid', label: 'Hibrit', icon: Zap }
  ]

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
    available: 'text-green-600 bg-green-50 border-green-200',
    assigned: 'text-blue-600 bg-blue-50 border-blue-200',
    maintenance: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    out_of_service: 'text-red-600 bg-red-50 border-red-200'
  }

  const statusLabels = {
    available: 'Müsait',
    assigned: 'Atanmış',
    maintenance: 'Bakımda',
    out_of_service: 'Hizmet Dışı'
  }

  // Verileri yükle
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Araçları yükle
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select(`
          *
        `)
        .order('created_at', { ascending: false })

      if (vehiclesError) throw vehiclesError

      // Her araç için aktif atamaları ayrı olarak yükle
      const vehiclesWithAssignments = await Promise.all(
        (vehiclesData || []).map(async (vehicle) => {
          const { data: assignmentData } = await supabase
            .from('vehicle_assignments')
            .select(`
              *,
              profiles (
                id,
                full_name,
                email,
                phone
              )
            `)
            .eq('vehicle_id', vehicle.id)
            .eq('assignment_status', 'active')
            .single()

          return {
            ...vehicle,
            current_assignment: assignmentData
          }
        })
      )

      // Teknisyenleri yükle
      const { data: techniciansData, error: techniciansError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'technician')
        .order('full_name')

      if (techniciansError) throw techniciansError

      setVehicles(vehiclesWithAssignments || [])
      setTechnicians(techniciansData || [])

    } catch (error: any) {
      console.error('Veri yükleme hatası:', error)
      onToast('error', 'Hata', 'Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  // Araç ekleme
  const handleAddVehicle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Kullanıcı bulunamadı')

      // Profile id'sini al
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profileData) throw new Error('Profil bulunamadı')

      // Tarih alanları için null kontrolü
      const vehicleData = {
        ...vehicleForm,
        insurance_expiry: vehicleForm.insurance_expiry || null,
        inspection_expiry: vehicleForm.inspection_expiry || null,
        status: 'available',
        created_by: profileData.id
      }

      const { error } = await supabase
        .from('vehicles')
        .insert([vehicleData])

      if (error) throw error

      onToast('success', 'Başarılı', 'Araç eklendi')
      setShowAddModal(false)
      resetVehicleForm()
      loadData()

    } catch (error: any) {
      onToast('error', 'Hata', error.message || 'Araç eklenemedi')
    }
  }

  // Araç atama
  const handleAssignVehicle = async () => {
    if (!selectedVehicle) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Kullanıcı bulunamadı')

      // Profile id'sini al
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profileData) throw new Error('Profil bulunamadı')

      // Tarih alanları için null kontrolü
      const assignmentData = {
        ...assignmentForm,
        expected_return_date: assignmentForm.expected_return_date || null,
        vehicle_id: selectedVehicle.id,
        assigned_date: new Date().toISOString(),
        assignment_status: 'active',
        assigned_by: profileData.id
      }

      // Araç ataması oluştur
      const { error: assignmentError } = await supabase
        .from('vehicle_assignments')
        .insert([assignmentData])

      if (assignmentError) throw assignmentError

      // Araç durumunu güncelle
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ status: 'assigned' })
        .eq('id', selectedVehicle.id)

      if (vehicleError) throw vehicleError

      // Teknisyene bildirim gönder
      await sendNotification(
        selectedVehicle.id,
        assignmentForm.technician_id,
        'assignment',
        'Araç Atandı',
        `${selectedVehicle.name} (${selectedVehicle.license_plate}) aracı size atandı.`
      )

      onToast('success', 'Başarılı', 'Araç atandı ve teknisyene bildirim gönderildi')
      setShowAssignModal(false)
      resetAssignmentForm()
      loadData()

    } catch (error: any) {
      onToast('error', 'Hata', error.message || 'Araç atanamadı')
    }
  }

  // Araç geri alma
  const handleReturnVehicle = async (vehicleId: string, assignmentId: string) => {
    setReturnVehicleData({ vehicleId, assignmentId })
    setShowReturnModal(true)
  }

  // Araç geri alma onaylama
  const confirmReturnVehicle = async () => {
    if (!returnVehicleData) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Kullanıcı bulunamadı')

      // Profile id'sini al
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profileData) throw new Error('Profil bulunamadı')

      // Atamayı güncelle
      const { error: assignmentError } = await supabase
        .from('vehicle_assignments')
        .update({
          actual_return_date: new Date().toISOString(),
          assignment_status: 'returned',
          condition_on_return: returnForm.condition_on_return,
          mileage_on_return: returnForm.mileage_on_return,
          fuel_level_on_return: returnForm.fuel_level_on_return,
          return_notes: returnForm.return_notes,
          returned_by: profileData.id
        })
        .eq('id', returnVehicleData.assignmentId)

      if (assignmentError) throw assignmentError

      // Araç durumunu güncelle
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ 
          status: 'available',
          condition: returnForm.condition_on_return,
          mileage: returnForm.mileage_on_return
        })
        .eq('id', returnVehicleData.vehicleId)

      if (vehicleError) throw vehicleError

      // Teknisyene bildirim gönder
      const { data: assignmentData } = await supabase
        .from('vehicle_assignments')
        .select('technician_id, vehicle_id, vehicles!inner(name, license_plate)')
        .eq('id', returnVehicleData.assignmentId)
        .single()

      if (assignmentData && assignmentData.vehicles) {
        const vehicle = Array.isArray(assignmentData.vehicles) ? assignmentData.vehicles[0] : assignmentData.vehicles
        await sendNotification(
          assignmentData.vehicle_id,
          assignmentData.technician_id,
          'return',
          'Araç Geri Alındı',
          `${vehicle.name} (${vehicle.license_plate}) aracınız geri alınmıştır.`
        )
      }

      onToast('success', 'Başarılı', 'Araç geri alındı ve teknisyene bildirim gönderildi')
      setShowReturnModal(false)
      resetReturnForm()
      setReturnVehicleData(null)
      loadData()

    } catch (error: any) {
      onToast('error', 'Hata', error.message || 'Araç geri alınamadı')
    }
  }

  // Bildirim gönder
  const sendNotification = async (
    vehicleId: string,
    technicianId: string,
    type: string,
    title: string,
    message: string
  ) => {
    try {
      await supabase
        .from('vehicle_notifications')
        .insert([{
          vehicle_id: vehicleId,
          technician_id: technicianId,
          notification_type: type,
          title,
          message,
          is_read: false,
          sent_at: new Date().toISOString()
        }])
    } catch (error) {
      console.error('Bildirim gönderme hatası:', error)
    }
  }

  const resetVehicleForm = () => {
    setVehicleForm({
      name: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      license_plate: '',
      vehicle_type: 'car',
      fuel_type: 'gasoline',
      color: '',
      chassis_number: '',
      engine_number: '',
      insurance_expiry: '',
      inspection_expiry: '',
      condition: 'excellent',
      mileage: 0,
      notes: ''
    })
  }

  const resetAssignmentForm = () => {
    setAssignmentForm({
      technician_id: '',
      expected_return_date: '',
      condition_on_delivery: 'excellent',
      mileage_on_delivery: 0,
      fuel_level_on_delivery: 100,
      delivery_notes: ''
    })
  }

  const resetReturnForm = () => {
    setReturnForm({
      condition_on_return: 'excellent',
      mileage_on_return: 0,
      fuel_level_on_return: 100,
      return_notes: ''
    })
  }

  const getVehicleTypeIcon = (type: string) => {
    const vehicleType = vehicleTypes.find(t => t.value === type)
    if (vehicleType) {
      const Icon = vehicleType.icon
      return <Icon className="h-5 w-5 text-gray-600" />
    }
    return <Car className="h-5 w-5 text-gray-600" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Araç Yönetimi</h2>
          <p className="text-gray-600">Araçları yönetin ve teknisyenlere atayın</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Yeni Araç</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center">
            <Car className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Toplam Araç</p>
              <p className="text-2xl font-bold text-gray-900">{vehicles.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Müsait</p>
              <p className="text-2xl font-bold text-gray-900">
                {vehicles.filter(v => v.status === 'available').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
          <div className="flex items-center">
            <UserCheck className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Atanmış</p>
              <p className="text-2xl font-bold text-gray-900">
                {vehicles.filter(v => v.status === 'assigned').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500">
          <div className="flex items-center">
            <Settings className="h-8 w-8 text-red-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Bakımda</p>
              <p className="text-2xl font-bold text-gray-900">
                {vehicles.filter(v => v.status === 'maintenance').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicles List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Araçlar ({vehicles.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getVehicleTypeIcon(vehicle.vehicle_type)}
                    <h4 className="text-lg font-medium text-gray-900">
                      {vehicle.name}
                    </h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                      statusColors[vehicle.status as keyof typeof statusColors]
                    }`}>
                      {statusLabels[vehicle.status as keyof typeof statusLabels]}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                      conditionColors[vehicle.condition as keyof typeof conditionColors]
                    }`}>
                      {conditionLabels[vehicle.condition as keyof typeof conditionLabels]}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Plaka:</span> {vehicle.license_plate}
                    </div>
                    <div>
                      <span className="font-medium">Marka/Model:</span> {vehicle.brand} {vehicle.model}
                    </div>
                    <div>
                      <span className="font-medium">Yıl:</span> {vehicle.year}
                    </div>
                    <div>
                      <span className="font-medium">Yakıt:</span> {fuelTypes.find(f => f.value === vehicle.fuel_type)?.label}
                    </div>
                  </div>

                  {vehicle.current_assignment && vehicle.current_assignment.profiles && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2 text-sm">
                        <UserCheck className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900">
                          Atanan: {vehicle.current_assignment.profiles.full_name}
                        </span>
                        <span className="text-blue-600">
                          ({new Date(vehicle.current_assignment.assigned_date).toLocaleDateString('tr-TR')})
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    onClick={() => setExpandedVehicle(expandedVehicle === vehicle.id ? null : vehicle.id)}
                    variant="outline"
                    size="sm"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Detay
                  </Button>

                  {vehicle.status === 'available' && (
                    <Button
                      onClick={() => {
                        setSelectedVehicle(vehicle)
                        setShowAssignModal(true)
                      }}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Ata
                    </Button>
                  )}

                  {vehicle.status === 'assigned' && vehicle.current_assignment && (
                    <Button
                      onClick={() => handleReturnVehicle(vehicle.id, vehicle.current_assignment!.id)}
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Geri Al
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedVehicle === vehicle.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Araç Bilgileri</h5>
                      <div className="space-y-1 text-gray-600">
                        <div><span className="font-medium">Renk:</span> {vehicle.color || 'Belirtilmemiş'}</div>
                        <div><span className="font-medium">Şasi No:</span> {vehicle.chassis_number || 'Belirtilmemiş'}</div>
                        <div><span className="font-medium">Motor No:</span> {vehicle.engine_number || 'Belirtilmemiş'}</div>
                        <div><span className="font-medium">Kilometre:</span> {vehicle.mileage || 0} km</div>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Belgeler</h5>
                      <div className="space-y-1 text-gray-600">
                        <div><span className="font-medium">Sigorta Bitiş:</span> {vehicle.insurance_expiry ? new Date(vehicle.insurance_expiry).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</div>
                        <div><span className="font-medium">Muayene Bitiş:</span> {vehicle.inspection_expiry ? new Date(vehicle.inspection_expiry).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</div>
                      </div>
                    </div>
                  </div>
                  {vehicle.notes && (
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-900 mb-2">Notlar</h5>
                      <p className="text-sm text-gray-600">{vehicle.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {vehicles.length === 0 && (
          <div className="text-center py-12">
            <Car className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Araç bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              Henüz hiç araç eklenmemiş.
            </p>
          </div>
        )}
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Yeni Araç Ekle</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Araç Adı *</label>
                  <input
                    type="text"
                    value={vehicleForm.name}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Örn: Şirket Aracı 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plaka *</label>
                  <input
                    type="text"
                    value={vehicleForm.license_plate}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, license_plate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="34 ABC 123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marka *</label>
                  <input
                    type="text"
                    value={vehicleForm.brand}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, brand: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ford, Toyota, vb."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                  <input
                    type="text"
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Transit, Corolla, vb."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yıl</label>
                  <input
                    type="number"
                    value={vehicleForm.year}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1990"
                    max={new Date().getFullYear() + 1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Araç Tipi</label>
                  <select
                    value={vehicleForm.vehicle_type}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, vehicle_type: e.target.value as Vehicle['vehicle_type'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {vehicleTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yakıt Tipi</label>
                  <select
                    value={vehicleForm.fuel_type}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, fuel_type: e.target.value as Vehicle['fuel_type'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {fuelTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                  <select
                    value={vehicleForm.condition}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, condition: e.target.value as Vehicle['condition'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="excellent">Mükemmel</option>
                    <option value="good">İyi</option>
                    <option value="fair">Orta</option>
                    <option value="poor">Kötü</option>
                    <option value="damaged">Hasarlı</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Renk</label>
                  <input
                    type="text"
                    value={vehicleForm.color}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Araç rengi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kilometre</label>
                  <input
                    type="number"
                    min="0"
                    value={vehicleForm.mileage}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, mileage: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Güncel kilometre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Şasi Numarası</label>
                  <input
                    type="text"
                    value={vehicleForm.chassis_number}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, chassis_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Şasi numarası"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motor Numarası</label>
                  <input
                    type="text"
                    value={vehicleForm.engine_number}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, engine_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Motor numarası"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sigorta Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={vehicleForm.insurance_expiry}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, insurance_expiry: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Muayene Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={vehicleForm.inspection_expiry}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, inspection_expiry: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                <textarea
                  value={vehicleForm.notes}
                  onChange={(e) => setVehicleForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ek bilgiler..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <Button
                onClick={() => setShowAddModal(false)}
                variant="outline"
              >
                İptal
              </Button>
              <Button
                onClick={handleAddVehicle}
                disabled={!vehicleForm.name || !vehicleForm.license_plate || !vehicleForm.brand || !vehicleForm.model}
              >
                Araç Ekle
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Vehicle Modal */}
      {showAssignModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Araç Ata</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900">{selectedVehicle.name}</h4>
                <p className="text-sm text-gray-600">{selectedVehicle.license_plate} - {selectedVehicle.brand} {selectedVehicle.model}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teknisyen *</label>
                <select
                  value={assignmentForm.technician_id}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, technician_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Teknisyen seçin</option>
                  {technicians.map(tech => (
                    <option key={tech.id} value={tech.id}>{tech.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beklenen İade Tarihi</label>
                <input
                  type="date"
                  value={assignmentForm.expected_return_date}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, expected_return_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teslim Kilometre</label>
                  <input
                    type="number"
                    value={assignmentForm.mileage_on_delivery}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, mileage_on_delivery: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Teslim anındaki kilometre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yakıt Seviyesi (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={assignmentForm.fuel_level_on_delivery}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, fuel_level_on_delivery: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Yakıt seviyesi"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teslim Durumu</label>
                <select
                  value={assignmentForm.condition_on_delivery}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, condition_on_delivery: e.target.value as VehicleAssignment['condition_on_delivery'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="excellent">Mükemmel</option>
                  <option value="good">İyi</option>
                  <option value="fair">Orta</option>
                  <option value="poor">Kötü</option>
                  <option value="damaged">Hasarlı</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teslim Notları</label>
                <textarea
                  value={assignmentForm.delivery_notes}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, delivery_notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Teslim sırasındaki notlar..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <Button
                onClick={() => setShowAssignModal(false)}
                variant="outline"
              >
                İptal
              </Button>
              <Button
                onClick={handleAssignVehicle}
                disabled={!assignmentForm.technician_id}
              >
                Araç Ata
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Return Vehicle Modal */}
      {showReturnModal && returnVehicleData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Araç Geri Al</h3>
              <button
                onClick={() => {
                  setShowReturnModal(false)
                  setReturnVehicleData(null)
                  resetReturnForm()
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Araç geri alım bilgilerini girin:</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Geri Alım Kilometre</label>
                  <input
                    type="number"
                    value={returnForm.mileage_on_return}
                    onChange={(e) => setReturnForm(prev => ({ ...prev, mileage_on_return: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Geri alım anındaki kilometre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yakıt Seviyesi (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={returnForm.fuel_level_on_return}
                    onChange={(e) => setReturnForm(prev => ({ ...prev, fuel_level_on_return: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Yakıt seviyesi"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Geri Alım Durumu</label>
                <select
                  value={returnForm.condition_on_return}
                  onChange={(e) => setReturnForm(prev => ({ ...prev, condition_on_return: e.target.value as VehicleAssignment['condition_on_return'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="excellent">Mükemmel</option>
                  <option value="good">İyi</option>
                  <option value="fair">Orta</option>
                  <option value="poor">Kötü</option>
                  <option value="damaged">Hasarlı</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Geri Alım Notları</label>
                <textarea
                  value={returnForm.return_notes}
                  onChange={(e) => setReturnForm(prev => ({ ...prev, return_notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Geri alım sırasındaki notlar..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <Button
                onClick={() => {
                  setShowReturnModal(false)
                  setReturnVehicleData(null)
                  resetReturnForm()
                }}
                variant="outline"
              >
                İptal
              </Button>
              <Button
                onClick={confirmReturnVehicle}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Araç Geri Al
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}