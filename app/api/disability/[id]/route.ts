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
    const userId = (session.user as unknown as { id: string }).id
    const { status, lecturer_notes } = await req.json()

    if (role === 'lecturer') {
      const { data, error } = await supabaseAdmin
        .from('disability_appeals')
        .update({
          status: status || 'under_review',
          lecturer_notes,
          reviewed_by_lecturer: userId,
          lecturer_reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ data, success: true })
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } catch (error) {
    console.error('Disability PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update appeal' }, { status: 500 })
  }
}
