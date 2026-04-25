import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('timetable')
      .select('*, unit:units(code, name, lecturer:users!units_lecturer_id_fkey(full_name)), venue:venues(room_number, name, floor_number, building:buildings(name, code))')
      .order('day_of_week')
      .order('start_time')

    if (error) {
      console.error('Timetable export fetch failed:', error)
      return new Response('Failed to generate XML timetable', { status: 500 })
    }

    const rows = (data || []).map((entry: any) => {
      const unit = entry.unit || {}
      const venue = entry.venue || {}
      const building = venue.building || {}
      const lecturer = unit.lecturer || {}

      return `    <entry id="${entry.id}">
      <unit>
        <code>${escapeXml(unit.code || 'UNKNOWN')}</code>
        <name>${escapeXml(unit.name || 'Unknown unit')}</name>
        <lecturer>${escapeXml(lecturer.full_name || 'TBA')}</lecturer>
      </unit>
      <schedule>
        <day>${escapeXml(entry.day_of_week || 'TBA')}</day>
        <start>${escapeXml(entry.start_time?.slice(0, 5) || '')}</start>
        <end>${escapeXml(entry.end_time?.slice(0, 5) || '')}</end>
        <session_type>${escapeXml(entry.session_type || 'lecture')}</session_type>
        <semester>${escapeXml(entry.semester || '')}</semester>
        <year>${escapeXml(String(entry.year || new Date().getFullYear()))}</year>
      </schedule>
      <venue>
        <room>${escapeXml(venue.room_number || venue.name || 'TBA')}</room>
        <building>${escapeXml(building.name || building.code || 'TBA')}</building>
        <floor>${escapeXml(String(venue.floor_number ?? ''))}</floor>
      </venue>
    </entry>`
    }).join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<exam_timetable generated_at="${new Date().toISOString()}">\n${rows}\n</exam_timetable>`
    const download = new URL(request.url).searchParams.get('download') === 'true'
    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        ...(download ? { 'Content-Disposition': 'attachment; filename="mku-exam-timetable.xml"' } : { 'Content-Disposition': 'inline' }),
      },
    })
  } catch (error) {
    console.error('Timetable export error:', error)
    return new Response('Failed to generate XML timetable', { status: 500 })
  }
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case '"': return '&quot;'
      case "'": return '&apos;'
      default: return c
    }
  })
}
