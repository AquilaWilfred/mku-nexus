import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any).role

    const { data: poll, error } = await supabaseAdmin
      .from('polls')
      .select(`*, unit:units(code, name, lecturer_id), options:poll_options(id, option_text, votes_count)`)
      .eq('id', params.id).single()
    if (error || !poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })

    // Lecturers can see full results, students only see if they voted
    return NextResponse.json({ data: poll, success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any).role
    const userId = (session.user as any).id
    if (role !== 'lecturer') return NextResponse.json({ error: 'Lecturers only' }, { status: 403 })

    const body = await req.json()
    const { data, error } = await supabaseAdmin.from('polls').update(body).eq('id', params.id).select().single()
    if (error) throw error
    return NextResponse.json({ data, success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to update poll' }, { status: 500 })
  }
}
