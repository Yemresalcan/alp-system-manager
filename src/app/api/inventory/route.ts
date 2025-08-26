import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Envanter öğesi ekleme
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      description, 
      category, 
      brand, 
      model, 
      serial_number, 
      purchase_date, 
      purchase_price, 
      status = 'available',
      location,
      notes,
      total_quantity = 1,
      unit_type = 'adet',
      is_consumable = false,
      min_stock_level = 0,
      created_by 
    } = body

    console.log('🔧 Inventory API: Yeni envanter öğesi ekleniyor...', { name, category, total_quantity })

    // Zorunlu alanları kontrol et
    if (!name || !category || !created_by || !total_quantity) {
      return NextResponse.json(
        { error: 'Eksik bilgi: name, category, created_by ve total_quantity gerekli' },
        { status: 400 }
      )
    }

    if (total_quantity < 1) {
      return NextResponse.json(
        { error: 'Toplam miktar en az 1 olmalıdır' },
        { status: 400 }
      )
    }

    // Seri numarası benzersizlik kontrolü
    if (serial_number) {
      const { data: existing } = await supabaseAdmin
        .from('inventory_items')
        .select('id')
        .eq('serial_number', serial_number)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'Bu seri numarası zaten kullanımda' },
          { status: 400 }
        )
      }
    }

    // Envanter öğesini ekle
    const { data: inventoryData, error: inventoryError } = await supabaseAdmin
      .from('inventory_items')
      .insert([{
        name: name.trim(),
        description: description?.trim() || null,
        category,
        brand: brand?.trim() || null,
        model: model?.trim() || null,
        serial_number: serial_number?.trim() || null,
        purchase_date: purchase_date || null,
        purchase_price: purchase_price || null,
        status,
        location: location?.trim() || null,
        notes: notes?.trim() || null,
        total_quantity,
        available_quantity: total_quantity,
        assigned_quantity: 0,
        unit_type,
        is_consumable,
        min_stock_level,
        created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (inventoryError) {
      console.error('❌ Envanter ekleme hatası:', inventoryError)
      return NextResponse.json(
        { error: `Veritabanı hatası: ${inventoryError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Envanter öğesi eklendi:', inventoryData.id)

    return NextResponse.json({
      message: 'Envanter öğesi başarıyla eklendi',
      data: inventoryData
    })

  } catch (error: any) {
    console.error('❌ Inventory API POST hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}

// Envanter öğelerini listeleme
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    console.log('🔧 Inventory API: Envanter öğeleri listeleniyor...', { category, status, search })

    let query = supabaseAdmin
      .from('inventory_items')
      .select('*')
      .order('created_at', { ascending: false })

    // Filtreler
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,brand.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Envanter listeleme hatası:', error)
      return NextResponse.json(
        { error: `Veritabanı hatası: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Envanter öğeleri listelendi:', data?.length || 0)

    return NextResponse.json({
      data: data || []
    })

  } catch (error: any) {
    console.error('❌ Inventory API GET hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}

// Envanter öğesi güncelleme
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      id,
      name, 
      description, 
      category, 
      brand, 
      model, 
      serial_number, 
      purchase_date, 
      purchase_price, 
      status,
      location,
      notes 
    } = body

    console.log('🔧 Inventory API: Envanter öğesi güncelleniyor...', { id, name })

    if (!id || !name || !category) {
      return NextResponse.json(
        { error: 'Eksik bilgi: id, name ve category gerekli' },
        { status: 400 }
      )
    }

    // Seri numarası benzersizlik kontrolü (kendisi hariç)
    if (serial_number) {
      const { data: existing } = await supabaseAdmin
        .from('inventory_items')
        .select('id')
        .eq('serial_number', serial_number)
        .neq('id', id)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'Bu seri numarası zaten kullanımda' },
          { status: 400 }
        )
      }
    }

    // Envanter öğesini güncelle
    const { data: inventoryData, error: inventoryError } = await supabaseAdmin
      .from('inventory_items')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        category,
        brand: brand?.trim() || null,
        model: model?.trim() || null,
        serial_number: serial_number?.trim() || null,
        purchase_date: purchase_date || null,
        purchase_price: purchase_price || null,
        status,
        location: location?.trim() || null,
        notes: notes?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (inventoryError) {
      console.error('❌ Envanter güncelleme hatası:', inventoryError)
      return NextResponse.json(
        { error: `Veritabanı hatası: ${inventoryError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Envanter öğesi güncellendi:', inventoryData.id)

    return NextResponse.json({
      message: 'Envanter öğesi başarıyla güncellendi',
      data: inventoryData
    })

  } catch (error: any) {
    console.error('❌ Inventory API PUT hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}

// Envanter öğesi silme
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    console.log('🔧 Inventory API: Envanter öğesi siliniyor...', { id })

    if (!id) {
      return NextResponse.json(
        { error: 'Envanter öğesi ID gerekli' },
        { status: 400 }
      )
    }

    // Önce atama kontrolü yap
    const { data: assignments } = await supabaseAdmin
      .from('technician_inventory')
      .select('id')
      .eq('inventory_item_id', id)
      .eq('status', 'assigned')

    if (assignments && assignments.length > 0) {
      return NextResponse.json(
        { error: 'Bu envanter öğesi tekniksyene atanmış durumda. Önce geri alınmalı.' },
        { status: 400 }
      )
    }

    // Envanter öğesini sil
    const { error: deleteError } = await supabaseAdmin
      .from('inventory_items')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('❌ Envanter silme hatası:', deleteError)
      return NextResponse.json(
        { error: `Veritabanı hatası: ${deleteError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Envanter öğesi silindi:', id)

    return NextResponse.json({
      message: 'Envanter öğesi başarıyla silindi'
    })

  } catch (error: any) {
    console.error('❌ Inventory API DELETE hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}
