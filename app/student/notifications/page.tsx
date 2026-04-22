import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/shared/Sidebar'
import NotificationsClient from '@/components/shared/NotificationsClient'
import { UserRole } from '@/types'

export default async function StudentNotifications() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/student/login')
  const role = (session.user as any).role as UserRole
  if (role !== 'student') redirect(`/${role}/dashboard`)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role={role} userName={session.user.name || ''} userEmail={session.user.email || ''} />
      <NotificationsClient userRole="student" />
    </div>
  )
}
