import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    console.log('📊 Excel Upload: Dosya yükleniyor...', { 
      fileName: file?.name, 
      fileSize: file?.size,
      userId 
    })

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'Dosya ve kullanıcı ID gerekli' },
        { status: 400 }
      )
    }

    // Excel dosyasını oku
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // JSON formatına çevir
    const jsonData = XLSX.utils.sheet_to_json(worksheet)
    console.log('📊 Excel parse edildi, satır sayısı:', jsonData.length)

    if (jsonData.length === 0) {
      return NextResponse.json(
        { error: 'Excel dosyasında veri bulunamadı' },
        { status: 400 }
      )
    }

    // Excel kolonları -> DB kolonları mapping
    const processedItems = []
    const errors = []

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any
      const rowIndex = i + 2 // Excel satır numarası (başlık satırından sonra)

      try {
        // Excel kolonlarını normalize et (farklı isimleri kabul et)
        const name = 
          row['Ürün Adı'] || row['Ad'] || row['Name'] || 
          row['Modem'] || row['Device'] || row['name'] || ''
          
        const serialNumber = 
          row['Seri Numarası'] || row['Serial'] || row['SN'] ||
          row['Seri No'] || row['serial_number'] || row['serial'] || ''
          
        const brand = 
          row['Marka'] || row['Brand'] || row['brand'] || ''
          
        const model = 
          row['Model'] || row['model'] || ''
          
        const category = 
          row['Kategori'] || row['Category'] || row['category'] || 'device'
          
        const quantity = parseInt(
          row['Adet'] || row['Quantity'] || row['Miktar'] || 
          row['quantity'] || row['total_quantity'] || '1'
        )

        const location = 
          row['Konum'] || row['Location'] || row['location'] || ''

        // Zorunlu alan kontrolü
        if (!name.trim()) {
          errors.push(`Satır ${rowIndex}: Ürün adı boş olamaz`)
          continue
        }

        // Kategori kontrolü
        const validCategories = ['cable', 'safety', 'tool', 'device', 'vehicle', 'consumable', 'other']
        const normalizedCategory = category.toLowerCase()
        const finalCategory = validCategories.includes(normalizedCategory) ? normalizedCategory : 'device'

        processedItems.push({
          name: name.trim(),
          serial_number: serialNumber.trim() || null,
          brand: brand.trim() || null,
          model: model.trim() || null,
          category: finalCategory,
          total_quantity: isNaN(quantity) ? 1 : Math.max(1, quantity),
          available_quantity: isNaN(quantity) ? 1 : Math.max(1, quantity),
          assigned_quantity: 0,
          location: location.trim() || null,
          status: 'available',
          unit_type: 'adet',
          is_consumable: false,
          min_stock_level: 0,
          created_by: userId
        })

      } catch (error) {
        console.error(`Satır ${rowIndex} işlenirken hata:`, error)
        errors.push(`Satır ${rowIndex}: İşleme hatası - ${error}`)
      }
    }

    console.log('📊 İşlenen öğe sayısı:', processedItems.length)
    console.log('📊 Hata sayısı:', errors.length)

    if (processedItems.length === 0) {
      return NextResponse.json(
        { 
          error: 'İşlenebilir veri bulunamadı',
          details: errors.slice(0, 10) // İlk 10 hatayı göster
        },
        { status: 400 }
      )
    }

    // Seri numarası duplikasyon kontrolü (hem kendi içinde hem DB'de)
    const serialNumbers = new Set()
    const duplicateSerials = []
    
    for (const item of processedItems) {
      if (item.serial_number) {
        if (serialNumbers.has(item.serial_number)) {
          duplicateSerials.push(item.serial_number)
        } else {
          serialNumbers.add(item.serial_number)
        }
      }
    }

    if (duplicateSerials.length > 0) {
      return NextResponse.json(
        { 
          error: 'Duplicate seri numaraları bulundu',
          duplicates: duplicateSerials
        },
        { status: 400 }
      )
    }

    // DB'deki mevcut seri numaralarını kontrol et
    if (serialNumbers.size > 0) {
      const { data: existingSerials } = await supabaseAdmin
        .from('inventory_items')
        .select('serial_number')
        .in('serial_number', Array.from(serialNumbers))

      if (existingSerials && existingSerials.length > 0) {
        return NextResponse.json(
          { 
            error: 'Bu seri numaraları zaten sistemde mevcut',
            existing: existingSerials.map(item => item.serial_number)
          },
          { status: 400 }
        )
      }
    }

    // Toplu ekleme yap
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from('inventory_items')
      .insert(processedItems)
      .select()

    if (insertError) {
      console.error('📊 Toplu ekleme hatası:', insertError)
      return NextResponse.json(
        { error: 'Veritabanına ekleme hatası: ' + insertError.message },
        { status: 500 }
      )
    }

    console.log('📊 Başarıyla eklendi:', insertedData?.length)

    return NextResponse.json({
      success: true,
      message: `${insertedData?.length || 0} öğe başarıyla eklendi`,
      addedCount: insertedData?.length || 0,
      errorCount: errors.length,
      errors: errors.slice(0, 5), // İlk 5 hatayı göster
      data: insertedData
    })

  } catch (error: any) {
    console.error('📊 Excel upload genel hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası: ' + error.message },
      { status: 500 }
    )
  }
}

// GET - Örnek Excel template indirme
export async function GET() {
  try {
    // Örnek Excel template oluştur
    const templateData = [
      {
        'Ürün Adı': 'ZyXEL VMG3312-B10B',
        'Seri Numarası': 'SN2021618H001413DT',
        'Marka': 'ZyXEL',
        'Model': 'VMG3312-B10B',
        'Kategori': 'device',
        'Adet': 1,
        'Konum': 'Ana Depo'
      },
      {
        'Ürün Adı': 'Huawei HG8245H',
        'Seri Numarası': 'SN2021618H001414AB',
        'Marka': 'Huawei', 
        'Model': 'HG8245H',
        'Kategori': 'device',
        'Adet': 1,
        'Konum': 'Ana Depo'
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Envanter')
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="envanter_template.xlsx"'
      }
    })

  } catch (error: any) {
    console.error('Template oluşturma hatası:', error)
    return NextResponse.json(
      { error: 'Template oluşturulamadı' },
      { status: 500 }
    )
  }
}
