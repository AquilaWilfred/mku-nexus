import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, student_id, staff_id, phone, profile_image, bio, is_active, is_disabled, disability_type, created_at')
      .eq('id', userId)
      .single()

    if (error) throw error
    return NextResponse.json({ data, success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id

    const body = await req.json()
    // Only allow updating safe fields — users cannot change role, email, or IDs
    const allowedFields: Record<string, unknown> = {}
    const safe = ['full_name', 'phone', 'profile_image', 'bio']
    for (const key of safe) {
      if (body[key] !== undefined) allowedFields[key] = body[key]
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
      .select('id, full_name, phone, profile_image, bio')
      .single()

    if (error) throw error
    return NextResponse.json({ data, success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
