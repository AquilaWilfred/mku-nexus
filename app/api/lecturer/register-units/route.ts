import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import { SESSION_SLOTS, VALID_STARTS } from '@/lib/sessionSlots'

// GET - return lecturer's registered units + units available for a given course
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any).role
    if (role !== 'lecturer') return NextResponse.json({ error: 'Lecturers only' }, { status: 403 })
    const userId = (session.user as any).id

    const { searchParams } = new URL(req.url)
    const semester = searchParams.get('semester') || 'Semester 1'
    const year = parseInt(searchParams.get('year') || '2026')
    const course_id = searchParams.get('course_id') // optional: filter available units by course

    // Units already registered/assigned to this lecturer
    const { data: myUnits } = await supabaseAdmin
      .from('units')
      .select(`
        id, code, name, description, credits, semester, year, max_students,
        department:departments(name, code),
        course_units(course_id, course:courses(code, name)),
        timetable(id, day_of_week, start_time, end_time, session_type,
          venue:venues(id, room_number, name, floor_number, capacity, building:buildings(name, has_lift)))
      `)
      .eq('lecturer_id', userId)
      .eq('semester', semester)
      .eq('year', year)
      .eq('is_active', true)
      .order('code')

    // Available units (no lecturer yet) — optionally filtered by course
    let availableQuery = supabaseAdmin
      .from('units')
      .select(`
        id, code, name, description, credits, semester, year, max_students,
        department:departments(name, code),
        course_units(course_id, year_of_study, course:courses(id, code, name)),
        timetable(id, day_of_week, start_time, end_time)
      `)
      .is('lecturer_id', null)
      .eq('semester', semester)
      .eq('year', year)
      .eq('is_active', true)
      .order('code')

    const { data: allAvailable } = await availableQuery

    // Split available into truly available and already-scheduled (with timetable but no lecturer)
    const trulyAvailable: Array<any> = []
    const alreadyScheduled: Array<any> = []

    if (allAvailable) {
      allAvailable.forEach((u: any) => {
        const hasTimetable = (u.timetable || []).length > 0
        // Filter course_units to only the selected course if provided
        let courseUnits = u.course_units || []
        if (course_id) {
          courseUnits = courseUnits.filter((cu: any) => cu.course_id === course_id)
        }
        
        if (courseUnits.length > 0) {  // Only include if linked to a course (and selected course if filtering)
          const unitWithCourseUnits = { ...u, course_units: courseUnits }
          if (hasTimetable) {
            alreadyScheduled.push(unitWithCourseUnits)
          } else {
            trulyAvailable.push(unitWithCourseUnits)
          }
        }
      })
    }

    // Get all courses for the course picker
    const { data: courses } = await supabaseAdmin
      .from('courses')
      .select('id, code, name, department:departments(name, code)')
      .eq('is_active', true)
      .order('code')

    return NextResponse.json({
      my_units: myUnits || [],
      available_units: trulyAvailable,
      scheduled_units: alreadyScheduled,  // Units with timetable but no lecturer (cannot register)
      courses: courses || [],
      success: true
    })
  } catch (e: any) {
    console.error('Register units GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}

// POST - register a unit: assign lecturer + create timetable entry
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any).role
    if (role !== 'lecturer') return NextResponse.json({ error: 'Lecturers only' }, { status: 403 })
    const userId = (session.user as any).id

    const { unit_id, venue_id, day_of_week, slot_start, session_type, semester, year } = await req.json()

    if (!unit_id || !venue_id || !day_of_week || !slot_start) {
      return NextResponse.json({ error: 'unit_id, venue_id, day_of_week, slot_start are required' }, { status: 400 })
    }

    const sem = semester || 'Semester 1'
    const yr = year || 2026

    // Validate slot_start is one of the 4 fixed slots
    const slot = SESSION_SLOTS.find(s => s.start === slot_start)
    if (!slot) {
      return NextResponse.json({
        error: `Invalid session slot. Must be one of: ${VALID_STARTS.join(', ')}`
      }, { status: 400 })
    }
    const start_time = slot.start
    const end_time = slot.end

    // Check max 4 units per semester per lecturer
    const { data: existing } = await supabaseAdmin
      .from('units')
      .select('id')
      .eq('lecturer_id', userId)
      .eq('semester', sem)
      .eq('year', yr)
      .eq('is_active', true)

    if ((existing || []).length >= 4) {
      return NextResponse.json({ error: 'Maximum of 4 units per semester reached.' }, { status: 400 })
    }

    // Verify unit is actually unassigned (no lecturer yet)
    const { data: unitCheck } = await supabaseAdmin
      .from('units')
      .select('id, code, lecturer_id')
      .eq('id', unit_id)
      .single()

    if (!unitCheck) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    if (unitCheck.lecturer_id && unitCheck.lecturer_id !== userId) {
      return NextResponse.json({ error: 'This unit is already assigned to another lecturer.' }, { status: 409 })
    }

    // Check this unit doesn't already have a timetable entry for this semester
    // (prevents double-booking same unit across intake groups — one slot per unit per semester)
    const { data: existingTimetable } = await supabaseAdmin
      .from('timetable')
      .select('id, day_of_week, start_time, venue_id')
      .eq('unit_id', unit_id)
      .eq('semester', sem)
      .eq('year', yr)

    if (existingTimetable && existingTimetable.length > 0) {
      return NextResponse.json({
        error: `This unit already has a timetable slot assigned (${existingTimetable[0].day_of_week} ${existingTimetable[0].start_time.slice(0,5)}). A unit can only be registered once per semester.`
      }, { status: 409 })
    }

    // Check venue is free at this exact slot
    const { data: venueConflict } = await supabaseAdmin
      .from('timetable')
      .select('id, unit:units(code)')
      .eq('venue_id', venue_id)
      .eq('day_of_week', day_of_week)
      .eq('start_time', start_time)
      .eq('semester', sem)
      .eq('year', yr)

    if (venueConflict && venueConflict.length > 0) {
      const conflictUnit = (venueConflict[0] as any).unit?.code || 'another unit'
      return NextResponse.json({
        error: `This venue is already booked for ${slot.label} on ${day_of_week} by ${conflictUnit}. Please choose a different venue or slot.`
      }, { status: 409 })
    }

    // Check lecturer not double-booked at this slot
    const { data: lecturerConflict } = await supabaseAdmin
      .from('timetable')
      .select('id, unit:units(code, lecturer_id)')
      .eq('day_of_week', day_of_week)
      .eq('start_time', start_time)
      .eq('semester', sem)
      .eq('year', yr)

    const myConflict = (lecturerConflict || []).filter((t: any) => t.unit?.lecturer_id === userId)
    if (myConflict.length > 0) {
      const conflictUnit = (myConflict[0] as any).unit?.code || 'another unit'
      return NextResponse.json({
        error: `You already have ${conflictUnit} scheduled at ${slot.label} on ${day_of_week}. Please choose a different slot.`
      }, { status: 409 })
    }

    // All checks passed — assign lecturer to unit
    const { error: assignErr } = await supabaseAdmin
      .from('units')
      .update({ lecturer_id: userId })
      .eq('id', unit_id)
    if (assignErr) throw assignErr

    // Create timetable entry
    const { data: tEntry, error: tError } = await supabaseAdmin
      .from('timetable')
      .insert({
        unit_id,
        venue_id,
        day_of_week,
        start_time,
        end_time,
        session_type: session_type || 'lecture',
        semester: sem,
        year: yr,
        is_recurring: true,
      })
      .select()
      .single()
    if (tError) throw tError

    // Record the registration
    await supabaseAdmin
      .from('lecturer_unit_registrations')
      .upsert({ lecturer_id: userId, unit_id, semester: sem, year: yr })

    return NextResponse.json({ data: tEntry, success: true })
  } catch (e: any) {
    console.error('Register unit POST error:', e)
    return NextResponse.json({ error: e.message || 'Failed to register unit' }, { status: 500 })
  }
}

// DELETE - unregister a unit
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any).role
    if (role !== 'lecturer') return NextResponse.json({ error: 'Lecturers only' }, { status: 403 })
    const userId = (session.user as any).id

    const { searchParams } = new URL(req.url)
    const unit_id = searchParams.get('unit_id')
    if (!unit_id) return NextResponse.json({ error: 'unit_id required' }, { status: 400 })

    const { data: unit } = await supabaseAdmin
      .from('units')
      .select('id, lecturer_id')
      .eq('id', unit_id)
      .single()

    if (!unit || unit.lecturer_id !== userId) {
      return NextResponse.json({ error: 'Not your unit' }, { status: 403 })
    }

    // Remove timetable entries for this unit this semester
    await supabaseAdmin.from('timetable').delete().eq('unit_id', unit_id)
    // Unassign lecturer
    await supabaseAdmin.from('units').update({ lecturer_id: null }).eq('id', unit_id)
    // Remove registration record
    await supabaseAdmin.from('lecturer_unit_registrations')
      .delete().eq('lecturer_id', userId).eq('unit_id', unit_id)

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to unregister unit' }, { status: 500 })
  }
}
