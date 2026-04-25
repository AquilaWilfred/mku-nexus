import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import { UserRole } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as unknown as { id: string }).id
    const role = (session.user as unknown as { role: UserRole }).role

    let query

    if (role === 'student') {
      query = supabaseAdmin
        .from('disability_appeals')
        .select(`
          *,
          student:users!disability_appeals_student_id_fkey(full_name, email, student_id),
          unit:units(code, name),
          current_venue:venues!disability_appeals_current_venue_id_fkey(room_number, name, building:buildings(name)),
          requested_venue:venues!disability_appeals_requested_venue_id_fkey(room_number, name, building:buildings(name))
        `)
        .eq('student_id', userId)
        .order('created_at', { ascending: false })
    } else if (role === 'lecturer') {
      // Use inner join to ensure lecturer only sees appeals for their units
      query = supabaseAdmin
        .from('disability_appeals')
        .select(`
          *,
          student:users!disability_appeals_student_id_fkey(full_name, email, student_id),
          unit:units!inner(code, name, lecturer_id),
          current_venue:venues!disability_appeals_current_venue_id_fkey(room_number, name, building:buildings(name)),
          requested_venue:venues!disability_appeals_requested_venue_id_fkey(room_number, name, building:buildings(name))
        `)
        .eq('unit.lecturer_id', userId)
        .order('created_at', { ascending: false })
    } else {
      // Admin and others see all
      query = supabaseAdmin
        .from('disability_appeals')
        .select(`
          *,
          student:users!disability_appeals_student_id_fkey(full_name, email, student_id),
          unit:units(code, name),
          current_venue:venues!disability_appeals_current_venue_id_fkey(room_number, name, building:buildings(name)),
          requested_venue:venues!disability_appeals_requested_venue_id_fkey(room_number, name, building:buildings(name))
        `)
        .order('created_at', { ascending: false })
    }

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

    const role = (session.user as unknown as { role: UserRole }).role
    if (role !== 'student') {
      return NextResponse.json({ error: 'Only students can submit appeals' }, { status: 403 })
    }

    const body = await req.json()
    const userId = (session.user as unknown as { id: string }).id

    const { data, error } = await supabaseAdmin
      .from('disability_appeals')
      .insert({ ...body, student_id: userId, status: 'pending' })
      .select()
      .single()

    if (error) throw error

    // Notify admin
    const { data: admins } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true)

    if (admins?.length) {
      await supabaseAdmin.from('notifications').insert(
        admins.map(a => ({
          user_id: a.id,
          title: '♿ New Disability Appeal',
          message: `A student has submitted a disability appeal requiring venue accommodation.`,
          type: 'warning',
          link: '/admin/appeals',
          action_type: 'appeal',
        }))
      )
    }

    // Notify lecturer of the unit
    const { data: unit } = await supabaseAdmin
      .from('units')
      .select('lecturer_id')
      .eq('id', body.unit_id)
      .single()

    if (unit?.lecturer_id) {
      await supabaseAdmin.from('notifications').insert({
        user_id: unit.lecturer_id,
        title: '♿ Disability Appeal for Your Unit',
        message: `A student has submitted a disability appeal for your unit requiring attention.`,
        type: 'warning',
        link: '/lecturer/appeals',
        action_type: 'appeal',
      })
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit appeal' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as unknown as { role: UserRole }).role
    if (!['admin', 'lecturer'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { id, status, notes } = body
    const userId = (session.user as unknown as { id: string }).id

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (role === 'admin') {
      updateData.admin_notes = notes
      updateData.reviewed_by_admin = userId
      updateData.admin_reviewed_at = new Date().toISOString()
    } else if (role === 'lecturer') {
      updateData.lecturer_notes = notes
      updateData.reviewed_by_lecturer = userId
      updateData.lecturer_reviewed_at = new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from('disability_appeals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Notify student
    await supabaseAdmin.from('notifications').insert({
      user_id: data.student_id,
      title: `Appeal ${status === 'approved' ? 'Approved ✅' : status === 'rejected' ? 'Rejected ❌' : 'Updated 🔄'}`,
      message: `Your disability appeal has been ${status}. ${notes ? `Note: ${notes}` : ''}`,
      type: status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info',
      link: '/student/appeals',
      action_type: 'appeal',
    })

    return NextResponse.json({ data, success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update appeal' }, { status: 500 })
  }
}
