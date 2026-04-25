import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data, error } = await supabaseAdmin
      .from('units')
      .select('*, department:departments(name, code)')
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return NextResponse.json({ data: data || [], success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 })
  }
}

// Student registers their course
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any).role
    if (role !== 'student') return NextResponse.json({ error: 'Students only' }, { status: 403 })
    const userId = (session.user as any).id
    const { course_id, year_of_study } = await req.json()
    if (!course_id) return NextResponse.json({ error: 'Course is required' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('users')
      .update({ course_id, year_of_study: year_of_study || 1 })
      .eq('id', userId)
    if (error) throw error
    return NextResponse.json({ success: true, message: 'Course registered successfully' })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to register course' }, { status: 500 })
  }
}
