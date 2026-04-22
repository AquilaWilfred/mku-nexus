import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import NotificationsClient from '@/components/shared/NotificationsClient'
import SMSidebar from '@/components/shared/SMSidebar'

// We re-use NotificationsClient — just need a wrapper layout
export default async function SMNotifications() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'schedule_manager') {
    redirect('/schedule-manager/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0f4ff' }}>
      <SMSidebar userName={session.user.name || ''} userEmail={session.user.email || ''} />
      <NotificationsClient userRole="schedule_manager" />
    </div>
  )
}
