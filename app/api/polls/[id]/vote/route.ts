import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/polls/[id]/vote
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any).role
    const userId = (session.user as any).id
    if (role !== 'student') return NextResponse.json({ error: 'Students only' }, { status: 403 })

    const { option_id } = await req.json()
    if (!option_id) return NextResponse.json({ error: 'option_id required' }, { status: 400 })

    const pollId = params.id

    // Check poll is active
    const { data: poll } = await supabaseAdmin.from('polls').select('*, unit_id').eq('id', pollId).single()
    if (!poll || !poll.is_active) return NextResponse.json({ error: 'Poll not found or closed' }, { status: 404 })
    if (poll.expires_at && new Date(poll.expires_at) < new Date()) return NextResponse.json({ error: 'Poll has expired' }, { status: 400 })

    // Check student is enrolled
    const { data: enrollment } = await supabaseAdmin.from('enrollments')
      .select('id').eq('student_id', userId).eq('unit_id', poll.unit_id).eq('status', 'active').single()
    if (!enrollment) return NextResponse.json({ error: 'Not enrolled in this unit' }, { status: 403 })

    // Check hasn't already voted
    const { data: existing } = await supabaseAdmin.from('poll_votes')
      .select('id').eq('poll_id', pollId).eq('user_id', userId).single()
    if (existing) return NextResponse.json({ error: 'You have already voted' }, { status: 409 })

    // Record vote (anonymous — only option counted, not linked to identity in results)
    await supabaseAdmin.from('poll_votes').insert({ poll_id: pollId, option_id, user_id: userId })

    // Increment count on option
    await supabaseAdmin.rpc('increment_poll_option_votes', { option_id_param: option_id })

    // Notify the lecturer
    const { data: unit } = await supabaseAdmin.from('units').select('lecturer_id, code').eq('id', poll.unit_id).single()
    if (unit?.lecturer_id) {
      const { data: updatedOptions } = await supabaseAdmin
        .from('poll_options').select('option_text, votes_count').eq('poll_id', pollId).order('votes_count', { ascending: false })
      const summary = (updatedOptions || []).map((o: any) => `${o.option_text}: ${o.votes_count} vote(s)`).join(' | ')
      await supabaseAdmin.from('notifications').insert({
        user_id: unit.lecturer_id,
        title: `📊 Poll Response — ${unit.code}`,
        message: `A student responded to your poll. Current results: ${summary}`,
        type: 'info',
        link: '/lecturer/timetable',
      })
    }

    return NextResponse.json({ success: true, message: 'Vote recorded' })
  } catch (e: any) {
    console.error('Vote error:', e)
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
  }
}
