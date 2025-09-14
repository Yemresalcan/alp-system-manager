import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { detectEquipmentType, EQUIPMENT_TYPES } from '@/lib/supabase'

// POST /api/equipment-tracking/excel-upload - Upload equipment from Excel file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'Excel dosyası gerekli'
      }, { status: 400 })
    }

    console.log('📁 Processing Excel file:', file.name, 'Size:', file.size)

    // Read Excel file with error handling
    let arrayBuffer: ArrayBuffer
    try {
      // Check if file is actually a File object
      if (!file || typeof file.arrayBuffer !== 'function') {
        throw new Error('Invalid file object')
      }
      
      arrayBuffer = await file.arrayBuffer()
      console.log('📁 ArrayBuffer size:', arrayBuffer.byteLength)
    } catch (bufferError) {
      console.error('❌ ArrayBuffer error:', bufferError)
      return NextResponse.json({
        success: false,
        error: 'Dosya okunamadı: ' + bufferError.message
      }, { status: 400 })
    }
    
    let workbook: any
    try {
      workbook = XLSX.read(arrayBuffer, { type: 'buffer' })
    } catch (xlsxError) {
      console.error('❌ XLSX parse error:', xlsxError)
      return NextResponse.json({
        success: false,
        error: 'Excel dosyası parse edilemedi: ' + xlsxError.message
      }, { status: 400 })
    }
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    console.log('📊 Excel data rows:', jsonData.length)

    if (jsonData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Excel dosyası boş veya geçersiz format'
      }, { status: 400 })
    }

    // Process equipment data
    const processedEquipment: any[] = []
    const errors: string[] = []
    const duplicateSerials = new Set<string>()

    jsonData.forEach((row: any, index: number) => {
      try {
        // Normalize column names (handle Turkish characters and spaces)
        const normalizedRow: any = {}
        Object.keys(row).forEach(key => {
          const normalizedKey = key
            .toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/\s+/g, '_')
            .trim()
          normalizedRow[normalizedKey] = row[key]
        })

        // Extract serial number (try different column names)
        const serialNumber = (
          normalizedRow.seri_numarasi ||
          normalizedRow.serial_number ||
          normalizedRow.modem_seri_numarasi ||
          normalizedRow.seri_no ||
          normalizedRow.serial ||
          normalizedRow.sn ||
          ''
        )?.toString().trim()

        if (!serialNumber) {
          errors.push(`Satır ${index + 2}: Seri numarası bulunamadı`)
          return
        }

        // Check for duplicates within the file
        if (duplicateSerials.has(serialNumber)) {
          errors.push(`Satır ${index + 2}: Seri numarası "${serialNumber}" dosyada tekrar ediyor`)
          return
        }
        duplicateSerials.add(serialNumber)

        // Auto-detect equipment type
        const equipmentType = detectEquipmentType(serialNumber)
        const equipmentInfo = EQUIPMENT_TYPES[equipmentType]

        // Extract data matching equipment_tracking table schema
        const equipment = {
          equipment_type: equipmentType,
          serial_number: serialNumber,
          current_status: 'available',
          // Store Excel data as structured JSON in notes field
          notes: JSON.stringify({
            type: 'excel_import',
            label: `${equipmentInfo.icon} ${equipmentInfo.label}`,
            belge_numarasi: normalizedRow.belge_numarasi || normalizedRow.document_number || null,
            firma: normalizedRow.firma || normalizedRow.company || null,
            stok_adi: normalizedRow.stok_adi || normalizedRow.stock_name || null,
            stok_durumu: normalizedRow.stok_durumu || normalizedRow.stock_status || null,
            depo_hareket_tarihi: normalizedRow.depo_hareket_tarihi || normalizedRow.warehouse_movement_date || null,
            import_date: new Date().toISOString().split('T')[0]
          })
        }

        // Equipment ready for database insert

        processedEquipment.push(equipment)
        console.log(`📋 Processed equipment ${index + 1}:`, equipmentType, serialNumber)

      } catch (error) {
        console.error(`❌ Error processing row ${index + 2}:`, error)
        errors.push(`Satır ${index + 2}: ${error}`)
      }
    })

    console.log('✅ Processed equipment count:', processedEquipment.length)
    console.log('⚠️ Errors count:', errors.length)

    if (processedEquipment.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Geçerli ekipman verisi bulunamadı',
        errors
      }, { status: 400 })
    }

    // Check for existing equipment in database
    const serialNumbers = processedEquipment.map(e => e.serial_number)
    const { data: existingEquipment } = await supabaseAdmin
      .from('equipment_tracking')
      .select('serial_number')
      .in('serial_number', serialNumbers)

    const existingSerials = existingEquipment?.map(e => e.serial_number) || []
    const newEquipment = processedEquipment.filter(equipment => 
      !existingSerials.includes(equipment.serial_number)
    )
    const existingCount = processedEquipment.length - newEquipment.length

    console.log('📊 Equipment summary:', {
      total: processedEquipment.length,
      new: newEquipment.length,
      existing: existingCount
    })

    // Insert new equipment
    let insertedData: any[] = []
    if (newEquipment.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('equipment_tracking')
        .insert(newEquipment)
        .select()

      if (error) {
        console.error('❌ Equipment insert error:', error)
        throw error
      }

      insertedData = data || []
    }

    // Calculate statistics by equipment type
    const typeStats = insertedData.reduce((acc, equipment) => {
      const type = equipment.equipment_type
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('✅ Equipment upload completed:', {
      added: insertedData.length,
      existing: existingCount,
      errors: errors.length,
      types: typeStats
    })

    return NextResponse.json({
      success: true,
      message: `${insertedData.length} ekipman başarıyla yüklendi`,
      summary: {
        addedCount: insertedData.length,
        existingCount,
        errorCount: errors.length,
        typeStats,
        addedEquipment: insertedData,
        existing: existingSerials,
        errors: errors.slice(0, 10) // Show first 10 errors
      }
    })

  } catch (error: any) {
    console.error('❌ Equipment Excel upload error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Excel yükleme başarısız',
      suggestion: 'Excel dosyasının formatını kontrol edin'
    }, { status: 500 })
  }
}

