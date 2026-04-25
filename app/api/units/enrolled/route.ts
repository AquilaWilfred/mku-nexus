import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.error('No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = (session.user as any).id
    const url = new URL(req.url)
    const statusFilter = url.searchParams.get('status') || 'all'
    console.log('Fetching enrolled units for student:', userId, 'status filter:', statusFilter)

    const { data: student, error: studentError } = await supabaseAdmin
      .from('users')
      .select('course_id')
      .eq('id', userId)
      .single()

    if (studentError || !student?.course_id) {
      console.error('Student course fetch error:', studentError)
      return NextResponse.json({ data: [], success: true })
    }

    const courseId = student.course_id
    let units: any[] = []
    let enrollments: any[] = []
    let grades: any[] = []
    let unitIds: string[] = []

    if (statusFilter === 'blue') {
      const { data: courseUnits, error: courseError } = await supabaseAdmin
        .from('course_units')
        .select(`
          unit_id,
          units!inner (
            id, code, name, description, credits, semester, year, max_students, lecturer_id, department_id
          )
        `)
        .eq('course_id', courseId)

      if (courseError) {
        console.error('Course units fetch error:', courseError)
        throw courseError
      }

      units = courseUnits?.map((cu: any) => cu.units).filter(Boolean) || []
      unitIds = units.map((u: any) => u.id)

      if (unitIds.length > 0) {
        const { data: enrollData, error: enrollError } = await supabaseAdmin
          .from('enrollments')
          .select('unit_id, status')
          .eq('student_id', userId)
          .in('unit_id', unitIds)

        if (!enrollError && enrollData) {
          enrollments = enrollData
        }

        const { data: gradeData, error: gradeError } = await supabaseAdmin
          .from('grades')
          .select('unit_id, score, grade_letter, status, result_released_at')
          .eq('student_id', userId)
          .in('unit_id', unitIds)

        if (!gradeError && gradeData) {
          grades = gradeData
        }
      }
    } else {
      const { data: enrollData, error: enrollError } = await supabaseAdmin
        .from('enrollments')
        .select('id, status, unit_id, student_id')
        .eq('student_id', userId)

      if (enrollError) {
        console.error('Enrollments fetch error:', enrollError)
        throw enrollError
      }

      if (!enrollData || enrollData.length === 0) {
        console.log('No enrollments found')
        return NextResponse.json({ data: [], success: true })
      }

      enrollments = enrollData
      const unitIds = enrollData.map((e: any) => e.unit_id)
      console.log('Unit IDs:', unitIds)

      const { data: unitsData, error: unitError } = await supabaseAdmin
        .from('units')
        .select('id, code, name, description, credits, semester, year, max_students, lecturer_id, department_id')
        .in('id', unitIds)

      if (unitError) {
        console.error('Units fetch error:', unitError)
        throw unitError
      }

      units = unitsData || []

      const { data: gradeData, error: gradeError } = await supabaseAdmin
        .from('grades')
        .select('unit_id, score, grade_letter, status, result_released_at')
        .eq('student_id', userId)
        .in('unit_id', unitIds)

      if (!gradeError && gradeData) {
        grades = gradeData
      }
    }

    // Fetch lecturers if needed
    const lecturerIds = units?.map((u: any) => u.lecturer_id).filter(Boolean) || []
    let lecturersMap = new Map()
    
    if (lecturerIds.length > 0) {
      const { data: lecturers, error: lecError } = await supabaseAdmin
        .from('users')
        .select('id, full_name')
        .in('id', lecturerIds)
      
      if (!lecError && lecturers) {
        lecturers.forEach((l: any) => lecturersMap.set(l.id, l))
      }
    }

    // Fetch departments
    let departmentsMap = new Map()
    const { data: depts, error: deptError } = await supabaseAdmin
      .from('departments')
      .select('id, name, code')

    if (!deptError && depts) {
      depts.forEach((d: any) => departmentsMap.set(d.id, d))
    }

    // Fetch timetable entries
    const { data: timetableEntries, error: ttError } = await supabaseAdmin
      .from('timetable')
      .select('id, unit_id, venue_id, day_of_week, start_time, end_time, session_type')
      .in('unit_id', unitIds)

    if (ttError) {
      console.error('Timetable fetch error:', ttError)
      // Don't throw - proceed without timetables
    }

    // Fetch venues if we have timetable data
    let venuesMap = new Map()
    if (timetableEntries && timetableEntries.length > 0) {
      const venueIds = [...new Set(timetableEntries.map((t: any) => t.venue_id).filter(Boolean))]
      if (venueIds.length > 0) {
        const { data: venues, error: venueError } = await supabaseAdmin
          .from('venues')
          .select('id, room_number, name, floor_number, building_id')
          .in('id', venueIds)

        if (!venueError && venues) {
          venues.forEach((v: any) => venuesMap.set(v.id, v))
          
          // Fetch buildings
          const buildingIds = [...new Set(venues.map((v: any) => v.building_id).filter(Boolean))]
          if (buildingIds.length > 0) {
            const { data: buildings } = await supabaseAdmin
              .from('buildings')
              .select('id, name, has_lift')
              .in('id', buildingIds)

            if (buildings) {
              const buildingsMap = new Map(buildings.map((b: any) => [b.id, b]))
              venuesMap.forEach((v: any) => {
                v.building = v.building_id ? buildingsMap.get(v.building_id) : null
              })
            }
          }
        }
      }
    }

    // Build maps
    const unitsMap: Map<string, any> = new Map(units?.map((u: any) => [u.id, u]) || [])
    const gradesMap: Map<string, any> = new Map(grades?.map((g: any) => [g.unit_id, g]) || [])
    const timetablesMap: Map<string, any> = new Map()

    if (timetableEntries) {
      timetableEntries.forEach((t: any) => {
        if (!timetablesMap.has(t.unit_id)) {
          timetablesMap.set(t.unit_id, [])
        }
        timetablesMap.get(t.unit_id).push({
          id: t.id,
          day_of_week: t.day_of_week,
          start_time: t.start_time,
          end_time: t.end_time,
          session_type: t.session_type,
          venue: t.venue_id ? venuesMap.get(t.venue_id) : null
        })
      })
    }

    // Transform response
    const result = enrollments
      .map((e: any) => {
        const unit: any = unitsMap.get(e.unit_id)
        if (!unit) return null

        const grade: any = gradesMap.get(e.unit_id) || null
        const timetable: any = timetablesMap.get(e.unit_id) || []

        // Determine status color
        let statusColor = 'blue'
        let statusLabel = 'Required'

        if (e.status === 'active') {
          if (grade?.status === 'completed_pass') {
            statusColor = 'green'
            statusLabel = 'Completed (Pass)'
          } else if (grade?.status === 'completed_fail' || grade?.status === 'retake') {
            statusColor = 'red'
            statusLabel = grade?.status === 'retake' ? 'Need Retake' : 'Failed'
          } else if (grade?.status === 'completed_defer') {
            statusColor = 'gray'
            statusLabel = 'Grade Pending'
          } else {
            statusColor = 'yellow'
            statusLabel = 'In Progress'
          }
        } else if (e.status === 'dropped') {
          statusColor = 'purple'
          statusLabel = 'Not Registered'
        }

        return {
          id: unit.id,
          code: unit.code,
          name: unit.name,
          description: unit.description,
          credits: unit.credits,
          semester: unit.semester,
          year: unit.year,
          max_students: unit.max_students,
          is_required: unit.is_required || false,
          enrollment_status: e.status,
          grade,
          timetable,
          status_color: statusColor,
          status_label: statusLabel,
          lecturer: unit.lecturer_id ? lecturersMap.get(unit.lecturer_id) : null,
          department: departmentsMap.get(unit.department_id) || null
        }
      })
      .filter(Boolean)

    console.log('Returning', result.length, 'units')
    return NextResponse.json({ data: result, success: true })
    
  } catch (error) {
    console.error('Error fetching enrolled units:', error)
    return NextResponse.json(
      { error: 'Failed to fetch enrolled units', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
