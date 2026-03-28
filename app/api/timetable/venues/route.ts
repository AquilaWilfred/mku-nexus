import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('venues')
      .select('id, room_number, name, floor_number, is_accessible, capacity, building:buildings(id, name, code, has_lift, accessibility_notes)')
      .order('room_number')

    if (error) throw error
    return NextResponse.json({ data, success: true })
  } catch (error) {
    console.error('Venues GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
