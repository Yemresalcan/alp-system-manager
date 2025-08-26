import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Envanter öğesi atama
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      technician_id, 
      inventory_item_id, 
      assigned_by,
      quantity = 1,
      expected_return_date,
      notes 
    } = body

    console.log('🔧 Assignment API: Envanter atanıyor...', { technician_id, inventory_item_id, quantity })

    // Zorunlu alanları kontrol et
    if (!technician_id || !inventory_item_id || !assigned_by) {
      return NextResponse.json(
        { error: 'Eksik bilgi: technician_id, inventory_item_id ve assigned_by gerekli' },
        { status: 400 }
      )
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: 'Atanacak miktar en az 1 olmalıdır' },
        { status: 400 }
      )
    }

    // Envanter öğesinin durumunu kontrol et
    const { data: inventoryItem, error: inventoryError } = await supabaseAdmin
      .from('inventory_items')
      .select('id, name, available_quantity, total_quantity, status, unit_type')
      .eq('id', inventory_item_id)
      .single()

    if (inventoryError || !inventoryItem) {
      return NextResponse.json(
        { error: 'Envanter öğesi bulunamadı' },
        { status: 404 }
      )
    }

    if (inventoryItem.available_quantity < quantity) {
      return NextResponse.json(
        { error: `Yeterli stok yok. Müsait miktar: ${inventoryItem.available_quantity}` },
        { status: 400 }
      )
    }

    // Tekniksyenin var olup olmadığını kontrol et
    const { data: technician, error: technicianError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', technician_id)
      .eq('role', 'technician')
      .single()

    if (technicianError || !technician) {
      return NextResponse.json(
        { error: 'Tekniksyen bulunamadı' },
        { status: 404 }
      )
    }

    // Aynı tekniksyene aynı ürünün zaten atanıp atanmadığını kontrol et
    const { data: existingAssignment } = await supabaseAdmin
      .from('technician_inventory')
      .select('id, quantity')
      .eq('technician_id', technician_id)
      .eq('inventory_item_id', inventory_item_id)
      .eq('status', 'assigned')
      .single()

    if (existingAssignment) {
      // Mevcut atamayı güncelle
      const newQuantity = existingAssignment.quantity + quantity
      
      const { data: updatedAssignment, error: updateError } = await supabaseAdmin
        .from('technician_inventory')
        .update({
          quantity: newQuantity,
          notes: notes ? `${notes} (Ek atama: +${quantity})` : `Ek atama: +${quantity}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAssignment.id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Atama güncelleme hatası:', updateError)
        return NextResponse.json(
          { error: `Mevcut atama güncellenemedi: ${updateError.message}` },
          { status: 500 }
        )
      }

      console.log('✅ Mevcut atama güncellendi:', updatedAssignment.id)
    } else {
      // Yeni atama kaydı oluştur
      const { data: assignmentData, error: assignmentError } = await supabaseAdmin
        .from('technician_inventory')
        .insert([{
          technician_id,
          inventory_item_id,
          quantity,
          assigned_by,
          expected_return_date: expected_return_date || null,
          notes: notes?.trim() || null,
          status: 'assigned',
          assigned_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (assignmentError) {
        console.error('❌ Atama oluşturma hatası:', assignmentError)
        return NextResponse.json(
          { error: `Atama kaydı oluşturulamadı: ${assignmentError.message}` },
          { status: 500 }
        )
      }

      console.log('✅ Yeni atama oluşturuldu:', assignmentData.id)
    }

    // Envanter öğesinin miktarlarını güncelle
    const newAvailableQuantity = inventoryItem.available_quantity - quantity
    const newAssignedQuantity = (inventoryItem.total_quantity - newAvailableQuantity)
    
    let newStatus = inventoryItem.status
    if (newAvailableQuantity === 0) {
      newStatus = 'assigned'
    } else if (newAssignedQuantity > 0 && newAvailableQuantity > 0) {
      newStatus = 'partial_assigned'
    }

    const { error: updateError } = await supabaseAdmin
      .from('inventory_items')
      .update({ 
        available_quantity: newAvailableQuantity,
        assigned_quantity: newAssignedQuantity,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', inventory_item_id)

    if (updateError) {
      console.error('❌ Envanter durumu güncelleme hatası:', updateError)
      return NextResponse.json(
        { error: `Envanter durumu güncellenemedi: ${updateError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Envanter atandı başarıyla')

    return NextResponse.json({
      message: `${inventoryItem.name} (${quantity} ${inventoryItem.unit_type || 'adet'}) başarıyla ${technician.full_name} adlı tekniksyene atandı`,
      remaining_quantity: newAvailableQuantity
    })

  } catch (error: any) {
    console.error('❌ Assignment API POST hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}

// Atamaları listeleme
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const technician_id = searchParams.get('technician_id')
    const status = searchParams.get('status')

    console.log('🔧 Assignment API: Atamalar listeleniyor...', { technician_id, status })

    let query = supabaseAdmin
      .from('technician_inventory')
      .select(`
        *,
        profiles:technician_id (id, full_name, email, city),
        inventory_items:inventory_item_id (*)
      `)
      .order('assigned_date', { ascending: false })

    // Filtreler
    if (technician_id) {
      query = query.eq('technician_id', technician_id)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Atama listeleme hatası:', error)
      return NextResponse.json(
        { error: `Veritabanı hatası: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Atamalar listelendi:', data?.length || 0)

    return NextResponse.json({
      data: data || []
    })

  } catch (error: any) {
    console.error('❌ Assignment API GET hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}

// Envanter geri alma
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { assignment_id, return_notes } = body

    console.log('🔧 Assignment API: Envanter geri alınıyor...', { assignment_id })

    if (!assignment_id) {
      return NextResponse.json(
        { error: 'Atama ID gerekli' },
        { status: 400 }
      )
    }

    // Atama kaydını kontrol et
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('technician_inventory')
      .select('*, inventory_items(*)')
      .eq('id', assignment_id)
      .eq('status', 'assigned')
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Atama kaydı bulunamadı veya zaten geri alınmış' },
        { status: 404 }
      )
    }

    // Atama kaydını güncelle
    const { error: updateAssignmentError } = await supabaseAdmin
      .from('technician_inventory')
      .update({
        status: 'returned',
        return_date: new Date().toISOString(),
        notes: return_notes ? `${assignment.notes || ''}\n[Geri alma notu]: ${return_notes}`.trim() : assignment.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignment_id)

    if (updateAssignmentError) {
      console.error('❌ Atama güncelleme hatası:', updateAssignmentError)
      return NextResponse.json(
        { error: `Atama kaydı güncellenemedi: ${updateAssignmentError.message}` },
        { status: 500 }
      )
    }

    // Envanter öğesinin durumunu 'available' olarak güncelle
    const { error: updateInventoryError } = await supabaseAdmin
      .from('inventory_items')
      .update({ 
        status: 'available',
        updated_at: new Date().toISOString()
      })
      .eq('id', assignment.inventory_item_id)

    if (updateInventoryError) {
      console.error('❌ Envanter durumu güncelleme hatası:', updateInventoryError)
      return NextResponse.json(
        { error: `Envanter durumu güncellenemedi: ${updateInventoryError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Envanter geri alındı:', assignment_id)

    return NextResponse.json({
      message: 'Envanter öğesi başarıyla geri alındı'
    })

  } catch (error: any) {
    console.error('❌ Assignment API PUT hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}
