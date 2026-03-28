import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import Sidebar from '@/components/shared/Sidebar'
import AdminTimetableClient from '@/components/admin/AdminTimetableClient'
import { UserRole } from '@/types'

export default async function AdminTimetable() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/admin/login')
  const role = (session.user as unknown as { role: UserRole }).role
  if (role !== 'admin') redirect(`/${role}/dashboard`)

  const [
    { data: timetable },
    { data: units },
    { data: venues },
  ] = await Promise.all([
    supabaseAdmin.from('timetable').select('*, unit:units(code, name, lecturer:users!units_lecturer_id_fkey(full_name)), venue:venues(room_number, name, floor_number, building:buildings(name, code, has_lift))').order('day_of_week').order('start_time'),
    supabaseAdmin.from('units').select('id, code, name, lecturer:users!units_lecturer_id_fkey(full_name)').eq('is_active', true).order('code'),
    supabaseAdmin.from('venues').select('id, room_number, name, floor_number, building:buildings(name, code, has_lift)').order('room_number'),
  ])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role="admin" userName={session.user.name || ''} userEmail={session.user.email || ''} />
      <AdminTimetableClient
        timetable={timetable || []}
        units={units || []}
        venues={venues || []}
      />
    </div>
  )
}
