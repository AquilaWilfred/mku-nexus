import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as any).role
    const userId = (session.user as any).id

    let query = supabaseAdmin
      .from('venue_requests')
      .select(`*,
        lecturer:users!venue_requests_lecturer_id_fkey(full_name, email),
        unit:units(code, name),
        venue:venues(room_number, name, capacity, floor_number, building:buildings(name, code, has_lift))
      `)
      .order('created_at', { ascending: false })

    if (role === 'lecturer') {
      query = query.eq('lecturer_id', userId)
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ data, success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch venue requests' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as any).role
    if (role !== 'lecturer') return NextResponse.json({ error: 'Only lecturers can request venues' }, { status: 403 })

    const userId = (session.user as any).id
    const body = await req.json()
    const { venue_id, unit_id, day_of_week, start_time, end_time, session_type, semester, year, notes } = body

    if (!venue_id || !unit_id || !day_of_week || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check for venue conflicts at the same time slot
    const { data: conflicts } = await supabaseAdmin
      .from('timetable')
      .select('id, unit:units(code, name)')
      .eq('venue_id', venue_id)
      .eq('day_of_week', day_of_week)
      .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`)

    if (conflicts && conflicts.length > 0) {
      const conflictUnit = (conflicts[0] as any).unit
      return NextResponse.json({
        error: `This venue is already occupied on ${day_of_week} during that time slot by ${conflictUnit?.code || 'another class'}. Please choose a different venue or time.`
      }, { status: 409 })
    }

    // Also check pending/approved venue requests at same slot
    const { data: requestConflicts } = await supabaseAdmin
      .from('venue_requests')
      .select('id, unit:units(code, name)')
      .eq('venue_id', venue_id)
      .eq('day_of_week', day_of_week)
      .in('status', ['pending', 'approved'])
      .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`)

    if (requestConflicts && requestConflicts.length > 0) {
      const conflictUnit = (requestConflicts[0] as any).unit
      return NextResponse.json({
        error: `There is already a pending or approved request for this venue at that time (${conflictUnit?.code || 'another unit'}). Please choose a different slot.`
      }, { status: 409 })
    }

    const { data, error } = await supabaseAdmin
      .from('venue_requests')
      .insert({
        lecturer_id: userId,
        venue_id,
        unit_id,
        day_of_week,
        start_time,
        end_time,
        session_type: session_type || 'lecture',
        semester: semester || 'Semester 1',
        year: year || new Date().getFullYear(),
        notes,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    // Notify admins
    const { data: admins } = await supabaseAdmin.from('users').select('id').eq('role', 'admin').eq('is_active', true)
    if (admins?.length) {
      await supabaseAdmin.from('notifications').insert(
        admins.map((a: any) => ({
          user_id: a.id,
          title: 'New Venue Request',
          message: `A lecturer has requested a venue. Please review and approve/reject.`,
          type: 'info',
          link: '/admin/venues',
        }))
      )
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    console.error('Venue request POST error:', error)
    return NextResponse.json({ error: 'Failed to submit venue request' }, { status: 500 })
  }
}
