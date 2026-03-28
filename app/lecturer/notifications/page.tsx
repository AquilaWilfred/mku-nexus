import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/shared/Sidebar'
import { UserRole } from '@/types'

export default async function LecturerNotifications() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/lecturer/login')
  const role = (session.user as any).role as UserRole
  if (role !== 'lecturer') redirect(`/${role}/dashboard`)

  const NotificationsClient = (await import('@/components/shared/NotificationsClient')).default
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role="lecturer" userName={session.user.name || ''} userEmail={session.user.email || ''} />
      <NotificationsClient userRole="lecturer" />
    </div>
  )
}
