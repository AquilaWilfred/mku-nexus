import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'

// POST — deactivated user submits a reactivation request
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id
    const isActive = (session.user as any).is_active

    // Only deactivated users should call this
    if (isActive) {
      return NextResponse.json({ error: 'Your account is already active.' }, { status: 400 })
    }

    const { reason } = await req.json()
    if (!reason || reason.trim().length < 10) {
      return NextResponse.json({ error: 'Please provide a reason (at least 10 characters).' }, { status: 400 })
    }

    // Check if there is already a pending request
    const { data: existing } = await supabaseAdmin
      .from('activation_requests')
      .select('id, status')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single()

    if (existing) {
      return NextResponse.json({ error: 'You already have a pending reactivation request.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('activation_requests')
      .insert({ user_id: userId, reason: reason.trim(), status: 'pending' })
      .select()
      .single()

    if (error) throw error

    // Notify all admins
    const { data: admins } = await supabaseAdmin
      .from('users').select('id').eq('role', 'admin').eq('is_active', true)
    const { data: user } = await supabaseAdmin
      .from('users').select('full_name, email, role').eq('id', userId).single()

    if (admins?.length && user) {
      await supabaseAdmin.from('notifications').insert(
        admins.map((a: any) => ({
          user_id: a.id,
          title: '🔓 Activation Request',
          message: `${user.full_name} (${user.role}) has requested account reactivation. Reason: ${reason.slice(0, 100)}`,
          type: 'warning',
          link: '/admin/users',
          action_type: 'activation',
        }))
      )
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }
}

// GET — admin fetches all activation requests
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any).role
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabaseAdmin
      .from('activation_requests')
      .select('*, user:users!activation_requests_user_id_fkey(id, full_name, email, role, student_id, staff_id)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ data: data || [], success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}
