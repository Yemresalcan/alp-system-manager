import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Görev fotoğrafı yükleme
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const taskId = formData.get('task_id') as string
    const file = formData.get('file') as File
    const description = formData.get('description') as string

    console.log('🔧 Task Photos API: Fotoğraf yükleniyor...', { taskId, fileName: file?.name })

    if (!taskId || !file) {
      return NextResponse.json(
        { error: 'Görev ID ve dosya gerekli' },
        { status: 400 }
      )
    }

    // Dosya boyutu kontrolü (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Dosya boyutu 10MB\'dan büyük olamaz' },
        { status: 400 }
      )
    }

    // Dosya tipini kontrol et
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Sadece resim dosyaları (JPG, PNG, WebP) yüklenebilir' },
        { status: 400 }
      )
    }

    // Görevin var olduğunu kontrol et
    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select('id, technician_id')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Görev bulunamadı' },
        { status: 404 }
      )
    }

    // Dosya adını oluştur
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `task_${taskId}_${timestamp}.${fileExtension}`
    const filePath = `task-photos/${fileName}`

    // Dosyayı Supabase Storage'a yükle
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('task-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Dosya yükleme hatası:', uploadError)
      return NextResponse.json(
        { error: `Dosya yüklenemedi: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Public URL al
    const { data: urlData } = supabaseAdmin.storage
      .from('task-photos')
      .getPublicUrl(filePath)

    // Veritabanına kaydet
    const { data: photoData, error: dbError } = await supabaseAdmin
      .from('task_photos')
      .insert([{
        task_id: taskId,
        photo_url: urlData.publicUrl,
        file_name: fileName,
        file_size: file.size,
        mime_type: file.type,
        description: description?.trim() || null,
        uploaded_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (dbError) {
      // Yüklenen dosyayı sil
      await supabaseAdmin.storage
        .from('task-photos')
        .remove([filePath])

      console.error('❌ Veritabanı kayıt hatası:', dbError)
      return NextResponse.json(
        { error: `Veritabanı hatası: ${dbError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Fotoğraf yüklendi:', photoData.id)

    return NextResponse.json({
      message: 'Fotoğraf başarıyla yüklendi',
      data: photoData
    })

  } catch (error: any) {
    console.error('❌ Task Photos API POST hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}

// Görev fotoğraflarını listeleme
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('task_id')

    console.log('🔧 Task Photos API: Fotoğraflar listeleniyor...', { taskId })

    if (!taskId) {
      return NextResponse.json(
        { error: 'Görev ID gerekli' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('task_photos')
      .select('*')
      .eq('task_id', taskId)
      .order('uploaded_at', { ascending: true })

    if (error) {
      console.error('❌ Fotoğraf listeleme hatası:', error)
      return NextResponse.json(
        { error: `Veritabanı hatası: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Fotoğraflar listelendi:', data?.length || 0)

    return NextResponse.json({
      data: data || []
    })

  } catch (error: any) {
    console.error('❌ Task Photos API GET hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}

// Fotoğraf silme
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    console.log('🔧 Task Photos API: Fotoğraf siliniyor...', { id })

    if (!id) {
      return NextResponse.json(
        { error: 'Fotoğraf ID gerekli' },
        { status: 400 }
      )
    }

    // Fotoğraf bilgilerini al
    const { data: photo, error: photoError } = await supabaseAdmin
      .from('task_photos')
      .select('file_name, photo_url')
      .eq('id', id)
      .single()

    if (photoError || !photo) {
      return NextResponse.json(
        { error: 'Fotoğraf bulunamadı' },
        { status: 404 }
      )
    }

    // Storage'dan dosyayı sil
    if (photo.file_name) {
      const filePath = `task-photos/${photo.file_name}`
      await supabaseAdmin.storage
        .from('task-photos')
        .remove([filePath])
    }

    // Veritabanından sil
    const { error: deleteError } = await supabaseAdmin
      .from('task_photos')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('❌ Fotoğraf silme hatası:', deleteError)
      return NextResponse.json(
        { error: `Veritabanı hatası: ${deleteError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Fotoğraf silindi:', id)

    return NextResponse.json({
      message: 'Fotoğraf başarıyla silindi'
    })

  } catch (error: any) {
    console.error('❌ Task Photos API DELETE hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}
