import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

// Generate temporary password
function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { helpRequestId, userEmail } = await req.json()

    if (!helpRequestId || !userEmail) {
      return NextResponse.json(
        { error: 'Help request ID and email required' },
        { status: 400 }
      )
    }

    // Generate temporary password
    const tempPassword = generateTempPassword()
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    // Update user password and set must_change_password flag
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        password_hash: hashedPassword,
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq('email', userEmail)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to reset password', details: updateError.message },
        { status: 500 }
      )
    }

    // Update help request status
    const { error: helpError } = await supabaseAdmin
      .from('help_requests')
      .update({
        status: 'resolved',
        admin_response: `Password has been reset. Temporary password: ${tempPassword}\n\nThe user must change this password on first login.`,
        handled_by: (session.user as any).id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', helpRequestId)

    if (helpError) {
      return NextResponse.json(
        { error: 'Failed to update help request' },
        { status: 500 }
      )
    }

    // Create notification for the user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (user) {
      await supabaseAdmin.from('notifications').insert({
        user_id: user.id,
        title: '🔐 Password Reset',
        message: `Your password has been reset by an admin. Temporary password: ${tempPassword}. Please log in and change it immediately.`,
        type: 'warning',
        is_read: false,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      tempPassword,
      user: updateResult,
    })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Server error', details: String(error) },
      { status: 500 }
    )
  }
}
