import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    console.log('📋 Modem Tracking Excel Upload: Dosya yükleniyor...', { 
      fileName: file?.name, 
      fileSize: file?.size,
      userId 
    })

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'Excel dosyası ve kullanıcı ID gerekli' },
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
    console.log('📋 Excel parse edildi, satır sayısı:', jsonData.length)

    if (jsonData.length === 0) {
      return NextResponse.json(
        { error: 'Excel dosyasında veri bulunamadı' },
        { status: 400 }
      )
    }

    // Excel kolonları -> DB kolonları mapping (resimdeki formata göre)
    const processedModems = []
    const errors = []

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any
      const rowIndex = i + 2 // Excel satır numarası (başlık satırından sonra)

      try {
        // Resimdeki kolonları normalize et
        const serialNumber = 
          row['Modem Seri Numarası'] || row['Seri Numarası'] || 
          row['Serial Number'] || row['seri_no'] || row['serial'] || ''
          
        const documentNumber = 
          row['Belge Numarası'] || row['Document Number'] || 
          row['belge_no'] || row['document'] || ''
          
        const company = 
          row['Firma'] || row['Company'] || row['firma'] || ''
          
        const stockName = 
          row['Stok Adı'] || row['Stock Name'] || row['stok_adi'] || ''
          
        const stockStatus = 
          row['Stok Durumu'] || row['Stock Status'] || row['stok_durumu'] || ''
          
        const warehouseDate = row['Depo Hareket Tarihi'] || row['Warehouse Date'] || 
          row['hareket_tarihi'] || row['date'] || ''

        // Zorunlu alan kontrolü
        if (!serialNumber.toString().trim()) {
          errors.push(`Satır ${rowIndex}: Modem seri numarası boş olamaz`)
          continue
        }

        // Tarih formatını normalize et
        let normalizedDate = null
        if (warehouseDate) {
          try {
            // Excel tarihini JavaScript Date'e çevir
            if (typeof warehouseDate === 'number') {
              // Excel serial date number
              const excelDate = new Date((warehouseDate - 25569) * 86400 * 1000)
              normalizedDate = excelDate.toISOString().split('T')[0]
            } else if (typeof warehouseDate === 'string') {
              // String tarih formatı
              const parsedDate = new Date(warehouseDate)
              if (!isNaN(parsedDate.getTime())) {
                normalizedDate = parsedDate.toISOString().split('T')[0]
              }
            }
          } catch (dateError) {
            console.warn(`Satır ${rowIndex}: Tarih parse hatası:`, dateError)
          }
        }

        processedModems.push({
          modem_serial_number: serialNumber.toString().trim(),
          document_number: documentNumber?.toString().trim() || null,
          company: company?.toString().trim() || null,
          stock_name: stockName?.toString().trim() || null,
          stock_status: stockStatus?.toString().trim() || null,
          warehouse_movement_date: normalizedDate,
          current_status: 'available', // Varsayılan olarak müsait
          created_by: userId
        })

      } catch (error) {
        console.error(`Satır ${rowIndex} işlenirken hata:`, error)
        errors.push(`Satır ${rowIndex}: İşleme hatası - ${error}`)
      }
    }

    console.log('📋 İşlenen modem sayısı:', processedModems.length)
    console.log('📋 Hata sayısı:', errors.length)

    if (processedModems.length === 0) {
      return NextResponse.json(
        { 
          error: 'İşlenebilir modem verisi bulunamadı',
          details: errors.slice(0, 10) // İlk 10 hatayı göster
        },
        { status: 400 }
      )
    }

    // Seri numarası duplikasyon kontrolü (hem kendi içinde hem DB'de)
    const serialNumbers = new Set()
    const duplicateSerials = []
    
    for (const modem of processedModems) {
      if (serialNumbers.has(modem.modem_serial_number)) {
        duplicateSerials.push(modem.modem_serial_number)
      } else {
        serialNumbers.add(modem.modem_serial_number)
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
    const { data: existingModems } = await supabaseAdmin
      .from('modem_tracking')
      .select('modem_serial_number')
      .in('modem_serial_number', Array.from(serialNumbers))

    const existingSerials = existingModems?.map(m => m.modem_serial_number) || []
    
    // Sadece yeni (mevcut olmayan) modemleri filtrele
    const newModems = processedModems.filter(modem => 
      !existingSerials.includes(modem.modem_serial_number)
    )
    
    const existingCount = processedModems.length - newModems.length

    console.log('📋 Toplam işlenen:', processedModems.length)
    console.log('📋 Zaten mevcut:', existingCount) 
    console.log('📋 Yeni eklenecek:', newModems.length)

    let insertedData = []
    let insertError = null

    // Eğer yeni modem varsa ekle
    if (newModems.length > 0) {
      const result = await supabaseAdmin
        .from('modem_tracking')
        .insert(newModems)
        .select()

      insertedData = result.data || []
      insertError = result.error

      if (insertError) {
        console.error('📋 Modem toplu ekleme hatası:', insertError)
        return NextResponse.json(
          { error: 'Veritabanına ekleme hatası: ' + insertError.message },
          { status: 500 }
        )
      }
    }

    console.log('📋 Yeni modem eklendi:', insertedData?.length)

    // Başarı mesajını oluştur
    let message = ''
    if (insertedData.length > 0 && existingCount > 0) {
      message = `${insertedData.length} yeni modem eklendi, ${existingCount} modem zaten sistemdeydi`
    } else if (insertedData.length > 0) {
      message = `${insertedData.length} modem başarıyla sisteme eklendi`  
    } else if (existingCount > 0) {
      message = `${existingCount} modem zaten sistemde mevcut, yeni kayıt eklenmedi`
    } else {
      message = 'İşlenebilir kayıt bulunamadı'
    }

    return NextResponse.json({
      success: true,
      message,
      addedCount: insertedData?.length || 0,
      existingCount,
      errorCount: errors.length,
      errors: errors.slice(0, 5), // İlk 5 hatayı göster
      existing: existingSerials.slice(0, 10), // İlk 10 mevcut kaydı göster
      data: insertedData
    })

  } catch (error: any) {
    console.error('📋 Modem Excel upload genel hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası: ' + error.message },
      { status: 500 }
    )
  }
}

// GET - Örnek Excel template indirme
export async function GET() {
  try {
    // Resimdeki formata göre template oluştur
    const templateData = [
      {
        'Modem Seri Numarası': '23*******8521',
        'Belge Numarası': 'IRS-2025058743',
        'Firma': 'ALP SİSTEM VE BİLİŞİM TEKNOLOJİLERİ LİMİTED ŞİRKETİ',
        'Stok Adı': 'Türksat - CT902/FTTH OPTİK BÖLÜCÜ',
        'Stok Durumu': 'Sağlam Stok Çıkışı Yapıldı',
        'Depo Hareket Tarihi': '2025-08-18'
      },
      {
        'Modem Seri Numarası': '23*******7891',
        'Belge Numarası': 'IRS-2025058743',
        'Firma': 'ALP SİSTEM VE BİLİŞİM TEKNOLOJİLERİ LİMİTED ŞİRKETİ',
        'Stok Adı': 'Türksat - CT902/FTTH OPTİK BÖLÜCÜ', 
        'Stok Durumu': 'Sağlam Stok Çıkışı Yapıldı',
        'Depo Hareket Tarihi': '2025-08-18'
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modem Listesi')
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="modem_tracking_template.xlsx"'
      }
    })

  } catch (error: any) {
    console.error('Modem template oluşturma hatası:', error)
    return NextResponse.json(
      { error: 'Template oluşturulamadı' },
      { status: 500 }
    )
  }
}
