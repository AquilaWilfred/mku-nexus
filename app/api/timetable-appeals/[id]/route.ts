import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any).role
    const managerId = (session.user as any).id

    if (!['schedule_manager', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = params
    const { status, manager_notes, apply_venue_change } = await req.json()

    if (!['under_review', 'approved', 'rejected', 'escalated'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data: appeal } = await supabaseAdmin
      .from('timetable_appeals')
      .select('*, unit:units!timetable_appeals_unit_id_fkey(name, code)')
      .eq('id', id)
      .single()

    if (!appeal) return NextResponse.json({ error: 'Appeal not found' }, { status: 404 })

    await supabaseAdmin.from('timetable_appeals').update({
      status,
      manager_notes: manager_notes || null,
      reviewed_by: managerId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    // If approved and venue change requested, apply it
    if (status === 'approved' && apply_venue_change && appeal.requested_venue_id && appeal.timetable_id) {
      await supabaseAdmin.from('timetable').update({
        venue_id: appeal.requested_venue_id,
        updated_at: new Date().toISOString(),
      }).eq('id', appeal.timetable_id)
    }

    // Notify the submitter
    const unit = appeal.unit as any
    await supabaseAdmin.from('notifications').insert({
      user_id: appeal.submitted_by,
      title: status === 'approved'
        ? `✅ Appeal Approved — ${unit?.code || ''}`
        : status === 'rejected'
        ? `❌ Appeal Rejected — ${unit?.code || ''}`
        : status === 'escalated'
        ? `⬆️ Appeal Escalated — ${unit?.code || ''}`
        : `🔄 Appeal Under Review — ${unit?.code || ''}`,
      message: manager_notes || `Your ${appeal.appeal_type} appeal has been ${status}.`,
      type: status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info',
      link: appeal.submitter_role === 'student' ? '/student/timetable' : '/lecturer/timetable',
      action_type: 'appeal',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update appeal' }, { status: 500 })
  }
}
