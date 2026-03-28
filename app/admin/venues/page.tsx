import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import Sidebar from '@/components/shared/Sidebar'
import AdminVenuesClient from '@/components/admin/AdminVenuesClient'
import { UserRole } from '@/types'

export default async function AdminVenues() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/admin/login')
  const role = (session.user as any).role as UserRole
  if (role !== 'admin') redirect(`/${role}/dashboard`)

  const [{ data: buildings }, { data: venueRequests }] = await Promise.all([
    supabaseAdmin.from('buildings')
      .select('*, venues(id, room_number, name, capacity, floor_number, is_accessible, has_projector, has_ac)')
      .order('name'),
    supabaseAdmin.from('venue_requests')
      .select('*, lecturer:users!venue_requests_lecturer_id_fkey(full_name, email), unit:units(code, name), venue:venues(room_number, name, building:buildings(name))')
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role="admin" userName={session.user.name || ''} userEmail={session.user.email || ''} />
      <AdminVenuesClient buildings={buildings || []} venueRequests={venueRequests || []} />
    </div>
  )
}
