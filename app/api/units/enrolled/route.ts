import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id

    const { data: enrollments, error } = await supabaseAdmin
      .from('enrollments')
      .select('unit:units(id, code, name, description, credits, semester, year, max_students, lecturer:users!units_lecturer_id_fkey(full_name), department:departments(name, code), timetable(id, day_of_week, start_time, end_time, session_type, venue:venues(room_number, name, floor_number, building:buildings(name, has_lift))))')
      .eq('student_id', userId)
      .eq('status', 'active')

    if (error) throw error
    const units = (enrollments || []).map((e: any) => e.unit).filter(Boolean)
    return NextResponse.json({ data: units, success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch enrolled units' }, { status: 500 })
  }
}
