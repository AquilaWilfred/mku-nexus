import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role !== 'lecturer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const unitId = req.nextUrl.searchParams.get('unit_id')
    if (!unitId) return NextResponse.json({ error: 'unit_id is required' }, { status: 400 })

    // Fetch active enrollments for this unit along with student details
    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .select('id, status, student:users(id, full_name, email, student_id)')
      .eq('unit_id', unitId)
      .eq('status', 'active')

    if (error) throw error

    // Flatten the response for easier frontend rendering
    const students = (data || []).map((e: any) => ({
      enrollment_id: e.id,
      ...e.student
    })).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))

    return NextResponse.json({ data: students, success: true })
  } catch (error) {
    console.error('Fetch unit students error:', error)
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }
}