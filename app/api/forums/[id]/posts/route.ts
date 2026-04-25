import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('forum_posts')
      .select(`
        *,
        author:users!forum_posts_author_id_fkey(full_name, role),
        replies:forum_replies(
          *,
          author:users!forum_replies_author_id_fkey(full_name, role)
        )
      `)
      .eq('forum_id', params.id)
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ data: data || [], success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id
    const { content, parent_id } = await req.json()

    if (!content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 })

    if (parent_id) {
      // It's a reply
      const { data, error } = await supabaseAdmin
        .from('forum_replies')
        .insert({ post_id: parent_id, author_id: userId, content })
        .select('*, author:users!forum_replies_author_id_fkey(full_name, role)')
        .single()
      if (error) throw error
      return NextResponse.json({ data, success: true })
    } else {
      const { data, error } = await supabaseAdmin
        .from('forum_posts')
        .insert({ forum_id: params.id, author_id: userId, content })
        .select('*, author:users!forum_posts_author_id_fkey(full_name, role)')
        .single()
      if (error) throw error
      return NextResponse.json({ data, success: true })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to post message' }, { status: 500 })
  }
}
