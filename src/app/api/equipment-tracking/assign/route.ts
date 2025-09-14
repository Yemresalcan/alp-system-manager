import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { detectEquipmentType, EQUIPMENT_TYPES } from '@/lib/supabase'

// POST /api/equipment-tracking/assign - Assign equipment to technician
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      serial_number,
      technician_id,
      assigned_by,
      task_type,
      service_number,
      location,
      notes
    } = body

    console.log('🔧 Equipment assignment request:', {
      serial_number,
      technician_id,
      task_type,
      service_number
    })

    // Validate required fields
    if (!serial_number || !technician_id || !assigned_by) {
      return NextResponse.json({
        success: false,
        error: 'Seri numarası, teknisyen ve atayan kullanıcı gerekli'
      }, { status: 400 })
    }

    // Get technician info
    const { data: technician, error: techError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', technician_id)
      .single()

    if (techError || !technician) {
      console.error('❌ Technician not found:', techError)
      return NextResponse.json({
        success: false,
        error: 'Teknisyen bulunamadı'
      }, { status: 404 })
    }

    // Auto-detect equipment type
    const equipmentType = detectEquipmentType(serial_number)
    const equipmentInfo = EQUIPMENT_TYPES[equipmentType]

    console.log('🔍 Detected equipment type:', equipmentType, equipmentInfo)

    // Try exact match first
    let { data: equipment, error: findError } = await supabaseAdmin
      .from('equipment_tracking')
      .select('*')
      .eq('serial_number', serial_number)
      .single()

    // If exact match not found, try last 4 digits
    if (findError && serial_number.length >= 4) {
      const last4Digits = serial_number.slice(-4)
      console.log('🔍 Trying last 4 digits match:', last4Digits)
      
      const { data: matchingEquipment, error: searchError } = await supabaseAdmin
        .from('equipment_tracking')
        .select('*')
        .like('serial_number', `%${last4Digits}`)

      if (searchError) {
        console.error('❌ Last 4 digits search error:', searchError)
        throw searchError
      }

      if (matchingEquipment && matchingEquipment.length === 1) {
        equipment = matchingEquipment[0]
        console.log('✅ Found equipment by last 4 digits:', equipment.serial_number)
      } else if (matchingEquipment && matchingEquipment.length > 1) {
        const serials = matchingEquipment.map(e => e.serial_number).join(', ')
        return NextResponse.json({
          success: false,
          error: `Son 4 hane ile birden fazla ekipman bulundu: ${serials}`,
          suggestion: 'Lütfen tam seri numarasını girin'
        }, { status: 400 })
      }
    }

    // If still not found, create new equipment automatically
    if (!equipment) {
      console.log('🔧 Creating new equipment automatically...')
      
      const { data: newEquipment, error: createError } = await supabaseAdmin
        .from('equipment_tracking')
        .insert({
          equipment_type: equipmentType,
          serial_number,
          current_status: 'available',
          created_by: assigned_by,
          notes: `${equipmentInfo.label} otomatik olarak oluşturuldu`
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Auto-create equipment error:', createError)
        throw createError
      }

      equipment = newEquipment
      console.log('✅ New equipment created:', equipment.id)
    }

    // Check if already assigned
    if (equipment.current_status === 'in_use' && equipment.assigned_technician_id) {
      return NextResponse.json({
        success: false,
        error: `${equipmentInfo.label} zaten ${equipment.assigned_technician_name} tarafından kullanılıyor`,
        suggestion: 'Lütfen farklı bir ekipman seçin'
      }, { status: 409 })
    }

    // Update equipment status to 'in_use'
    const assignmentDate = new Date().toISOString()
    const { data: updatedEquipment, error: updateError } = await supabaseAdmin
      .from('equipment_tracking')
      .update({
        current_status: 'in_use',
        assigned_technician_id: technician_id,
        assigned_technician_name: technician.full_name,
        assigned_date: assignmentDate,
        assignment_task_type: task_type,
        assignment_service_number: service_number,
        assignment_location: location,
        assignment_notes: notes
      })
      .eq('id', equipment.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Equipment update error:', updateError)
      throw updateError
    }

    // Log the assignment
    const { error: logError } = await supabaseAdmin
      .from('equipment_tracking_logs')
      .insert({
        equipment_tracking_id: equipment.id,
        action: 'assigned',
        old_value: equipment.current_status,
        new_value: 'in_use',
        performed_by: assigned_by,
        performed_at: assignmentDate,
        notes: `${equipmentInfo.label} ${technician.full_name} tarafından kullanıma alındı. ${notes || ''}`
      })

    if (logError) {
      console.warn('⚠️ Log insert warning:', logError)
      // Don't fail assignment if logging fails
    }

    console.log('✅ Equipment assigned successfully:', {
      equipment_id: equipment.id,
      serial_number: equipment.serial_number,
      technician: technician.full_name,
      type: equipmentType
    })

    return NextResponse.json({
      success: true,
      message: `${equipmentInfo.icon} ${equipmentInfo.label} başarıyla atandı`,
      equipment: updatedEquipment,
      assignment_details: {
        technician_name: technician.full_name,
        assigned_date: assignmentDate,
        equipment_type: equipmentType,
        equipment_label: equipmentInfo.label,
        equipment_icon: equipmentInfo.icon
      }
    })

  } catch (error: any) {
    console.error('❌ Equipment assignment error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Ekipman ataması başarısız',
      suggestion: 'Lütfen tekrar deneyin veya sistem yöneticisine başvurun'
    }, { status: 500 })
  }
}
