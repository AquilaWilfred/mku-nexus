import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'
import { UserRole } from '@/types'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as unknown as { role: UserRole }).role
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const userId = (session.user as unknown as { id: string }).id
    const { status, admin_notes } = await req.json()

    const { data, error } = await supabaseAdmin
      .from('disability_appeals')
      .update({
        status,
        admin_notes,
        reviewed_by_admin: userId,
        admin_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    // Create notification for student
    await supabaseAdmin.from('notifications').insert({
      user_id: data.student_id,
      title: status === 'approved' ? '✅ Accessibility Appeal Approved' : '❌ Accessibility Appeal Update',
      message: status === 'approved'
        ? `Your accessibility appeal has been approved. ${admin_notes ? `Admin note: ${admin_notes}` : ''}`
        : `Your appeal has been ${status}. ${admin_notes ? `Reason: ${admin_notes}` : 'Please contact admin for details.'}`,
      type: status === 'approved' ? 'success' : 'warning',
    })

    return NextResponse.json({ data, success: true })
  } catch (error) {
    console.error('Appeals PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update appeal' }, { status: 500 })
  }
}
