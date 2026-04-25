import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import { UserRole } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as unknown as { role: UserRole }).role
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabaseAdmin
      .from('disability_appeals')
      .select(`
        *,
        student:users!disability_appeals_student_id_fkey(full_name, email, student_id, is_disabled, disability_type),
        unit:units(code, name),
        current_venue:venues!disability_appeals_current_venue_id_fkey(room_number, name, floor_number, building:buildings(name, has_lift)),
        requested_venue:venues!disability_appeals_requested_venue_id_fkey(room_number, name, building:buildings(name, has_lift))
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ data, success: true })
  } catch (error) {
    console.error('Admin appeals GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
