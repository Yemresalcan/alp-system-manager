import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import * as XLSX from 'xlsx'

// GET /api/equipment-tracking/export
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const equipmentType = searchParams.get('type')
    const status = searchParams.get('status')
    const technician = searchParams.get('technician')

    // Build query
    let query = supabaseAdmin.from('equipment_tracking').select('*')

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`
      query = query.or(`serial_number.ilike.${searchTerm},assigned_technician_name.ilike.${searchTerm},location.ilike.${searchTerm}`)
    }

    if (equipmentType && equipmentType !== 'all') query = query.eq('equipment_type', equipmentType)
    if (status && status !== 'all') query = query.eq('current_status', status)
    if (technician && technician !== 'all') query = query.eq('assigned_technician_id', technician)

    // Fetch all matching rows (limit to reasonable cap)
    const { data, error } = await query.order('updated_at', { ascending: false }).limit(20000)
    if (error) {
      console.error('Export query error:', error)
      return NextResponse.json({ error: error.message || 'Export query failed' }, { status: 500 })
    }

    const rows = (data || []).map((item: any) => {
      // Try parse notes for excel metadata
      let excelMeta: any = null
      try {
        if (item.notes) {
          const parsed = JSON.parse(item.notes)
          if (parsed && parsed.type === 'excel_import') excelMeta = parsed
        }
      } catch (e) {
        // ignore
      }

      // Map to Turkish headers and exclude internal fields like id and notes
      return {
        'Seri Numarası': item.serial_number || item.modem_serial_number || '',
        'Ekipman Tipi': item.equipment_type || '',
        'Durum': item.current_status || '',
        'Teknisyen': item.assigned_technician_name || '',
        'Konum': item.location || '',
        'Atama Tarihi': item.assigned_at || item.updated_at || item.created_at || '',
        'Stok Durumu': excelMeta?.stock_status || excelMeta?.stok_durumu || '',
        'Depo Hareket Tarihi': excelMeta?.warehouse_movement_date || excelMeta?.depo_hareket_tarihi || ''
      }
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Equipment')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new Response(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="equipment_export_${Date.now()}.xlsx"`
      }
    })

  } catch (e: any) {
    console.error('Export error:', e)
    return NextResponse.json({ error: e?.message || 'Unexpected export error' }, { status: 500 })
  }
}


