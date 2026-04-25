import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/polls?unit_id=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any).role
    const userId = (session.user as any).id
    const { searchParams } = new URL(req.url)
    const unit_id = searchParams.get('unit_id')

    let query = supabaseAdmin
      .from('polls')
      .select(`*, unit:units(code, name), creator:users!polls_created_by_fkey(full_name), options:poll_options(id, option_text, votes_count, poll_id)`)
      .order('created_at', { ascending: false })

    if (unit_id) query = query.eq('unit_id', unit_id)

    // Students only see polls for their enrolled units
    if (role === 'student') {
      const { data: enrollments } = await supabaseAdmin
        .from('enrollments').select('unit_id').eq('student_id', userId).eq('status', 'active')
      const unitIds = (enrollments || []).map((e: any) => e.unit_id)
      if (unit_id) {
        if (!unitIds.includes(unit_id)) return NextResponse.json({ data: [], success: true })
      } else {
        if (unitIds.length === 0) return NextResponse.json({ data: [], success: true })
        query = query.in('unit_id', unitIds)
      }
    } else if (role === 'lecturer') {
      const { data: myUnits } = await supabaseAdmin.from('units').select('id').eq('lecturer_id', userId)
      const myUnitIds = (myUnits || []).map((u: any) => u.id)
      if (!unit_id) query = query.in('unit_id', myUnitIds)
    }

    const { data, error } = await query
    if (error) throw error

    // For each poll, check if current student has voted
    if (role === 'student') {
      const pollsWithVote = await Promise.all((data || []).map(async (poll: any) => {
        const { data: vote } = await supabaseAdmin
          .from('poll_votes').select('option_id').eq('poll_id', poll.id).eq('user_id', userId).single()
        return { ...poll, my_vote: vote?.option_id || null }
      }))
      return NextResponse.json({ data: pollsWithVote, success: true })
    }

    return NextResponse.json({ data: data || [], success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch polls' }, { status: 500 })
  }
}

// POST /api/polls — lecturer creates a poll
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any).role
    const userId = (session.user as any).id
    if (role !== 'lecturer') return NextResponse.json({ error: 'Lecturers only' }, { status: 403 })

    const body = await req.json()
    const { unit_id, question, options, expires_at, poll_type } = body
    if (!unit_id || !question || !options || options.length < 2) {
      return NextResponse.json({ error: 'unit_id, question and at least 2 options required' }, { status: 400 })
    }

    // Verify unit belongs to this lecturer
    const { data: unit } = await supabaseAdmin.from('units').select('id, code, name').eq('id', unit_id).eq('lecturer_id', userId).single()
    if (!unit) return NextResponse.json({ error: 'Unit not found or not yours' }, { status: 403 })

    const { data: poll, error } = await supabaseAdmin
      .from('polls')
      .insert({ unit_id, question, created_by: userId, expires_at: expires_at || null, poll_type: poll_type || 'vote', is_active: true })
      .select().single()
    if (error) throw error

    // Insert options
    const optionRows = options.map((opt: string) => ({ poll_id: poll.id, option_text: opt, votes_count: 0 }))
    await supabaseAdmin.from('poll_options').insert(optionRows)

    // Notify enrolled students
    const { data: enrollments } = await supabaseAdmin
      .from('enrollments').select('student_id').eq('unit_id', unit_id).eq('status', 'active')
    if (enrollments?.length) {
      await supabaseAdmin.from('notifications').insert(
        enrollments.map((e: any) => ({
          user_id: e.student_id,
          title: `📊 New Poll — ${unit.code}`,
          message: `Your lecturer has posted a poll: "${question}". Check your timetable to respond.`,
          type: 'info',
          link: '/student/timetable',
        }))
      )
    }

    return NextResponse.json({ data: poll, success: true })
  } catch (e: any) {
    console.error('Poll create error:', e)
    return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 })
  }
}
