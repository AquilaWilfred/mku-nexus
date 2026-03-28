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
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json({ data: data || [], success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id

    const { id, all } = await req.json()

    if (all) {
      await supabaseAdmin.from('notifications').update({ is_read: true }).eq('user_id', userId)
    } else if (id) {
      await supabaseAdmin.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', userId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { user_id, title, message, type, link, action_type } = body
    if (!user_id || !title || !message) {
      return NextResponse.json({ error: 'user_id, title and message required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.from('notifications').insert({
      user_id, title, message, type: type || 'info', link: link || null, action_type: action_type || null,
    }).select().single()

    if (error) throw error
    return NextResponse.json({ data, success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}
