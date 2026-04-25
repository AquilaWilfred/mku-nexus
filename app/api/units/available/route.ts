import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id

    const { searchParams } = new URL(req.url)
    const course_id = searchParams.get('course_id')

    // Get student's enrollments with grade information
    const { data: enrollments } = await supabaseAdmin
      .from('enrollments')
      .select(`
        unit_id,
        status,
        grade:grades(
          id,
          score,
          grade_letter,
          status,
          result_released_at
        )
      `)
      .eq('student_id', userId)

    // Build a map of unit_id -> enrollment/grade data
    const enrollmentMap = new Map<string, any>()
    enrollments?.forEach((e: any) => {
      enrollmentMap.set(e.unit_id, {
        enrollment_status: e.status,
        grade: e.grade?.[0] || null
      })
    })

    if (course_id) {
      // Fetch ALL units linked to this course (to show complete curriculum)
      const { data: courseUnits } = await supabaseAdmin
        .from('course_units')
        .select(`
          unit_id,
          year_of_study,
          is_required,
          unit:units(
            id,
            code,
            name,
            description,
            credits,
            semester,
            year,
            max_students,
            is_active,
            lecturer:users!units_lecturer_id_fkey(full_name),
            department:departments(name, code),
            timetable(
              id,
              day_of_week,
              start_time,
              end_time,
              session_type,
              venue:venues(
                room_number,
                name,
                floor_number,
                building:buildings(name, has_lift)
              )
            )
          )
        `)
        .eq('course_id', course_id)
        .order('year_of_study')

      // Enrich units with enrollment and grade status
      const units = (courseUnits || [])
        .filter((cu: any) => cu.unit && cu.unit.is_active !== false)
        .map((cu: any) => {
          const enrollmentData = enrollmentMap.get(cu.unit_id)
          const grade = enrollmentData?.grade

          // Determine status color
          let statusColor = 'blue' // Default: all system units (not taken yet)
          let statusLabel = 'Available'

          if (enrollmentData?.enrollment_status === 'active') {
            statusColor = 'yellow' // In progress
            statusLabel = 'In Progress'
          } else if (grade?.status === 'completed_pass') {
            statusColor = 'green' // Passed and grade returned
            statusLabel = 'Completed (Pass)'
          } else if (grade?.status === 'completed_fail' || grade?.status === 'retake') {
            statusColor = 'red' // Failed - needs retake
            statusLabel = grade?.status === 'retake' ? 'Need Retake' : 'Failed'
          } else if (grade?.status === 'completed_defer') {
            statusColor = 'gray' // Grade not yet released
            statusLabel = 'Grade Pending'
          }

          return {
            ...cu.unit,
            year_of_study: cu.year_of_study,
            is_required: cu.is_required,
            enrolled: !!enrollmentData?.enrollment_status,
            enrollment_status: enrollmentData?.enrollment_status || null,
            grade: grade,
            status_color: statusColor,
            status_label: statusLabel,
            can_enroll: !enrollmentData?.enrollment_status && statusColor !== 'green' && statusColor !== 'gray', // Can enroll if not already enrolled or completed
            can_retake: statusColor === 'red' || grade?.status === 'retake'
          }
        })

      return NextResponse.json({
        data: units,
        enrolled_count: [...enrollmentMap.values()].filter((e: any) => e.enrollment_status === 'active').length,
        success: true
      })
    }

    // Fallback: return empty if no course_id
    return NextResponse.json({ data: [], enrolled_count: 0, success: true })
  } catch (e) {
    console.error('Error fetching units:', e)
    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 })
  }
}
