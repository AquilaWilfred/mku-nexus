import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import { generateStudentRegistrationNumber } from '@/lib/registrationNumber'

/**
 * POST /api/admin/student-registration
 * Admin endpoint to generate and assign registration numbers to students
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { studentId: userId, courseId, yearOfStudy } = body

    if (!userId || !courseId) {
      return NextResponse.json({
        error: 'studentId (userId) and courseId are required',
      }, { status: 400 })
    }

    // Verify student exists and is a student
    const { data: student, error: studentError } = await supabaseAdmin
      .from('users')
      .select('id, role, student_id, course_id, year_of_study')
      .eq('id', userId)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (student.role !== 'student') {
      return NextResponse.json({
        error: 'This user is not a student',
      }, { status: 400 })
    }

    // Check if student already has a registration number
    if (student.student_id) {
      return NextResponse.json({
        error: `Student already has registration number: ${student.student_id}`,
      }, { status: 400 })
    }

    // Verify unit exists
    const { data: unit, error: unitError } = await supabaseAdmin
      .from('units')
      .select('id, code, name')
      .eq('id', courseId)
      .single()

    if (unitError || !unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    }

    // Generate registration number
    const registrationNumber = await generateStudentRegistrationNumber(courseId, yearOfStudy || 1)

    // Update student with registration number, course, and year
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        student_id: registrationNumber,
        course_id: courseId,
        year_of_study: yearOfStudy || 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id, email, full_name, student_id, course_id, year_of_study')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      data: {
        student: updated,
        registrationNumber,
        course,
        message: 'Registration number generated and assigned successfully',
      },
      success: true,
    })
  } catch (error: any) {
    console.error('Admin student registration error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate registration number' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/student-registration?courseId=<uuid>
 * Get available registration numbers for a course (shows format)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json({
        error: 'courseId parameter is required',
      }, { status: 400 })
    }

    // Verify unit exists
    const { data: unit, error: unitError } = await supabaseAdmin
      .from('units')
      .select('id, code, name, description')
      .eq('id', courseId)
      .single()

    if (unitError || !unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    }

    // Count students already registered for this unit
    const { data: registeredStudents, error: countError } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact' })
      .eq('course_id', courseId)
      .eq('role', 'student')

    if (countError) throw countError

    return NextResponse.json({
      data: {
        course,
        registeredStudentsCount: registeredStudents?.length || 0,
        registrationFormat: 'COURSE_CODE/YEAR_OF_STUDY/5_DIGIT_CODE',
        example: `${course.code}/1/12345`,
      },
      success: true,
    })
  } catch (error: any) {
    console.error('Get student registration info error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to get registration info' },
      { status: 500 }
    )
  }
}
