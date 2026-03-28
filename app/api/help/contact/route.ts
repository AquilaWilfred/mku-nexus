import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, name, role, subject, description, request_type } = body
    if (!email || !description) {
      return NextResponse.json({ success: false, error: 'Email and description are required' }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin.from('help_requests').insert({
      user_email: email,
      full_name: name || '',
      user_role: role || 'lecturer',
      subject: subject || 'Password Reset Request',
      description,
      request_type: request_type || 'password_reset',
      status: 'open',
    }).select().single()
    if (error) return NextResponse.json({ success: false, error: 'Failed to submit' }, { status: 500 })
    // Notify first admin
    const { data: adminUser } = await supabaseAdmin.from('users').select('id').eq('role', 'admin').limit(1).single()
    if (adminUser) {
      await supabaseAdmin.from('notifications').insert({
        user_id: adminUser.id,
        title: `🛟 Help Request: ${subject || 'Password Reset'}`,
        message: `${name || email} (${role}) submitted a help request.`,
        type: 'warning', is_read: false,
      })
    }
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
