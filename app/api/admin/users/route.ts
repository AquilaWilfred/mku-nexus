import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { generateStudentRegistrationNumber } from '@/lib/registrationNumber'

const VALID_ROLES = ['admin', 'lecturer', 'student', 'schedule_manager']

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role')
    const search = searchParams.get('search')

    let query = supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, student_id, staff_id, phone, profile_image, is_active, is_disabled, disability_type, must_change_password, created_at')
      .order('created_at', { ascending: false })

    if (role && role !== 'all') query = query.eq('role', role)
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ data: data || [], success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { email, password, full_name, role, student_id, staff_id, phone, is_disabled, disability_type, courseId, yearOfStudy } = body

    if (!email || !password || !full_name || !role) {
      return NextResponse.json({ error: 'email, password, full_name and role are required' }, { status: 400 })
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 })
    }

    // For students, courseId must be provided
    if (role === 'student' && !courseId) {
      return NextResponse.json({ error: 'courseId is required when registering a student' }, { status: 400 })
    }

    // If student is being registered, verify course exists
    if (role === 'student' && courseId) {
      const { data: course, error: courseError } = await supabaseAdmin
        .from('courses')
        .select('id, code')
        .eq('id', courseId)
        .single()

      if (courseError || !course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      }
    }

    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    const password_hash = await bcrypt.hash(password, 12)

    // Prepare user data
    let generatedStudentId: string | null = null
    const userData: any = {
      email: email.toLowerCase(),
      password_hash,
      full_name,
      role,
      student_id: student_id || null,
      staff_id: staff_id || null,
      phone: phone || null,
      is_disabled: is_disabled || false,
      disability_type: disability_type || null,
      must_change_password: true,
      is_active: true,
    }

    // For students, generate registration number if not provided
    if (role === 'student' && courseId) {
      if (!student_id) {
        // Generate registration number
        generatedStudentId = await generateStudentRegistrationNumber(courseId, yearOfStudy || 1)
        userData.student_id = generatedStudentId
      }
      userData.course_id = courseId
      userData.year_of_study = yearOfStudy || 1
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select('id, email, full_name, role, student_id, course_id, year_of_study, created_at')
      .single()

    if (error) {
      console.error('User creation error:', error)
      // Supabase will return a constraint error if DB not migrated
      if (error.message?.includes('check') || error.message?.includes('constraint')) {
        return NextResponse.json({
          error: `Database constraint error. Please run migration_v8.sql to allow the "${role}" role.`,
        }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({ 
      data: {
        ...data,
        generatedStudentId,
        message: role === 'student' ? 'Student created with auto-generated registration number' : 'User created successfully'
      }, 
      success: true 
    })
  } catch (error: any) {
    console.error('POST /api/admin/users error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to create user' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const body = await req.json()

    // Prevent elevating roles to invalid values
    if (body.role && !VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    // Don't allow deleting yourself
    const adminId = (session.user as any).id
    if (id === adminId) {
      return NextResponse.json({ error: "You can't delete your own account" }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('users').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
