import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { EquipmentType } from '@/lib/supabase'

// GET /api/equipment-tracking - List equipment with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const equipmentType = searchParams.get('type') as EquipmentType | null
    const status = searchParams.get('status')
    const technician = searchParams.get('technician')
    const statsOnly = searchParams.get('stats_only') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log('🔍 Equipment tracking request:', {
      search, equipmentType, status, technician, statsOnly, limit, offset
    })

    // Base query
    let query = supabaseAdmin
      .from('equipment_tracking')
      .select('*')

    // Apply filters
    if (search && search.trim()) {
      // Search in serial number, technician name, or location
      const searchTerm = `%${search.trim()}%`
      query = query.or(`serial_number.ilike.${searchTerm},assigned_technician_name.ilike.${searchTerm},location.ilike.${searchTerm}`)
    }

    if (equipmentType && equipmentType !== 'all') {
      query = query.eq('equipment_type', equipmentType)
    }

    if (status && status !== 'all') {
      query = query.eq('current_status', status)
    }

    if (technician && technician !== 'all') {
      query = query.eq('assigned_technician_id', technician)
    }

    // Get statistics
    const { data: statsData, error: statsError } = await supabaseAdmin
      .from('equipment_tracking')
      .select('equipment_type, current_status')

    if (statsError) {
      console.error('❌ Stats query error:', statsError)
      throw statsError
    }

    // Calculate statistics by equipment type and status
    const statistics = statsData.reduce((acc, item) => {
      const type = item.equipment_type || 'modem'
      const status = item.current_status || 'available'
      
      if (!acc[type]) {
        acc[type] = { available: 0, in_use: 0, maintenance: 0, damaged: 0, total: 0 }
      }
      
      acc[type][status] = (acc[type][status] || 0) + 1
      acc[type].total += 1
      
      return acc
    }, {} as Record<string, Record<string, number>>)

    // Add overall statistics
    const overall = Object.values(statistics).reduce((acc, typeStats) => {
      Object.keys(typeStats).forEach(key => {
        acc[key] = (acc[key] || 0) + typeStats[key]
      })
      return acc
    }, {} as Record<string, number>)

    statistics.overall = overall

    console.log('📊 Calculated statistics:', statistics)

    // If only stats requested
    if (statsOnly) {
      return NextResponse.json({
        success: true,
        statistics
      })
    }

    // Get total count for pagination
    const { count, error: countError } = await supabaseAdmin
      .from('equipment_tracking')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ Count query error:', countError)
      throw countError
    }

    // Get paginated results with custom sorting
    // Priority: in_use first, then assigned, then available, then others
    let data: any[] = []
    let queryError: any = null

    try {
      const result = await supabaseAdmin.rpc('get_sorted_equipment', {
        search_term: search?.trim() || null,
        equipment_type_filter: equipmentType !== 'all' ? equipmentType : null,
        status_filter: status !== 'all' ? status : null,
        technician_filter: technician !== 'all' ? technician : null,
        limit_count: limit,
        offset_count: offset
      })

      if (result.error) {
        throw result.error
      }

      data = result.data || []
      console.log('✅ Using RPC function for sorting')

    } catch (rpcError) {
      console.warn('⚠️ RPC function not available, using fallback sorting:', rpcError)
      
      // Fallback: Use client-side sorting
      const fallbackQuery = supabaseAdmin
        .from('equipment_tracking')
        .select('*')
      
      // Apply same filters
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`
        fallbackQuery.or(`serial_number.ilike.${searchTerm},assigned_technician_name.ilike.${searchTerm},location.ilike.${searchTerm}`)
      }
      if (equipmentType && equipmentType !== 'all') fallbackQuery.eq('equipment_type', equipmentType)
      if (status && status !== 'all') fallbackQuery.eq('current_status', status)  
      if (technician && technician !== 'all') fallbackQuery.eq('assigned_technician_id', technician)

      const { data: fallbackData, error: fallbackError } = await fallbackQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (fallbackError) {
        queryError = fallbackError
        throw fallbackError
      }

      // Client-side sorting: in_use first, then assigned, then available, then others
      const sortedData = (fallbackData || []).sort((a, b) => {
        const statusPriority = { 'in_use': 1, 'assigned': 2, 'available': 3 }
        const aPriority = statusPriority[a.current_status] || 4
        const bPriority = statusPriority[b.current_status] || 4
        
        if (aPriority !== bPriority) return aPriority - bPriority
        
        // Same status, sort by date
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      data = sortedData
      console.log('✅ Using fallback client-side sorting')
    }

    if (queryError) {
      console.error('❌ Equipment tracking query error:', queryError)
      throw queryError
    }

    console.log(`✅ Found ${data.length} equipment items (${count} total)`)

    return NextResponse.json({
      success: true,
      equipment: data,
      total: count || 0,
      statistics,
      filters: {
        search,
        equipment_type: equipmentType,
        status,
        technician,
        limit,
        offset
      }
    })

  } catch (error: any) {
    console.error('❌ Equipment tracking error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Ekipman listesi yüklenemedi'
    }, { status: 500 })
  }
}

// POST /api/equipment-tracking - Add new equipment  
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      equipment_type,
      serial_number,
      document_number,
      company,
      stock_name,
      purchase_date,
      warranty_end_date,
      location,
      notes
    } = body

    console.log('🔧 Adding new equipment:', { equipment_type, serial_number })

    // Validate required fields
    if (!equipment_type || !serial_number) {
      return NextResponse.json({
        success: false,
        error: 'Ekipman tipi ve seri numarası gerekli'
      }, { status: 400 })
    }

    // Check if equipment already exists
    const { data: existing } = await supabaseAdmin
      .from('equipment_tracking')
      .select('id')
      .eq('serial_number', serial_number)
      .single()

    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'Bu seri numarası zaten mevcut'
      }, { status: 409 })
    }

    // Insert new equipment
    const { data, error } = await supabaseAdmin
      .from('equipment_tracking')
      .insert({
        equipment_type,
        serial_number,
        document_number,
        company,
        stock_name,
        purchase_date,
        warranty_end_date,
        location,
        notes,
        current_status: 'available',
        created_by: 'system' // TODO: Get from auth
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Equipment insert error:', error)
      throw error
    }

    console.log('✅ Equipment added:', data.id)

    return NextResponse.json({
      success: true,
      equipment: data,
      message: 'Ekipman başarıyla eklendi'
    })

  } catch (error: any) {
    console.error('❌ Equipment add error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Ekipman eklenemedi'
    }, { status: 500 })
  }
}
