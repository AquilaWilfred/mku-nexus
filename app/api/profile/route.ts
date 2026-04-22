import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import { generateStudentRegistrationNumber } from '@/lib/registrationNumber'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id

    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        id, 
        email, 
        full_name, 
        role, 
        student_id, 
        staff_id, 
        phone, 
        profile_image, 
        bio, 
        is_active, 
        is_disabled, 
        disability_type, 
        course_id,
        year_of_study,
        created_at
      `)
      .eq('id', userId)
      .single()

    if (error) throw error
    
    // For students, fetch course information
    let courseInfo = null
    if (data?.course_id) {
      const { data: course } = await supabaseAdmin
        .from('courses')
        .select('id, code, name, description')
        .eq('id', data.course_id)
        .single()
      courseInfo = course
    }

    return NextResponse.json({ 
      data: {
        ...data,
        course: courseInfo,
        needsRegistration: data.role === 'student' && !data.student_id,
      },
      success: true 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id
    const user = session.user as any

    const body = await req.json()
    
    // Get current user data
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('role, student_id, course_id, year_of_study')
      .eq('id', userId)
      .single()

    // Only allow updating safe fields — users cannot change role, email, or IDs
    const allowedFields: Record<string, unknown> = {}
    const safe = ['full_name', 'phone', 'profile_image', 'bio']
    for (const key of safe) {
      if (body[key] !== undefined) allowedFields[key] = body[key]
    }

    // Handle student registration number generation
    const { generateStudentId } = body
    if (user.role === 'student' && generateStudentId && !currentUser?.student_id) {
      // Verify student has a course assigned
      if (!currentUser?.course_id) {
        return NextResponse.json({
          error: 'Cannot generate registration number. Student is not assigned to a course. Contact administrator.',
        }, { status: 400 })
      }

      // Generate registration number
      const registrationNumber = await generateStudentRegistrationNumber(
        currentUser.course_id,
        currentUser.year_of_study || 1
      )
      allowedFields.student_id = registrationNumber
    }

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    allowedFields.updated_at = new Date().toISOString()
    allowedFields.profile_updated_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(allowedFields)
      .eq('id', userId)
      .select('id, full_name, phone, profile_image, bio, student_id, course_id, year_of_study')
      .single()

    if (error) throw error
    
    // If student_id was generated, fetch course info
    let courseInfo = null
    if (data?.course_id) {
      const { data: course } = await supabaseAdmin
        .from('courses')
        .select('id, code, name')
        .eq('id', data.course_id)
        .single()
      courseInfo = course
    }

    return NextResponse.json({ 
      data: {
        ...data,
        course: courseInfo,
        message: allowedFields.student_id ? 'Registration number generated successfully' : 'Profile updated successfully'
      },
      success: true 
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
