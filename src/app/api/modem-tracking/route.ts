import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET - Modem listesi ve arama
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const technician = searchParams.get('technician') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log('📋 Modem listesi isteniyor:', { search, status, technician, limit, offset })

    let query = supabaseAdmin
      .from('modem_tracking')
      .select(`
        *,
        profiles:assigned_technician_id(id, full_name, email, city)
      `, { count: 'exact' })

    // Arama filtresi
    if (search.trim()) {
      query = query.or(`
        modem_serial_number.ilike.%${search}%,
        document_number.ilike.%${search}%,
        stock_name.ilike.%${search}%,
        assigned_technician_name.ilike.%${search}%,
        assignment_service_number.ilike.%${search}%
      `)
    }

    // Durum filtresi
    if (status && status !== 'all') {
      query = query.eq('current_status', status)
    }

    // Teknisyen filtresi
    if (technician && technician !== 'all') {
      query = query.eq('assigned_technician_id', technician)
    }

    // Sıralama ve sayfalama
    query = query
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: modems, error, count } = await query

    if (error) {
      throw error
    }

    // İstatistikler
    const { data: stats } = await supabaseAdmin
      .from('modem_tracking')
      .select('current_status')

    const statistics = {
      total: count || 0,
      available: stats?.filter(s => s.current_status === 'available').length || 0,
      assigned: stats?.filter(s => s.current_status === 'assigned').length || 0,
      in_use: stats?.filter(s => s.current_status === 'in_use').length || 0,
      returned: stats?.filter(s => s.current_status === 'returned').length || 0,
      lost: stats?.filter(s => s.current_status === 'lost').length || 0,
      damaged: stats?.filter(s => s.current_status === 'damaged').length || 0
    }

    return NextResponse.json({
      success: true,
      modems: modems || [],
      total: count || 0,
      offset,
      limit,
      statistics,
      filters: {
        search,
        status,
        technician
      }
    })

  } catch (error: any) {
    console.error('📋 Modem listesi hatası:', error)
    return NextResponse.json(
      { error: 'Modem listesi alınamadı: ' + error.message },
      { status: 500 }
    )
  }
}

// PUT - Modem durumu güncelle
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      modem_id,
      action, // 'return', 'mark_lost', 'mark_damaged', 'reassign'
      notes,
      new_technician_id,
      performed_by
    } = body

    if (!modem_id || !action || !performed_by) {
      return NextResponse.json(
        { error: 'Modem ID, aksiyon ve işlemi yapan kişi gerekli' },
        { status: 400 }
      )
    }

    // Mevcut modem bilgilerini al
    const { data: currentModem, error: findError } = await supabaseAdmin
      .from('modem_tracking')
      .select('*')
      .eq('id', modem_id)
      .single()

    if (findError || !currentModem) {
      return NextResponse.json(
        { error: 'Modem bulunamadı' },
        { status: 404 }
      )
    }

    let updateData: any = {
      updated_at: new Date().toISOString()
    }

    switch (action) {
      case 'return':
        updateData = {
          ...updateData,
          current_status: 'returned',
          returned_date: new Date().toISOString(),
          returned_by: performed_by,
          return_notes: notes || null
        }
        break

      case 'mark_lost':
        updateData = {
          ...updateData,
          current_status: 'lost',
          return_notes: notes || 'Kayıp olarak işaretlendi'
        }
        break

      case 'mark_damaged':
        updateData = {
          ...updateData,
          current_status: 'damaged',
          return_notes: notes || 'Hasarlı olarak işaretlendi'
        }
        break

      case 'reassign':
        if (!new_technician_id) {
          return NextResponse.json(
            { error: 'Yeni teknisyen ID gerekli' },
            { status: 400 }
          )
        }

        // Yeni teknisyen bilgilerini al
        const { data: newTechnician, error: techError } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name')
          .eq('id', new_technician_id)
          .single()

        if (techError || !newTechnician) {
          return NextResponse.json(
            { error: 'Yeni teknisyen bulunamadı' },
            { status: 404 }
          )
        }

        updateData = {
          ...updateData,
          assigned_technician_id: new_technician_id,
          assigned_technician_name: newTechnician.full_name,
          assigned_date: new Date().toISOString(),
          assignment_notes: notes || 'Yeniden atandı - kullanımda',
          current_status: 'in_use'
        }
        break

      case 'make_available':
        updateData = {
          ...updateData,
          assigned_technician_id: null,
          assigned_technician_name: null,
          assigned_date: null,
          assignment_task_type: null,
          assignment_service_number: null,
          assignment_location: null,
          assignment_notes: null,
          returned_date: new Date().toISOString(),
          returned_by: performed_by,
          return_notes: notes || 'Sisteme geri alındı',
          current_status: 'available'
        }
        break

      default:
        return NextResponse.json(
          { error: 'Geçersiz aksiyon' },
          { status: 400 }
        )
    }

    // Modem durumunu güncelle
    const { data: updatedModem, error: updateError } = await supabaseAdmin
      .from('modem_tracking')
      .update(updateData)
      .eq('id', modem_id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    console.log('✅ Modem durumu güncellendi:', {
      serial: currentModem.modem_serial_number,
      action,
      new_status: updateData.current_status
    })

    return NextResponse.json({
      success: true,
      message: `Modem "${currentModem.modem_serial_number}" durumu güncellendi`,
      modem: updatedModem,
      action
    })

  } catch (error: any) {
    console.error('📋 Modem güncelleme hatası:', error)
    return NextResponse.json(
      { error: 'Modem güncelleme başarısız: ' + error.message },
      { status: 500 }
    )
  }
}

// DELETE - Modem sil (sadece admin)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const modemId = searchParams.get('id')

    if (!modemId) {
      return NextResponse.json(
        { error: 'Modem ID gerekli' },
        { status: 400 }
      )
    }

    // Modem bilgilerini al
    const { data: modem, error: findError } = await supabaseAdmin
      .from('modem_tracking')
      .select('modem_serial_number')
      .eq('id', modemId)
      .single()

    if (findError || !modem) {
      return NextResponse.json(
        { error: 'Modem bulunamadı' },
        { status: 404 }
      )
    }

    // Modemi sil
    const { error: deleteError } = await supabaseAdmin
      .from('modem_tracking')
      .delete()
      .eq('id', modemId)

    if (deleteError) {
      throw deleteError
    }

    console.log('🗑️ Modem silindi:', modem.modem_serial_number)

    return NextResponse.json({
      success: true,
      message: `Modem "${modem.modem_serial_number}" başarıyla silindi`
    })

  } catch (error: any) {
    console.error('📋 Modem silme hatası:', error)
    return NextResponse.json(
      { error: 'Modem silme başarısız: ' + error.message },
      { status: 500 }
    )
  }
}
