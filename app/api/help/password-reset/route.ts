import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { email, role } = await req.json()
    if (!email) return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('help_requests').insert({
      user_email: email,
      user_role: role || 'student',
      full_name: '',
      subject: 'Password Reset Request',
      description: `Self-service password reset from the ${role} login page.`,
      request_type: 'password_reset',
      status: 'open',
    }).select().single()
    if (error) return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
