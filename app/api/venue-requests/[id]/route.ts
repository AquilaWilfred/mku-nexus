import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as any).role
    if (role !== 'admin') return NextResponse.json({ error: 'Only admins can approve venue requests' }, { status: 403 })

    const { status, admin_notes } = await req.json()
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Get the request
    const { data: request, error: fetchErr } = await supabaseAdmin
      .from('venue_requests')
      .select('*, unit:units(code, name), venue:venues(room_number, name), lecturer:users!venue_requests_lecturer_id_fkey(id, full_name)')
      .eq('id', params.id)
      .single()

    if (fetchErr || !request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    // If approving, check for conflicts again before finalising
    if (status === 'approved') {
      const { data: conflicts } = await supabaseAdmin
        .from('timetable')
        .select('id')
        .eq('venue_id', request.venue_id)
        .eq('day_of_week', request.day_of_week)
        .or(`and(start_time.lt.${request.end_time},end_time.gt.${request.start_time})`)

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json({ error: 'Cannot approve: venue now has a conflicting timetable entry. Please reject and ask lecturer to resubmit.' }, { status: 409 })
      }

      // Add to timetable
      const { error: ttErr } = await supabaseAdmin.from('timetable').insert({
        unit_id: request.unit_id,
        venue_id: request.venue_id,
        day_of_week: request.day_of_week,
        start_time: request.start_time,
        end_time: request.end_time,
        session_type: request.session_type,
        semester: request.semester,
        year: request.year,
        is_recurring: true,
      })

      if (ttErr) {
        console.error('Timetable insert error on venue approval:', ttErr)
        return NextResponse.json({ error: 'Failed to add to timetable' }, { status: 500 })
      }
    }

    // Update request status
    const { error } = await supabaseAdmin
      .from('venue_requests')
      .update({ status, admin_notes, reviewed_at: new Date().toISOString() })
      .eq('id', params.id)

    if (error) throw error

    // Notify lecturer
    await supabaseAdmin.from('notifications').insert({
      user_id: (request.lecturer as any).id,
      title: `Venue Request ${status === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
      message: status === 'approved'
        ? `Your venue request for ${(request.unit as any)?.code} at ${(request.venue as any)?.room_number} on ${request.day_of_week} has been approved and added to the timetable.`
        : `Your venue request was rejected. ${admin_notes || ''}`,
      type: status === 'approved' ? 'success' : 'warning',
      link: '/lecturer/venues',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Venue request PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update venue request' }, { status: 500 })
  }
}
