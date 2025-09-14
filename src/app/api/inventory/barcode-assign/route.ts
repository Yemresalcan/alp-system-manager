import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      serial_number, 
      technician_id,
      assigned_by,
      task_type,
      notes 
    } = body

    console.log('📋 Barkod Atama: Modem seri numarası ile teknisyene atama...', { 
      serial_number, 
      technician_id,
      task_type 
    })

    if (!serial_number || !technician_id || !assigned_by) {
      return NextResponse.json(
        { error: 'Seri numarası, teknisyen ID ve atayan ID gerekli' },
        { status: 400 }
      )
    }

    // 1. Seri numarasına göre envanter öğesini bul
    const { data: inventoryItem, error: findError } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .eq('serial_number', serial_number)
      .eq('status', 'available') // Sadece müsait olanları
      .single()

    if (findError || !inventoryItem) {
      console.log('❌ Envanter öğesi bulunamadı:', findError)
      
      // Modem bulunamadıysa otomatik olarak envantere ekle
      const { data: newInventoryItem, error: createError } = await supabaseAdmin
        .from('inventory_items')
        .insert({
          name: `Modem ${serial_number}`,
          serial_number: serial_number,
          category: 'device',
          total_quantity: 1,
          available_quantity: 0, // Direkt atanacak
          assigned_quantity: 1,
          status: 'assigned', // Direkt atanmış durumda
          created_by: assigned_by,
          notes: `Barkod okutma ile otomatik oluşturuldu - ${task_type}`
        })
        .select()
        .single()

      if (createError || !newInventoryItem) {
        console.error('❌ Yeni envanter oluşturma hatası:', createError)
        return NextResponse.json(
          { 
            error: 'Modem envanterde bulunamadı ve yeni oluşturulamadı',
            details: createError?.message
          },
          { status: 404 }
        )
      }

      // Yeni oluşturulan öğe için atama yap
      const { data: assignment, error: assignError } = await supabaseAdmin
        .from('technician_inventory')
        .insert({
          technician_id: technician_id,
          inventory_item_id: newInventoryItem.id,
          quantity: 1,
          assigned_by: assigned_by,
          status: 'assigned',
          notes: `Barkod okutma ile otomatik atama - ${task_type}${notes ? ': ' + notes : ''}`
        })
        .select()
        .single()

      if (assignError) {
        console.error('❌ Yeni atama hatası:', assignError)
        return NextResponse.json(
          { error: 'Atama işlemi başarısız: ' + assignError.message },
          { status: 500 }
        )
      }

      console.log('✅ Yeni modem oluşturuldu ve atandı:', newInventoryItem.serial_number)
      
      return NextResponse.json({
        success: true,
        message: `Modem "${serial_number}" envantere eklendi ve teknisyene atandı`,
        action: 'created_and_assigned',
        inventory_item: newInventoryItem,
        assignment: assignment
      })
    }

    // 2. Müsait miktar kontrolü
    if (inventoryItem.available_quantity < 1) {
      return NextResponse.json(
        { 
          error: `Modem "${serial_number}" şu anda müsait değil`,
          current_status: inventoryItem.status,
          available_quantity: inventoryItem.available_quantity
        },
        { status: 400 }
      )
    }

    // 3. Teknisyene daha önce bu modem atanmış mı kontrol et
    const { data: existingAssignment } = await supabaseAdmin
      .from('technician_inventory')
      .select('*')
      .eq('technician_id', technician_id)
      .eq('inventory_item_id', inventoryItem.id)
      .eq('status', 'assigned')
      .single()

    if (existingAssignment) {
      return NextResponse.json(
        { 
          error: `Modem "${serial_number}" zaten bu teknisyene atanmış`,
          assignment_date: existingAssignment.assigned_date
        },
        { status: 400 }
      )
    }

    // 4. Teknisyene atama yap
    const { data: assignment, error: assignError } = await supabaseAdmin
      .from('technician_inventory')
      .insert({
        technician_id: technician_id,
        inventory_item_id: inventoryItem.id,
        quantity: 1,
        assigned_by: assigned_by,
        status: 'assigned',
        notes: `Barkod okutma ile atama - ${task_type}${notes ? ': ' + notes : ''}`
      })
      .select()
      .single()

    if (assignError) {
      console.error('❌ Atama hatası:', assignError)
      return NextResponse.json(
        { error: 'Atama işlemi başarısız: ' + assignError.message },
        { status: 500 }
      )
    }

    // 5. Inventory item durumunu güncelle
    const { error: updateError } = await supabaseAdmin
      .from('inventory_items')
      .update({
        available_quantity: inventoryItem.available_quantity - 1,
        assigned_quantity: inventoryItem.assigned_quantity + 1,
        status: inventoryItem.available_quantity - 1 === 0 ? 'assigned' : 'partial_assigned',
        updated_at: new Date().toISOString()
      })
      .eq('id', inventoryItem.id)

    if (updateError) {
      console.error('❌ Envanter güncelleme hatası:', updateError)
      // Atama yapıldı ama stok güncellenemedi - warning olarak logla
    }

    console.log('✅ Modem başarıyla atandı:', inventoryItem.serial_number)

    return NextResponse.json({
      success: true,
      message: `Modem "${serial_number}" başarıyla teknisyene atandı`,
      action: 'assigned_existing',
      inventory_item: inventoryItem,
      assignment: assignment
    })

  } catch (error: any) {
    console.error('📋 Barkod atama genel hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası: ' + error.message },
      { status: 500 }
    )
  }
}
