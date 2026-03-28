import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'

// GET: Fetch forums (filtered by user's enrolled units for students)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any).role
    const userId = (session.user as any).id

    let unitIds: string[] = []

    if (role === 'student') {
      const { data: enrollments } = await supabaseAdmin
        .from('enrollments')
        .select('unit_id')
        .eq('student_id', userId)
        .eq('status', 'active')
      unitIds = (enrollments || []).map((e: any) => e.unit_id)
    } else if (role === 'lecturer') {
      const { data: units } = await supabaseAdmin
        .from('units')
        .select('id')
        .eq('lecturer_id', userId)
        .eq('is_active', true)
      unitIds = (units || []).map((u: any) => u.id)
    }

    let query = supabaseAdmin
      .from('forums')
      .select(`
        *,
        unit:units(id, code, name),
        creator:users!forums_created_by_fkey(full_name, role),
        posts:forum_posts(count)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (role === 'student' || role === 'lecturer') {
      if (unitIds.length > 0) {
        query = query.in('unit_id', unitIds)
      } else {
        return NextResponse.json({ data: [], success: true })
      }
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ data: data || [], success: true })
  } catch (error) {
    console.error('Forums GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch forums' }, { status: 500 })
  }
}

// POST: Create a new forum (lecturer or admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any).role
    if (!['lecturer', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Only lecturers and admins can create forums' }, { status: 403 })
    }
    const userId = (session.user as any).id
    const body = await req.json()
    const { unit_id, title, description, forum_type } = body

    if (!title || !unit_id) return NextResponse.json({ error: 'Title and unit are required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('forums')
      .insert({ unit_id, title, description, forum_type: forum_type || 'discussion', created_by: userId, is_active: true })
      .select()
      .single()

    if (error) throw error

    // Notify enrolled students
    const { data: enrollments } = await supabaseAdmin
      .from('enrollments')
      .select('student_id')
      .eq('unit_id', unit_id)
      .eq('status', 'active')

    if (enrollments?.length) {
      await supabaseAdmin.from('notifications').insert(
        enrollments.map((e: any) => ({
          user_id: e.student_id,
          title: `📣 New Forum: ${title}`,
          message: `A new discussion forum has been created for your unit. Join the conversation!`,
          type: 'info',
          link: '/student/forums',
        }))
      )
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    console.error('Forums POST error:', error)
    return NextResponse.json({ error: 'Failed to create forum' }, { status: 500 })
  }
}
