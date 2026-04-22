import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'

// Enroll in a unit (including retakes)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role !== 'student') return NextResponse.json({ error: 'Students only' }, { status: 403 })
    const userId = (session.user as any).id
    const { unit_id } = await req.json()
    if (!unit_id) return NextResponse.json({ error: 'Unit ID required' }, { status: 400 })

    // Check unit exists and get details
    const { data: unit } = await supabaseAdmin
      .from('units')
      .select('id, code, name, max_students')
      .eq('id', unit_id)
      .eq('is_active', true)
      .single()
    if (!unit) return NextResponse.json({ error: 'Unit not found or inactive' }, { status: 404 })

    // Check if student already has an active enrollment
    const { data: existingEnrollment } = await supabaseAdmin
      .from('enrollments')
      .select('*')
      .eq('student_id', userId)
      .eq('unit_id', unit_id)
      .eq('status', 'active')
      .single()

    if (existingEnrollment) {
      return NextResponse.json({ error: 'Already enrolled in this unit' }, { status: 409 })
    }

    // Check for previous enrollment (dropped or completed)
    const { data: previousEnrollment } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('student_id', userId)
      .eq('unit_id', unit_id)
      .in('status', ['dropped', 'completed'])
      .single()

    // Check capacity
    const { count } = await supabaseAdmin
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('unit_id', unit_id)
      .eq('status', 'active')
    if (count !== null && unit.max_students && count >= unit.max_students) {
      return NextResponse.json({ error: `${unit.code} is full (${unit.max_students} students max)` }, { status: 409 })
    }

    let data
    let error

    if (previousEnrollment) {
      // Update existing enrollment back to active (retake scenario)
      const result = await supabaseAdmin
        .from('enrollments')
        .update({ status: 'active' })
        .eq('id', previousEnrollment.id)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      // Create new enrollment
      const result = await supabaseAdmin
        .from('enrollments')
        .insert({ student_id: userId, unit_id, status: 'active' })
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) throw error
    return NextResponse.json({ data, success: true, message: `Enrolled in ${unit.code} — ${unit.name}` })
  } catch (e) {
    console.error('Enrollment error:', e)
    return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 })
  }
}

// Drop a unit
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role !== 'student') return NextResponse.json({ error: 'Students only' }, { status: 403 })
    const userId = (session.user as any).id
    const { unit_id } = await req.json()

    const { error } = await supabaseAdmin
      .from('enrollments')
      .update({ status: 'dropped' })
      .eq('student_id', userId)
      .eq('unit_id', unit_id)
      .eq('status', 'active')
    if (error) throw error
    return NextResponse.json({ success: true, message: 'Unit dropped successfully' })
  } catch (e) {
    console.error('Drop error:', e)
    return NextResponse.json({ error: 'Failed to drop unit' }, { status: 500 })
  }
}
