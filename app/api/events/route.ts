import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'
import { UserRole } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any).role as UserRole
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type')
    let query = supabaseAdmin
      .from('events')
      .select(`*, creator:users!events_created_by_fkey(full_name, role), unit:units!events_unit_id_fkey(code, name), target_unit:units!events_unit_id_target_fkey(code, name), venue:venues(room_number, name, building:buildings(name))`)
      .eq('is_published', true)

    if (role === 'student') {
      query = query.in('target_role', ['all', 'student'])
    } else if (role === 'lecturer') {
      query = query.in('target_role', ['all', 'lecturer'])
    }

    if (type) query = query.eq('event_type', type)
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return NextResponse.json({ data, success: true })
  } catch (error) {
    console.error('GET /api/events error:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any).role as UserRole
    if (!['admin', 'lecturer'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    const body = await req.json()
    const userId = (session.user as any).id
    const eventData = {
      title: body.title,
      description: body.description,
      event_type: body.event_type || 'general',
      is_urgent: body.is_urgent || false,
      target_role: body.target_role || 'all',
      is_published: true,
      created_by: userId,
      unit_id: body.unit_id || null,
      venue_id: body.venue_id || null,
      start_datetime: body.start_datetime || null,
      end_datetime: body.end_datetime || null,
      // Document attachment support
      file_url: body.file_url || null,
      file_name: body.file_name || null,
      file_size: body.file_size || null,
      file_type: body.file_type || null,
    }
    const { data, error } = await supabaseAdmin.from('events').insert(eventData).select().single()
    if (error) { console.error('Events insert error:', error); throw error }
    // Notify students
    if (body.target_role === 'all' || body.target_role === 'student') {
      const { data: students } = await supabaseAdmin.from('users').select('id').eq('role', 'student').eq('is_active', true)
      if (students?.length) {
        await supabaseAdmin.from('notifications').insert(
          students.map((s: any) => ({
            user_id: s.id, title: body.title, message: body.description?.slice(0, 200),
            type: body.is_urgent ? 'urgent' : 'info', link: '/student/events', action_type: 'event',
          }))
        )
      }
    }

    // Notify lecturers
    if (body.target_role === 'all' || body.target_role === 'lecturer') {
      const { data: lecturers } = await supabaseAdmin.from('users').select('id').eq('role', 'lecturer').eq('is_active', true)
      if (lecturers?.length) {
        await supabaseAdmin.from('notifications').insert(
          lecturers.map((l: any) => ({
            user_id: l.id, title: body.title, message: body.description?.slice(0, 200),
            type: body.is_urgent ? 'urgent' : 'info', link: '/lecturer/events', action_type: 'event',
          }))
        )
      }
    }
    return NextResponse.json({ data, success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const userId = (session.user as any).id
    const role = (session.user as any).role
    const query = role === 'admin'
      ? supabaseAdmin.from('events').delete().eq('id', id)
      : supabaseAdmin.from('events').delete().eq('id', id).eq('created_by', userId)
    const { error } = await query
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}
