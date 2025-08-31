import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabase } from '@/lib/supabase'

// Session kontrolü yapan yardımcı fonksiyon
async function checkUserSession(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return { error: 'Authorization header eksik', status: 401 }
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { error: 'Geçersiz token', status: 401 }
    }

    return { user, error: null, status: 200 }
  } catch (error) {
    return { error: 'Session kontrol hatası', status: 500 }
  }
}

// Görev oluşturma
export async function POST(request: NextRequest) {
  try {
    // Session kontrolü
    const sessionCheck = await checkUserSession(request)
    if (sessionCheck.error) {
      return NextResponse.json(
        { error: sessionCheck.error },
        { status: sessionCheck.status }
      )
    }

    const body = await request.json()
    const { 
      technician_id,
      task_type, 
      service_number,
      notes,
      location
    } = body

    console.log('🔧 Tasks API: Yeni görev oluşturuluyor...', { task_type, service_number, user_id: sessionCheck.user?.id })

    // Kullanıcı technician_id ile eşleşiyor mu kontrol et
    if (sessionCheck.user?.id !== technician_id) {
      return NextResponse.json(
        { error: 'Sadece kendi görevlerinizi oluşturabilirsiniz' },
        { status: 403 }
      )
    }

    // Zorunlu alanları kontrol et
    if (!technician_id || !task_type || !service_number) {
      return NextResponse.json(
        { error: 'Eksik bilgi: technician_id, task_type ve service_number gerekli' },
        { status: 400 }
      )
    }

    // Teknisyen günlük görev limitini kontrol et (9 görev)
    const today = new Date().toISOString().split('T')[0]
    const { data: todayTasks, error: countError } = await supabaseAdmin
      .from('tasks')
      .select('id')
      .eq('technician_id', technician_id)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)

    if (countError) {
      console.error('❌ Günlük görev sayısı kontrolü hatası:', countError)
      return NextResponse.json(
        { error: 'Görev sayısı kontrol edilemedi' },
        { status: 500 }
      )
    }

    if (todayTasks && todayTasks.length >= 9) {
      return NextResponse.json(
        { error: 'Günlük görev limiti (9 görev) aşıldı' },
        { status: 400 }
      )
    }

    // Aynı servis numarası kontrolü
    const { data: existingTask } = await supabaseAdmin
      .from('tasks')
      .select('id')
      .eq('service_number', service_number)
      .eq('technician_id', technician_id)
      .eq('status', 'pending')
      .single()

    if (existingTask) {
      return NextResponse.json(
        { error: 'Bu servis numarası için zaten aktif bir görev var' },
        { status: 400 }
      )
    }

    // Görevi oluştur
    const { data: taskData, error: taskError } = await supabaseAdmin
      .from('tasks')
      .insert([{
        technician_id,
        task_type,
        title: `${task_type} - ${service_number}`,
        description: notes?.trim() || `${task_type} görevi`,
        created_by: technician_id, // Teknisyen kendisi oluşturuyor
        service_number: service_number.trim(),
        status: 'pending',
        notes: notes?.trim() || null,
        location: location?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (taskError) {
      console.error('❌ Görev oluşturma hatası:', taskError)
      return NextResponse.json(
        { error: `Veritabanı hatası: ${taskError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Görev oluşturuldu:', taskData.id)

    return NextResponse.json({
      message: 'Görev başarıyla oluşturuldu',
      data: taskData
    })

  } catch (error: any) {
    console.error('❌ Tasks API POST hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}

// Görevleri listeleme
export async function GET(request: NextRequest) {
  try {
    // Session kontrolü
    const sessionCheck = await checkUserSession(request)
    if (sessionCheck.error) {
      return NextResponse.json(
        { error: sessionCheck.error },
        { status: sessionCheck.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const technician_id = searchParams.get('technician_id')
    const status = searchParams.get('status')
    const date = searchParams.get('date')
    const task_type = searchParams.get('task_type')

    console.log('🔧 Tasks API: Görevler listeleniyor...', { technician_id, status, date, user_id: sessionCheck.user?.id })

    // Kullanıcı sadece kendi görevlerini görebilir (admin değilse)
    if (technician_id && sessionCheck.user?.id !== technician_id) {
      // Admin kontrolü yapmak için profile tablosunu kontrol edebiliriz
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', sessionCheck.user?.id)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Sadece kendi görevlerinizi görebilirsiniz' },
          { status: 403 }
        )
      }
    }

    let query = supabaseAdmin
      .from('tasks')
      .select(`
        *,
        profiles!tasks_technician_id_fkey(full_name, email),
        task_photos(id, photo_url, file_name)
      `)
      .order('created_at', { ascending: false })

    // Filtreler
    if (technician_id) {
      query = query.eq('technician_id', technician_id)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (task_type && task_type !== 'all') {
      query = query.eq('task_type', task_type)
    }

    if (date) {
      const startDate = `${date}T00:00:00.000Z`
      const endDate = `${date}T23:59:59.999Z`
      query = query.gte('created_at', startDate).lt('created_at', endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Görev listeleme hatası:', error)
      return NextResponse.json(
        { error: `Veritabanı hatası: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Görevler listelendi:', data?.length || 0)

    return NextResponse.json({
      data: data || []
    })

  } catch (error: any) {
    console.error('❌ Tasks API GET hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}

// Görev güncelleme
export async function PUT(request: NextRequest) {
  try {
    // Session kontrolü
    const sessionCheck = await checkUserSession(request)
    if (sessionCheck.error) {
      return NextResponse.json(
        { error: sessionCheck.error },
        { status: sessionCheck.status }
      )
    }

    const body = await request.json()
    const { 
      id,
      status,
      notes,
      location,
      started_at,
      completed_at
    } = body

    console.log('🔧 Tasks API: Görev güncelleniyor...', { id, status, user_id: sessionCheck.user?.id })

    if (!id) {
      return NextResponse.json(
        { error: 'Görev ID gerekli' },
        { status: 400 }
      )
    }

    // Görevin mevcut olup olmadığını ve kullanıcının yetkisi olup olmadığını kontrol et
    const { data: existingTask } = await supabaseAdmin
      .from('tasks')
      .select('technician_id')
      .eq('id', id)
      .single()

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Görev bulunamadı' },
        { status: 404 }
      )
    }

    // Kullanıcı sadece kendi görevlerini güncelleyebilir (admin değilse)
    if (sessionCheck.user?.id !== existingTask.technician_id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', sessionCheck.user?.id)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Sadece kendi görevlerinizi güncelleyebilirsiniz' },
          { status: 403 }
        )
      }
    }

    // Güncelleme verilerini hazırla
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) updateData.status = status
    if (notes !== undefined) updateData.notes = notes?.trim() || null
    if (location !== undefined) updateData.location = location?.trim() || null
    if (started_at) updateData.started_at = started_at
    if (completed_at) updateData.completed_at = completed_at

    // Durum değişikliklerini otomatik ayarla
    if (status === 'in_progress' && !started_at) {
      updateData.started_at = new Date().toISOString()
    }
    if (status === 'completed' && !completed_at) {
      updateData.completed_at = new Date().toISOString()
    }

    // Görevi güncelle
    const { data: taskData, error: taskError } = await supabaseAdmin
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (taskError) {
      console.error('❌ Görev güncelleme hatası:', taskError)
      return NextResponse.json(
        { error: `Veritabanı hatası: ${taskError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Görev güncellendi:', taskData.id)

    return NextResponse.json({
      message: 'Görev başarıyla güncellendi',
      data: taskData
    })

  } catch (error: any) {
    console.error('❌ Tasks API PUT hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}

// Görev silme
export async function DELETE(request: NextRequest) {
  try {
    // Session kontrolü
    const sessionCheck = await checkUserSession(request)
    if (sessionCheck.error) {
      return NextResponse.json(
        { error: sessionCheck.error },
        { status: sessionCheck.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    console.log('🔧 Tasks API: Görev siliniyor...', { id, user_id: sessionCheck.user?.id })

    if (!id) {
      return NextResponse.json(
        { error: 'Görev ID gerekli' },
        { status: 400 }
      )
    }

    // Görevin mevcut olup olmadığını ve kullanıcının yetkisi olup olmadığını kontrol et
    const { data: existingTask } = await supabaseAdmin
      .from('tasks')
      .select('technician_id')
      .eq('id', id)
      .single()

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Görev bulunamadı' },
        { status: 404 }
      )
    }

    // Sadece admin görev silebilir
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', sessionCheck.user?.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Görev silme yetkisi sadece admin\'lerde' },
        { status: 403 }
      )
    }

    // Önce fotoğrafları sil
    const { error: photosError } = await supabaseAdmin
      .from('task_photos')
      .delete()
      .eq('task_id', id)

    if (photosError) {
      console.error('❌ Görev fotoğrafları silme hatası:', photosError)
      return NextResponse.json(
        { error: `Fotoğraf silme hatası: ${photosError.message}` },
        { status: 500 }
      )
    }

    // Görevi sil
    const { error: deleteError } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('❌ Görev silme hatası:', deleteError)
      return NextResponse.json(
        { error: `Veritabanı hatası: ${deleteError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Görev silindi:', id)

    return NextResponse.json({
      message: 'Görev başarıyla silindi'
    })

  } catch (error: any) {
    console.error('❌ Tasks API DELETE hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}
