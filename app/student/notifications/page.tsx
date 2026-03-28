'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import { UserRole } from '@/types'
import toast from 'react-hot-toast'

interface Notification {
  id: string; title: string; message: string; type: string; link?: string; is_read: boolean; created_at: string
}

const typeIcons: Record<string, string> = {
  info: 'ℹ️', success: '✅', warning: '⚠️', urgent: '🚨', error: '❌'
}
const typeBg: Record<string, string> = {
  info: '#e8eaf6', success: '#e8f5e9', warning: '#fff3e0', urgent: '#fce4ec', error: '#fce4ec'
}

export default function StudentNotifications() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const role = (session?.user as any)?.role || 'student'

  useEffect(() => { loadNotifications() }, [])

  async function loadNotifications() {
    const res = await fetch('/api/notifications')
    const data = await res.json()
    if (data.success) setNotifications(data.data)
  }

  async function markRead(id?: string) {
    const body = id ? { id } : { all: true }
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    toast.success(id ? 'Marked as read' : 'All marked as read')
    loadNotifications()
  }

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role={role as UserRole} userName={session?.user?.name || ''} userEmail={session?.user?.email || ''} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
                🔔 Notifications
              </h1>
              <p className="text-gray-500 mt-1 text-sm">{unread} unread · {notifications.length} total</p>
            </div>
            {unread > 0 && (
              <button onClick={() => markRead()} className="text-sm font-semibold px-4 py-2 rounded-xl"
                style={{ background: '#e8eaf6', color: '#1a237e' }}>
                ✅ Mark All Read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="nexus-card p-16 text-center text-gray-400">
              <div className="text-5xl mb-4">🔔</div>
              <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
              <p className="text-sm">No notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map(n => (
                <div key={n.id} className="nexus-card p-4 cursor-pointer"
                  style={{ opacity: n.is_read ? 0.7 : 1, borderLeft: `4px solid ${n.is_read ? '#e0e0ef' : '#1a237e'}` }}
                  onClick={() => !n.is_read && markRead(n.id)}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">{typeIcons[n.type] || 'ℹ️'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{n.title}</span>
                        {!n.is_read && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#1a237e' }} />}
                      </div>
                      <p className="text-sm text-gray-600">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(n.created_at).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
