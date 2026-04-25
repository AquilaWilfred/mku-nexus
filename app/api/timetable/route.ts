import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import { UserRole } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as any).id
    const role = (session.user as any).role as string
    const { searchParams } = new URL(req.url)
    const full = searchParams.get('full') === 'true'  // ?full=true bypasses lecturer filter

    let query = supabaseAdmin
      .from('timetable')
      .select('*, unit:units(id, code, name, lecturer_id, lecturer:users!units_lecturer_id_fkey(id, full_name)), venue:venues(id, room_number, name, floor_number, building:buildings(name, code, has_lift))')
      .order('day_of_week')
      .order('start_time')

    // Lecturers only see their own units UNLESS full=true (browsing full timetable)
    if (role === 'lecturer' && !full) {
      // Get this lecturer's unit IDs first
      const { data: lecturerUnits } = await supabaseAdmin
        .from('units')
        .select('id')
        .eq('lecturer_id', userId)
        .eq('is_active', true)

      const unitIds = lecturerUnits?.map((u: any) => u.id) || []
      if (unitIds.length === 0) {
        return NextResponse.json({ data: [], success: true })
      }
      query = query.in('unit_id', unitIds)
    }

    // Students see timetable for enrolled units only (unless full=true)
    if (role === 'student' && !full) {
      const { data: enrollments } = await supabaseAdmin
        .from('enrollments')
        .select('unit_id')
        .eq('student_id', userId)
        .eq('status', 'active')

      const unitIds = enrollments?.map((e: any) => e.unit_id) || []
      if (unitIds.length === 0) {
        return NextResponse.json({ data: [], success: true })
      }
      query = query.in('unit_id', unitIds)
    }

    const { data, error } = await query
    if (error) throw error

    // Fetch active overrides and annotate entries
    const entryIds = (data || []).map((e: any) => e.id)
    let overrides: any[] = []
    if (entryIds.length > 0) {
      const { data: ov } = await supabaseAdmin
        .from('timetable_overrides')
        .select('*, new_venue:venues!timetable_overrides_new_venue_id_fkey(id, room_number, name, building:buildings(name, code))')
        .in('timetable_id', entryIds)
        .order('created_at', { ascending: false })
      overrides = ov || []
    }

    const annotated = (data || []).map((entry: any) => {
      const entryOverrides = overrides.filter((o: any) => o.timetable_id === entry.id)
      const latestOverride = entryOverrides[0] || null
      const venueChangeTag = latestOverride?.venue_change_tag || null

      return {
        ...entry,
        latest_override: latestOverride,
        venue_change_tag: venueChangeTag,
        has_active_override: !!latestOverride,
      }
    })

    return NextResponse.json({ data: annotated, success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as unknown as { role: UserRole }).role
    if (!['admin', 'schedule_manager'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { data, error } = await supabaseAdmin
      .from('timetable')
      .insert({
        unit_id: body.unit_id,
        venue_id: body.venue_id,
        day_of_week: body.day_of_week,
        start_time: body.start_time,
        end_time: body.end_time,
        session_type: body.session_type || 'lecture',
        semester: body.semester || 'Semester 1',
        year: body.year || new Date().getFullYear(),
        is_recurring: true,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create timetable entry' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any).role
    if (!['admin', 'schedule_manager'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const body = await req.json()
    const { error } = await supabaseAdmin
      .from('timetable').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as unknown as { role: UserRole }).role
    if (!['admin', 'schedule_manager'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const { error } = await supabaseAdmin.from('timetable').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}
