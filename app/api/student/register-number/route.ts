import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import { generateStudentRegistrationNumber } from '@/lib/registrationNumber'

/**
 * GET /api/student/register-number?courseId=<uuid>&yearOfStudy=<number>
 * Generates a student registration number in format: COURSE_CODE/YEAR/5_DIGIT_CODE
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    // Only students can generate their own or admins can generate for any
    if (user.role === 'student') {
      // Student can only check their own registration
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('student_id, course_id, year_of_study')
        .eq('id', user.id)
        .single()

      if (userData?.student_id) {
        return NextResponse.json({
          data: { student_id: userData.student_id },
          message: 'Student already has a registration number',
        })
      }

      if (!userData?.course_id) {
        return NextResponse.json({
          error: 'Student is not enrolled in a course yet. Contact administrator to assign course.',
        }, { status: 400 })
      }

      // Generate for the student's course
      const registrationNumber = await generateStudentRegistrationNumber(
        userData.course_id,
        userData.year_of_study || 1
      )

      return NextResponse.json({
        data: { student_id: registrationNumber },
        success: true,
      })
    } else if (user.role === 'admin') {
      // Admin can generate for any student
      const { searchParams } = new URL(req.url)
      const courseId = searchParams.get('courseId')
      const yearOfStudy = searchParams.get('yearOfStudy')

      if (!courseId || !yearOfStudy) {
        return NextResponse.json({
          error: 'courseId and yearOfStudy parameters are required',
        }, { status: 400 })
      }

      const registrationNumber = await generateStudentRegistrationNumber(
        courseId,
        parseInt(yearOfStudy)
      )

      return NextResponse.json({
        data: { student_id: registrationNumber },
        success: true,
      })
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } catch (error: any) {
    console.error('Registration number generation error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate registration number' },
      { status: 500 }
    )
  }
}
