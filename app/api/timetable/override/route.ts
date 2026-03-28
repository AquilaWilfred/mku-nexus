import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'
import { UserRole } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const timetable_id = searchParams.get('timetable_id')

    let query = supabaseAdmin
      .from('timetable_overrides')
      .select('*, new_venue:venues!timetable_overrides_new_venue_id_fkey(id, room_number, name, capacity, floor_number, building:buildings(name, has_lift))')
      .order('created_at', { ascending: false })

    if (timetable_id) query = query.eq('timetable_id', timetable_id)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ data, success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch overrides' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any).role as UserRole
    if (role !== 'lecturer') return NextResponse.json({ error: 'Lecturers only' }, { status: 403 })
    const userId = (session.user as any).id

    const body = await req.json()
    const { timetable_id, override_type, override_date, new_venue_id, new_day_of_week, new_start_time, new_end_time, reason, is_cancelled } = body

    if (!timetable_id || !override_type || !reason) {
      return NextResponse.json({ error: 'timetable_id, override_type and reason are required' }, { status: 400 })
    }

    const { data: tEntry } = await supabaseAdmin
      .from('timetable')
      .select('id, unit_id, venue_id, day_of_week, start_time, unit:units(name, code, lecturer_id)')
      .eq('id', timetable_id)
      .single()

    if (!tEntry) return NextResponse.json({ error: 'Timetable entry not found' }, { status: 404 })
    const unit = tEntry.unit as any
    if (unit.lecturer_id !== userId) return NextResponse.json({ error: 'Not your unit' }, { status: 403 })

    // For permanent changes, update timetable directly
    if (override_type === 'permanent') {
      const updates: any = {}
      if (new_venue_id) updates.venue_id = new_venue_id
      if (new_day_of_week) updates.day_of_week = new_day_of_week
      if (new_start_time) updates.start_time = new_start_time
      if (new_end_time) updates.end_time = new_end_time
      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from('timetable').update(updates).eq('id', timetable_id)
      }
    }

    // Fetch venue names BEFORE creating override so we can store rich tags for AI training
    let newVenueName = 'TBA'
    let oldVenueName = 'Original Venue'
    if (new_venue_id) {
      const { data: nv } = await supabaseAdmin.from('venues').select('room_number, name, building:buildings(name)').eq('id', new_venue_id).single()
      if (nv) newVenueName = `${(nv as any).name || (nv as any).room_number}${(nv as any).building ? `, ${(nv as any).building.name}` : ''}`
    }
    if (tEntry.venue_id) {
      const { data: ov2 } = await supabaseAdmin.from('venues').select('room_number, name, building:buildings(name)').eq('id', tEntry.venue_id).single()
      if (ov2) oldVenueName = `${(ov2 as any).name || (ov2 as any).room_number}${(ov2 as any).building ? `, ${(ov2 as any).building.name}` : ''}`
    }

    // Build venue_change_tag for AI context and timetable UI badge
    let venue_change_tag: string | null = null
    if (!is_cancelled && new_venue_id) {
      venue_change_tag = override_type === 'permanent'
        ? `[PERMANENT VENUE CHANGE] ${unit.code} moved from ${oldVenueName} → ${newVenueName}. Reason: ${reason}`
        : `[TEMPORARY VENUE CHANGE on ${override_date}] ${unit.code}: ${oldVenueName} → ${newVenueName}. Reason: ${reason}`
    } else if (is_cancelled) {
      venue_change_tag = `[CLASS CANCELLED${override_date ? ' on ' + override_date : ''}] ${unit.code} (${unit.name}). Reason: ${reason}`
    }

    // Create override record
    const { data: override, error } = await supabaseAdmin
      .from('timetable_overrides')
      .insert({
        timetable_id, override_type,
        override_date: override_date || null,
        new_venue_id: new_venue_id || null,
        new_day_of_week: new_day_of_week || null,
        new_start_time: new_start_time || null,
        new_end_time: new_end_time || null,
        reason, is_cancelled: is_cancelled || false,
        created_by: userId,
        venue_change_tag: venue_change_tag || null,
        old_venue_name: oldVenueName,
        new_venue_name: newVenueName,
      })
      .select()
      .single()

    if (error) throw error

    // Notify enrolled students + create an event so AI knows about it
    const { data: enrollments } = await supabaseAdmin
      .from('enrollments').select('student_id').eq('unit_id', tEntry.unit_id).eq('status', 'active')

    const notifType = is_cancelled ? 'urgent' : override_type === 'permanent' ? 'warning' : 'info'
    let title: string, message: string

    if (is_cancelled) {
      title = `⚠️ Class Cancelled — ${unit.code}`
      message = `Your ${unit.code} (${unit.name}) class on ${override_date || 'the scheduled date'} has been CANCELLED. Reason: ${reason}`
    } else if (override_type === 'temporary') {
      title = `📍 Temporary Venue Change — ${unit.code}`
      message = `Your ${unit.code} class on ${override_date} has moved to ${newVenueName}. Reason: ${reason}`
    } else {
      title = `🔄 Permanent Venue Change — ${unit.code}`
      message = `Your ${unit.code} (${unit.name}) has permanently moved to ${newVenueName}. Reason: ${reason}`
    }

    if (enrollments && enrollments.length > 0) {
      const notifications = enrollments.map((e: any) => ({
        user_id: e.student_id, title, message, type: notifType, link: '/student/timetable',
      }))
      await supabaseAdmin.from('notifications').insert(notifications)
    }

    // Also notify admins for awareness
    const { data: admins } = await supabaseAdmin.from('users').select('id').eq('role', 'admin').eq('is_active', true)
    if (admins?.length) {
      await supabaseAdmin.from('notifications').insert(admins.map((a: any) => ({
        user_id: a.id, title: `[Lecturer Action] ${title}`,
        message: `${message} (${enrollments?.length || 0} students notified)`,
        type: 'info', link: '/admin/timetable',
      })))
    }

    // Create a system event so the AI assistant's context is automatically updated
    const eventType = is_cancelled ? 'cancellation' : 'venue_change'
    await supabaseAdmin.from('events').insert({
      title,
      description: message,
      event_type: eventType,
      created_by: userId,
      unit_id: tEntry.unit_id,
      venue_id: new_venue_id || tEntry.venue_id || null,
      start_datetime: override_date ? new Date(override_date).toISOString() : new Date().toISOString(),
      is_urgent: is_cancelled,
      target_role: 'student',
      is_published: true,
    })

    return NextResponse.json({ data: override, success: true })
  } catch (e: any) {
    console.error('Override POST error:', e)
    return NextResponse.json({ error: 'Failed to create override' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const { error } = await supabaseAdmin.from('timetable_overrides').delete().eq('id', id).eq('created_by', userId)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete override' }, { status: 500 })
  }
}
