import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import Sidebar from '@/components/shared/Sidebar'
import AdminEventsClient from '@/components/admin/AdminEventsClient'
import { UserRole } from '@/types'

export default async function AdminEvents() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/admin/login')
  const role = (session.user as any).role as UserRole
  if (role !== 'admin') redirect(`/${role}/dashboard`)

  const [{ data: events }, { data: units }, { data: venues }] = await Promise.all([
    supabaseAdmin.from('events')
      .select('*, creator:users!events_created_by_fkey(full_name, role), unit:units!events_unit_id_fkey(code, name), target_unit:units!events_unit_id_target_fkey(code, name), venue:venues(room_number, name, building:buildings(name))')
      .order('created_at', { ascending: false })
      .limit(100),
    supabaseAdmin.from('units').select('id, code, name').eq('is_active', true).order('code'),
    supabaseAdmin.from('venues').select('id, room_number, name, building:buildings(name)').order('room_number'),
  ])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role="admin" userName={session.user.name || ''} userEmail={session.user.email || ''} />
      <AdminEventsClient
        events={events || []}
        units={units || []}
        venues={(venues || []).map(v => ({ ...v, building: Array.isArray(v.building) ? v.building[0] : v.building }))}
      />
    </div>
  )
}
