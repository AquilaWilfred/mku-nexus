import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import { Resend } from 'resend'

let resend: Resend | null = null
function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id
    const role = (session.user as any).role

    let query = supabaseAdmin
      .from('timetable_appeals')
      .select(`
        *,
        submitter:users!timetable_appeals_submitted_by_fkey(id, full_name, email, role, student_id, staff_id),
        unit:units!timetable_appeals_unit_id_fkey(id, code, name),
        current_venue:venues!timetable_appeals_current_venue_id_fkey(id, room_number, name, building:buildings(name)),
        requested_venue:venues!timetable_appeals_requested_venue_id_fkey(id, room_number, name, building:buildings(name))
      `)
      .order('created_at', { ascending: false })

    // Students see their own
    if (role === 'student') {
      query = query.eq('submitted_by', userId)
    } else if (role === 'lecturer') {
      // Lecturers see appeals for units they teach OR appeals they submitted themselves
      const { data: myUnits } = await supabaseAdmin.from('units').select('id').eq('lecturer_id', userId)
      const myUnitIds = (myUnits || []).map(u => u.id)
      if (myUnitIds.length > 0) {
        query = query.or(`submitted_by.eq.${userId},unit_id.in.(${myUnitIds.join(',')})`)
      } else {
        query = query.eq('submitted_by', userId)
      }
    }
    // Admin/schedule_manager see all

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ data: data || [], success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch appeals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id
    const role = (session.user as any).role
    const isActive = (session.user as any).is_active

    if (!isActive) return NextResponse.json({ error: 'Account deactivated.' }, { status: 403 })

    if (!['student', 'lecturer'].includes(role)) {
      return NextResponse.json({ error: 'Only students and lecturers can submit appeals' }, { status: 403 })
    }

    const body = await req.json()
    const { timetable_id, unit_id, appeal_type, current_venue_id, requested_venue_id, description, supporting_docs } = body

    if (!unit_id || !appeal_type || !description) {
      return NextResponse.json({ error: 'unit_id, appeal_type and description are required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('timetable_appeals')
      .insert({
        submitted_by: userId,
        submitter_role: role,
        timetable_id: timetable_id || null,
        unit_id,
        appeal_type,
        current_venue_id: current_venue_id || null,
        requested_venue_id: requested_venue_id || null,
        description,
        supporting_docs: supporting_docs || [],
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    // Notify all schedule managers
    const { data: managers } = await supabaseAdmin
      .from('users').select('id').eq('role', 'schedule_manager').eq('is_active', true)

    const { data: submitter } = await supabaseAdmin
      .from('users').select('full_name').eq('id', userId).single()

    if (managers?.length) {
      await supabaseAdmin.from('notifications').insert(
        managers.map((m: any) => ({
          user_id: m.id,
          title: `📋 New Timetable Appeal`,
          message: `${(submitter as any)?.full_name || 'A user'} submitted a ${appeal_type} appeal. Please review.`,
          type: 'info',
          link: '/schedule-manager/appeals',
          action_type: 'appeal',
        }))
      )
    }

    // Also notify admins
    const { data: admins } = await supabaseAdmin
      .from('users').select('id').eq('role', 'admin').eq('is_active', true)
    if (admins?.length) {
      await supabaseAdmin.from('notifications').insert(
        admins.map((a: any) => ({
          user_id: a.id,
          title: `📋 Timetable Appeal Submitted`,
          message: `${(submitter as any)?.full_name || 'A user'} (${role}) submitted a ${appeal_type} appeal.`,
          type: 'info',
          link: '/admin/appeals',
          action_type: 'appeal',
        }))
      )
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    console.error('Timetable appeal error:', error)
    return NextResponse.json({ error: 'Failed to submit appeal' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any).role

    if (!['lecturer', 'admin', 'schedule_manager'].includes(role)) {
      return NextResponse.json({ error: 'Only authorized staff can update appeals' }, { status: 403 })
    }

    const body = await req.json()
    const { id, status, lecturer_notes, manager_notes } = body

    if (!id) return NextResponse.json({ error: 'Appeal ID is required' }, { status: 400 })

    const updates: any = {}
    if (status) updates.status = status
    if (lecturer_notes !== undefined) updates.lecturer_notes = lecturer_notes
    if (manager_notes !== undefined) updates.manager_notes = manager_notes

    const { data, error } = await supabaseAdmin
      .from('timetable_appeals')
      .update(updates)
      .eq('id', id)
      .select('*, unit:units(code), submitter:users!timetable_appeals_submitted_by_fkey(email, full_name)')
      .single()

    if (error) throw error

    // Notify the student about the update/reply
    if (data?.submitted_by) {
      const unitCode = (data.unit as any)?.code || 'Unit'
      let message = `Your request for ${unitCode} has been updated.`
      if (status) message = `The status of your request for ${unitCode} is now: ${status.replace('_', ' ').toUpperCase()}.`
      if (lecturer_notes || manager_notes) message += ` A note has been added to your request.`

      await supabaseAdmin.from('notifications').insert({
        user_id: data.submitted_by,
        title: `📝 Request Update — ${unitCode}`,
        message: message,
        type: 'info',
        link: '/student/timetable-appeal',
        action_type: 'appeal_update'
      })

      // Email notification via Resend
      const studentEmail = (data.submitter as any)?.email
      const studentName = (data.submitter as any)?.full_name || 'Student'

      if (studentEmail && process.env.RESEND_API_KEY) {
        const resendClient = getResend()
        if (resendClient) {
          await resendClient.emails.send({
            from: 'MKU Summit <notifications@yourverifieddomain.com>', // Note: Update with your verified Resend domain
            to: studentEmail,
            subject: `📝 Request Update — ${unitCode}`,
            html: `
              <h3 style="color: #1a237e;">Hello ${studentName},</h3>
              <p>${message}</p>
              <p>Please log in to your <strong>MKU Summit</strong> portal to view more details.</p>
            `
          }).catch(err => console.error('Failed to send email:', err))
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Timetable appeal PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update appeal' }, { status: 500 })
  }
}
