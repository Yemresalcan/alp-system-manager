import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Teknisyen ekle
export async function POST(request: NextRequest) {
  try {
    const { full_name, email, password, phone, city } = await request.json()

    console.log('🔧 Admin API: Teknisyen ekleniyor...', { full_name, email })

    // 1. Auth kullanıcısı oluştur (admin yetkisi ile)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Email doğrulamayı bypass et
      user_metadata: {
        full_name,
        role: 'technician'
      }
    })

    if (authError) {
      console.error('❌ Auth hatası:', authError)
      return NextResponse.json(
        { error: `Auth hatası: ${authError.message}` },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Kullanıcı verisi alınamadı' },
        { status: 400 }
      )
    }

    console.log('✅ Auth kullanıcısı oluşturuldu:', authData.user.id)

    // 2. Profile oluştur (admin client ile - RLS bypass)
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email,
        full_name,
        phone: phone || null,
        city,
        role: 'technician',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()

    if (profileError) {
      console.error('❌ Profile hatası:', profileError)
      // Auth kullanıcısını sil çünkü profile oluşturulamadı
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: `Profile hatası: ${profileError.message}` },
        { status: 400 }
      )
    }

    console.log('✅ Profile başarıyla oluşturuldu:', profileData)

    return NextResponse.json({
      success: true,
      user: authData.user,
      profile: profileData?.[0],
      message: `${full_name} başarıyla eklendi`
    })

  } catch (error: any) {
    console.error('💥 API Hatası:', error)
    return NextResponse.json(
      { error: error.message || 'Bilinmeyen hata' },
      { status: 500 }
    )
  }
}

// Teknisyen güncelle
export async function PUT(request: NextRequest) {
  try {
    const { id, full_name, phone, city } = await request.json()

    console.log('🔧 Admin API: Teknisyen güncelleniyor...', { id, full_name })

    // Profile güncelle (admin client ile)
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name,
        phone: phone || null,
        city,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (profileError) {
      console.error('❌ Profile güncelleme hatası:', profileError)
      return NextResponse.json(
        { error: `Güncelleme hatası: ${profileError.message}` },
        { status: 400 }
      )
    }

    console.log('✅ Profile başarıyla güncellendi:', profileData)

    return NextResponse.json({
      success: true,
      profile: profileData?.[0],
      message: `${full_name} başarıyla güncellendi`
    })

  } catch (error: any) {
    console.error('💥 API Hatası:', error)
    return NextResponse.json(
      { error: error.message || 'Bilinmeyen hata' },
      { status: 500 }
    )
  }
}

// Teknisyen sil
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Teknisyen ID gerekli' },
        { status: 400 }
      )
    }

    console.log('🔧 Admin API: Teknisyen siliniyor...', { id })

    // 1. Profile sil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id)

    if (profileError) {
      console.error('❌ Profile silme hatası:', profileError)
    }

    // 2. Auth kullanıcısını sil
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)

    if (authError) {
      console.error('❌ Auth silme hatası:', authError)
      return NextResponse.json(
        { error: `Silme hatası: ${authError.message}` },
        { status: 400 }
      )
    }

    console.log('✅ Teknisyen başarıyla silindi:', id)

    return NextResponse.json({
      success: true,
      message: 'Teknisyen başarıyla silindi'
    })

  } catch (error: any) {
    console.error('💥 API Hatası:', error)
    return NextResponse.json(
      { error: error.message || 'Bilinmeyen hata' },
      { status: 500 }
    )
  }
}
