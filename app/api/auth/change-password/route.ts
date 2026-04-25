import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { newPassword, currentPassword } = await req.json()
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const userId = (session.user as any).id

    if (currentPassword) {
      const { data: user } = await supabaseAdmin.from('users').select('password_hash').eq('id', userId).single()
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const match = await bcrypt.compare(currentPassword, user.password_hash)
      if (!match) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    const password_hash = await bcrypt.hash(newPassword, 12)
    const { error } = await supabaseAdmin
      .from('users')
      .update({ password_hash, must_change_password: false, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
