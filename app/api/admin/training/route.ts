import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as unknown as { role: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('ai_training_sessions')
      .select('*, creator:users!ai_training_sessions_created_by_fkey(full_name)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ data: data || [], success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch training sessions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as unknown as { role: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const userId = (session.user as unknown as { id: string }).id

    // Deactivate all previous training sessions for same semester
    await supabaseAdmin
      .from('ai_training_sessions')
      .update({ is_active: false })
      .eq('semester', body.semester)
      .eq('year', body.year)

    // Create new active training session
    const { data, error } = await supabaseAdmin
      .from('ai_training_sessions')
      .insert({
        ...body,
        created_by: userId,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      data, 
      success: true, 
      message: `AI trained for ${body.semester} ${body.year} semester` 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save training data' }, { status: 500 })
  }
}

// Auto-sync timetable data into AI training
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as unknown as { role: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { semester, year } = await req.json()
    const userId = (session.user as unknown as { id: string }).id

    // Pull current timetable data
    const { data: timetable } = await supabaseAdmin
      .from('timetable')
      .select(`
        *,
        unit:units(code, name, description, lecturer:users!units_lecturer_id_fkey(full_name)),
        venue:venues(room_number, name, floor_number, is_accessible, building:buildings(name, has_lift, accessibility_notes))
      `)
      .eq('semester', semester)
      .eq('year', year)

    const { data: units } = await supabaseAdmin
      .from('units')
      .select('*, lecturer:users!units_lecturer_id_fkey(full_name, email), department:departments(name, code)')
      .eq('semester', semester)
      .eq('year', year)
      .eq('is_active', true)

    const { data: buildings } = await supabaseAdmin
      .from('buildings')
      .select('*')

    const trainingData = {
      semester,
      year,
      generated_at: new Date().toISOString(),
      timetable: timetable || [],
      units: units || [],
      buildings: buildings || [],
      total_units: units?.length || 0,
      total_timetable_entries: timetable?.length || 0,
    }

    // Deactivate old
    await supabaseAdmin
      .from('ai_training_sessions')
      .update({ is_active: false })
      .eq('semester', semester)
      .eq('year', year)

    const { data, error } = await supabaseAdmin
      .from('ai_training_sessions')
      .insert({
        semester,
        year,
        title: `Auto-sync: ${semester} ${year}`,
        description: `Automatically generated from timetable data`,
        training_data: trainingData,
        created_by: userId,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      data, 
      success: true,
      message: `AI knowledge synced for ${semester} ${year}: ${units?.length} units, ${timetable?.length} timetable entries`
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to sync AI training' }, { status: 500 })
  }
}
