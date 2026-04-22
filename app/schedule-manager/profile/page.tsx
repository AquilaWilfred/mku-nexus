import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import Sidebar from '@/components/shared/Sidebar'
import ProfileClient from './ProfileClient'

export default async function ScheduleManagerProfile() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/schedule-manager/login')
  const user = session.user as any
  if (user.role !== 'schedule_manager') redirect(`/${user.role}/profile`)

  const userId = user.id
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, role, student_id, staff_id, phone, profile_image, bio, is_active, is_disabled, disability_type, created_at')
    .eq('id', userId)
    .single()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role="schedule_manager" userName={user.name || ''} userEmail={user.email || ''} />

      <main className="flex-1 overflow-y-auto p-8">
        <ProfileClient profile={profile} />
      </main>
    </div>
  )
}