// GET /api/equipment-tracking/excel-upload - Download equipment template
export async function GET() {
  try {
    // Create sample data for template
    const sampleData = [
      {
        'Seri Numarası': '2150087046HYPC001234',
        'Belge Numarası': 'DOC001',
        'Firma': 'ALP Sistem',
        'Stok Adı': 'Modem',
        'Stok Durumu': 'Aktif',
        'Depo Hareket Tarihi': '2024-01-15'
      },
      {
        'Seri Numarası': 'HR1234567890',
        'Belge Numarası': 'DOC002', 
        'Firma': 'ALP Sistem',
        'Stok Adı': 'STB HR',
        'Stok Durumu': 'Aktif',
        'Depo Hareket Tarihi': '2024-01-15'
      },
      {
        'Seri Numarası': 'NT0987654321',
        'Belge Numarası': 'DOC003',
        'Firma': 'ALP Sistem', 
        'Stok Adı': 'STB NT',
        'Stok Durumu': 'Aktif',
        'Depo Hareket Tarihi': '2024-01-15'
      },
      {
        'Seri Numarası': 'TV5555666677',
        'Belge Numarası': 'DOC004',
        'Firma': 'ALP Sistem',
        'Stok Adı': 'TV',
        'Stok Durumu': 'Aktif',
        'Depo Hareket Tarihi': '2024-01-15'
      },
      {
        'Seri Numarası': 'RF_REMOTE_8888',
        'Belge Numarası': 'DOC005',
        'Firma': 'ALP Sistem',
        'Stok Adı': 'RF Kumanda',
        'Stok Durumu': 'Aktif',
        'Depo Hareket Tarihi': '2024-01-15'
      },
      {
        'Seri Numarası': 'SAT_CARD_9999',
        'Belge Numarası': 'DOC006',
        'Firma': 'ALP Sistem',
        'Stok Adı': 'Uydu Kartı',
        'Stok Durumu': 'Aktif',
        'Depo Hareket Tarihi': '2024-01-15'
      }
    ]

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(sampleData)
    
    // Auto-size columns
    const columnWidths = [
      { wch: 20 }, // Seri Numarası
      { wch: 15 }, // Belge Numarası
      { wch: 15 }, // Firma
      { wch: 15 }, // Stok Adı
      { wch: 15 }, // Stok Durumu
      { wch: 18 }  // Depo Hareket Tarihi
    ]
    worksheet['!cols'] = columnWidths

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ekipman Listesi')

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'buffer' 
    })

    // Return Excel file
    return new Response(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="ekipman_sablonu.xlsx"'
      }
    })

  } catch (error: any) {
    console.error('❌ Template download error:', error)
    return NextResponse.json({
      success: false,
      error: 'Şablon indirilemedi'
    }, { status: 500 })
  }
}
