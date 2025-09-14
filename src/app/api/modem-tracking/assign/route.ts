import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      serial_number, 
      technician_id,
      task_type,
      service_number,
      location,
      notes,
      assigned_by
    } = body

    console.log('📋 Modem Atama: Seri numarası ile teknisyene atama...', { 
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

    // 1. Teknisyen bilgilerini al
    const { data: technician, error: techError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', technician_id)
      .single()

    if (techError || !technician) {
      console.error('❌ Teknisyen bulunamadı:', techError)
      return NextResponse.json(
        { error: 'Teknisyen bulunamadı' },
        { status: 404 }
      )
    }

    // 2. Seri numarasına göre modem bul (son 4 hane ile eşleştirme)
    // Önce tam eşleşme dene
    let { data: modem, error: findError } = await supabaseAdmin
      .from('modem_tracking')
      .select('*')
      .eq('modem_serial_number', serial_number)
      .single()

    // Tam eşleşme yoksa son 4 hane ile ara
    if (findError && serial_number.length >= 4) {
      console.log('🔍 Tam eşleşme yok, son 4 hane ile aranıyor...', serial_number)
      
      const last4Digits = serial_number.slice(-4)
      const { data: matchingModems, error: searchError } = await supabaseAdmin
        .from('modem_tracking')
        .select('*')
        .like('modem_serial_number', `%${last4Digits}`)

      if (searchError) {
        console.error('❌ Son 4 hane arama hatası:', searchError)
        return NextResponse.json(
          { error: 'Modem arama hatası: ' + searchError.message },
          { status: 500 }
        )
      }

      if (!matchingModems || matchingModems.length === 0) {
        console.log('❌ Son 4 hane ile de modem bulunamadı:', last4Digits)
        return NextResponse.json(
          { 
            error: `Son 4 hanesi "${last4Digits}" olan modem sistemde bulunamadı`,
            suggestion: 'Önce Excel ile modem listesini sisteme yükleyin veya tam seri numarasını deneyin'
          },
          { status: 404 }
        )
      }

      if (matchingModems.length > 1) {
        const serials = matchingModems.map(m => m.modem_serial_number)
        console.log('⚠️ Son 4 hane ile birden fazla modem bulundu:', serials)
        return NextResponse.json(
          { 
            error: `Son 4 hanesi "${last4Digits}" olan ${matchingModems.length} modem bulundu`,
            suggestion: 'Tam seri numarasını girin',
            matches: serials.slice(0, 5) // İlk 5 tanesini göster
          },
          { status: 400 }
        )
      }

      modem = matchingModems[0]
      console.log('✅ Son 4 hane ile modem bulundu:', modem.modem_serial_number)
    }

    if (!modem) {
      console.log('❌ Modem bulunamadı:', serial_number)
      return NextResponse.json(
        { 
          error: `Modem "${serial_number}" sistemde bulunamadı`,
          suggestion: 'Önce Excel ile modem listesini sisteme yükleyin'
        },
        { status: 404 }
      )
    }

    // 3. Modem zaten kullanımda mı kontrol et
    if ((modem.current_status === 'assigned' || modem.current_status === 'in_use') && modem.assigned_technician_id) {
      return NextResponse.json(
        { 
          error: `Modem "${serial_number}" zaten "${modem.assigned_technician_name}" isimli teknisyen tarafından kullanılıyor`,
          assigned_date: modem.assigned_date,
          current_technician: modem.assigned_technician_name,
          current_status: modem.current_status
        },
        { status: 400 }
      )
    }

    // 4. Önce log kaydı oluştur (trigger çalışmadan önce)
    const { error: logError } = await supabaseAdmin
      .from('modem_tracking_logs')
      .insert({
        modem_tracking_id: modem.id,
        action: 'technician_changed',
        old_value: JSON.stringify({
          technician_id: modem.assigned_technician_id,
          status: modem.current_status,
          returned_date: modem.returned_date
        }),
        new_value: JSON.stringify({
          technician_id: technician_id,
          status: 'in_use',
          returned_date: null
        }),
        performed_by: assigned_by,
        notes: `Kullanıma alındı: ${notes || 'Görev sırasında kullanıma alındı'}`
      })

    if (logError) {
      console.warn('⚠️ Log kaydı oluşturulamadı:', logError)
      // Log hatası task'i durdurmaz, devam ederiz
    }

    // 5. Modemi teknisyene ata
    const assignmentData = {
      assigned_technician_id: technician_id,
      assigned_technician_name: technician.full_name,
      assigned_date: new Date().toISOString(),
      assignment_task_type: task_type || null,
      assignment_service_number: service_number || null,
      assignment_location: location || null,
      assignment_notes: notes || null,
      current_status: 'in_use',
      updated_at: new Date().toISOString()
    }

    const { data: updatedModem, error: updateError } = await supabaseAdmin
      .from('modem_tracking')
      .update(assignmentData)
      .eq('id', modem.id)
      .select()
      .single()

    if (updateError || !updatedModem) {
      console.error('❌ Modem atama hatası:', updateError)
      return NextResponse.json(
        { error: 'Modem atama işlemi başarısız2: ' + updateError?.message },
        { status: 500 }
      )
    }

    console.log('✅ Modem başarıyla atandı:', {
      serial: serial_number,
      technician: technician.full_name,
      task: task_type
    })

    return NextResponse.json({
      success: true,
      message: `Modem "${serial_number}" başarıyla "${technician.full_name}" teknisyeni tarafından kullanıma alındı`,
      modem: updatedModem,
      technician: {
        id: technician.id,
        name: technician.full_name
      },
      assignment_details: {
        task_type,
        service_number,
        location,
        assigned_date: assignmentData.assigned_date
      }
    })

  } catch (error: any) {
    console.error('📋 Modem atama genel hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası: ' + error.message },
      { status: 500 }
    )
  }
}

// GET - Teknisyene atanmış modemleri listele
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const technicianId = searchParams.get('technician_id')
    const status = searchParams.get('status') || 'in_use'

    if (!technicianId) {
      // Tüm atanmış modemleri getir (admin için)
      const { data: modems, error } = await supabaseAdmin
        .from('modem_tracking')
        .select(`
          *,
          profiles:assigned_technician_id(id, full_name, email)
        `)
        .eq('current_status', status)
        .order('assigned_date', { ascending: false })

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        modems: modems || [],
        count: modems?.length || 0
      })
    } else {
      // Belirli teknisyenin modemlerini getir
      const { data: modems, error } = await supabaseAdmin
        .from('modem_tracking')
        .select('*')
        .eq('assigned_technician_id', technicianId)
        .eq('current_status', status)
        .order('assigned_date', { ascending: false })

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        modems: modems || [],
        count: modems?.length || 0
      })
    }

  } catch (error: any) {
    console.error('📋 Modem listeleme hatası:', error)
    return NextResponse.json(
      { error: 'Modem listesi alınamadı: ' + error.message },
      { status: 500 }
    )
  }
}
