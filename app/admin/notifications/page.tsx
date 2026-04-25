import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/shared/Sidebar'
import { UserRole } from '@/types'

export default async function AdminNotifications() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/admin/login')
  const role = (session.user as any).role as UserRole
  if (role !== 'admin') redirect(`/${role}/dashboard`)

  // Dynamically render client side
  const NotificationsClient = (await import('@/components/shared/NotificationsClient')).default
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role="admin" userName={session.user.name || ''} userEmail={session.user.email || ''} />
      <NotificationsClient userRole="admin" />
    </div>
  )
}
