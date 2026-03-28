import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import NotificationsClient from '@/components/shared/NotificationsClient'
import { signOut } from 'next-auth/react'
import Link from 'next/link'

// We re-use NotificationsClient — just need a wrapper layout
export default async function SMNotifications() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'schedule_manager') {
    redirect('/schedule-manager/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0f4ff' }}>
      {/* Inline sidebar for SM — simplified server component version */}
      <div className="nexus-sidebar w-64 flex flex-col h-full flex-shrink-0">
        <div className="p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="text-white font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>MKU NEXUS</div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Schedule Manager</div>
        </div>
        <nav className="flex-1 px-3 py-3">
          {[
            { label: 'Dashboard', href: '/schedule-manager/dashboard', icon: '📊' },
            { label: 'Timetable Appeals', href: '/schedule-manager/appeals', icon: '📋' },
            { label: 'Manage Timetable', href: '/schedule-manager/timetable', icon: '📅' },
            { label: 'Notifications', href: '/schedule-manager/notifications', icon: '🔔' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="nav-item">
              <span>{item.icon}</span><span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <NotificationsClient userRole="schedule_manager" />
    </div>
  )
}
