import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id

    // Always fetch fresh from DB — never trust stale session JWT for course_id
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, course_id, year_of_study, role, course:courses(id, code, name, duration_years, department:departments(name, code))')
      .eq('id', userId)
      .single()

    if (error || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    return NextResponse.json({ data: user, success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}
