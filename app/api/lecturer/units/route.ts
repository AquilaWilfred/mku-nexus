import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import { UserRole } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as unknown as { id: string }).id
    const role = (session.user as unknown as { role: UserRole }).role

    // Students get their enrolled units
    if (role === 'student') {
      const { data: enrollments } = await supabaseAdmin
        .from('enrollments')
        .select('*, unit:units(id, code, name, credits, semester, year, lecturer:users!units_lecturer_id_fkey(full_name))')
        .eq('student_id', userId)
        .eq('status', 'active')

      const units = enrollments?.map(e => e.unit).filter(Boolean) || []
      return NextResponse.json({ data: units, success: true })
    }

    // Lecturers get their assigned units
    if (role === 'lecturer') {
      const { data, error } = await supabaseAdmin
        .from('units')
        .select('id, code, name, credits, semester, year, max_students, description, department:departments(name, code)')
        .eq('lecturer_id', userId)
        .eq('is_active', true)
        .order('code')

      if (error) throw error
      return NextResponse.json({ data, success: true })
    }

    // Admin gets all units
    const { data, error } = await supabaseAdmin
      .from('units')
      .select('id, code, name, credits, semester, year, is_active, lecturer:users!units_lecturer_id_fkey(full_name), department:departments(name, code)')
      .order('code')

    if (error) throw error
    return NextResponse.json({ data, success: true })
  } catch (error) {
    console.error('Units GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
