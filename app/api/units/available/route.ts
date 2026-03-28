import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id

    const { searchParams } = new URL(req.url)
    const course_id = searchParams.get('course_id')
    const semester = searchParams.get('semester') || 'Semester 1'
    const year = parseInt(searchParams.get('year') || '2026')

    // Get student's current enrollments
    const { data: enrollments } = await supabaseAdmin
      .from('enrollments')
      .select('unit_id')
      .eq('student_id', userId)
      .eq('status', 'active')
    const enrolledIds = (enrollments || []).map((e: any) => e.unit_id)

    let query
    if (course_id) {
      // Units linked to this specific course
      const { data: courseUnits } = await supabaseAdmin
        .from('course_units')
        .select(`
          unit_id, year_of_study, is_required,
          unit:units(
            id, code, name, description, credits, semester, year, max_students, is_active,
            lecturer:users!units_lecturer_id_fkey(full_name),
            department:departments(name, code),
            timetable(id, day_of_week, start_time, end_time, session_type,
              venue:venues(room_number, name, floor_number, building:buildings(name, has_lift)))
          )
        `)
        .eq('course_id', course_id)
        .order('year_of_study')

      const units = (courseUnits || [])
        .filter((cu: any) => cu.unit && cu.unit.is_active !== false)
        .map((cu: any) => ({ ...cu.unit, year_of_study: cu.year_of_study, is_required: cu.is_required, enrolled: enrolledIds.includes(cu.unit_id) }))

      return NextResponse.json({ data: units, enrolled_ids: enrolledIds, success: true })
    }

    // Fallback: all active units for this semester
    const { data: units, error } = await supabaseAdmin
      .from('units')
      .select(`
        id, code, name, description, credits, semester, year, max_students,
        lecturer:users!units_lecturer_id_fkey(full_name),
        department:departments(name, code),
        timetable(day_of_week, start_time, end_time, session_type,
          venue:venues(room_number, name, floor_number, building:buildings(name, has_lift)))
      `)
      .eq('semester', semester)
      .eq('year', year)
      .eq('is_active', true)
      .order('code')
    if (error) throw error

    const withEnrolled = (units || []).map((u: any) => ({ ...u, enrolled: enrolledIds.includes(u.id) }))
    return NextResponse.json({ data: withEnrolled, enrolled_ids: enrolledIds, success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 })
  }
}
