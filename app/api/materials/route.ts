import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'
import { UserRole } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as unknown as { id: string }).id
    const role = (session.user as unknown as { role: UserRole }).role
    const { searchParams } = new URL(req.url)
    const unitId = searchParams.get('unit_id')

    if (role === 'student') {
      // Verify student is enrolled in the unit
      if (unitId) {
        const { data: enrollment } = await supabaseAdmin
          .from('enrollments')
          .select('id')
          .eq('student_id', userId)
          .eq('unit_id', unitId)
          .eq('status', 'active')
          .single()

        if (!enrollment) {
          return NextResponse.json({ error: 'Not enrolled in this unit' }, { status: 403 })
        }
      } else {
        // Get all materials for enrolled units
        const { data: enrollments } = await supabaseAdmin
          .from('enrollments')
          .select('unit_id')
          .eq('student_id', userId)
          .eq('status', 'active')

        const unitIds = enrollments?.map(e => e.unit_id) || []
        
        const { data, error } = await supabaseAdmin
          .from('materials')
          .select('*, unit:units(code, name), lecturer:users!materials_lecturer_id_fkey(full_name)')
          .in('unit_id', unitIds)
          .eq('is_published', true)
          .order('created_at', { ascending: false })

        return NextResponse.json({ data: data || [], success: true })
      }
    }

    let query = supabaseAdmin
      .from('materials')
      .select('*, unit:units(code, name), lecturer:users!materials_lecturer_id_fkey(full_name)')
      .order('created_at', { ascending: false })

    if (unitId) query = query.eq('unit_id', unitId)
    if (role === 'lecturer') query = query.eq('lecturer_id', userId)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data: data || [], success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as unknown as { role: UserRole }).role
    if (!['admin', 'lecturer'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const userId = (session.user as unknown as { id: string }).id

    const { data, error } = await supabaseAdmin
      .from('materials')
      .insert({ ...body, lecturer_id: userId })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data, success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to upload material' }, { status: 500 })
  }
}
