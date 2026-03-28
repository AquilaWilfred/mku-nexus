import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const adminId = (session.user as any).id
    const { id } = params
    const { status, admin_notes } = await req.json()

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Status must be approved or rejected' }, { status: 400 })
    }

    // Get the request + user
    const { data: request } = await supabaseAdmin
      .from('activation_requests')
      .select('*, user:users!activation_requests_user_id_fkey(id, full_name, email, role)')
      .eq('id', id)
      .single()

    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    // Update the request
    await supabaseAdmin.from('activation_requests').update({
      status,
      admin_notes: admin_notes || null,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    // If approved, reactivate the user
    if (status === 'approved') {
      await supabaseAdmin.from('users').update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', request.user_id)
    }

    // Notify the user of the decision
    const user = request.user as any
    await supabaseAdmin.from('notifications').insert({
      user_id: request.user_id,
      title: status === 'approved' ? '✅ Account Reactivated' : '❌ Activation Request Rejected',
      message: status === 'approved'
        ? 'Your account has been reactivated. You now have full access to MKU NEXUS.'
        : `Your reactivation request was rejected. ${admin_notes ? 'Reason: ' + admin_notes : 'Please contact admin for more information.'}`,
      type: status === 'approved' ? 'success' : 'error',
      link: status === 'approved' ? `/${user.role}/dashboard` : null,
      action_type: 'activation',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to review request' }, { status: 500 })
  }
}
