'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function StudentNotificationsPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadNotifications() }, [])

  async function loadNotifications() {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      if (data.success) {
        setNotifications(data.data)
      }
    } catch {
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(id: string) {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        // Dispatch event to instantly update the Sidebar badge
        window.dispatchEvent(new Event('notificationsUpdated'))
      }
    } catch (err) {
      console.error('Failed to mark as read', err)
    }
  }

  async function markAllAsRead() {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      })
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        toast.success('All notifications marked as read ✅')
        // Dispatch event to instantly update the Sidebar badge
        window.dispatchEvent(new Event('notificationsUpdated'))
      }
    } catch (err) {
      console.error('Failed to mark all as read', err)
    }
  }

  function clearAllNotifications() {
    const previousNotifs = [...notifications]
    setNotifications([])
    window.dispatchEvent(new Event('notificationsUpdated'))

    const timeoutId = setTimeout(async () => {
      try {
        await fetch('/api/notifications', { method: 'DELETE' })
      } catch (err) {
        console.error('Failed to clear notifications', err)
      }
    }, 5000)

    toast((t) => (
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">All notifications cleared 🗑️</span>
        <button
          onClick={() => {
            clearTimeout(timeoutId)
            setNotifications(previousNotifs)
            window.dispatchEvent(new Event('notificationsUpdated'))
            toast.dismiss(t.id)
            toast.success('Action undone ↩️')
          }}
          className="text-xs font-bold px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors"
        >
          Undo
        </button>
      </div>
    ), { duration: 5000, id: 'clear-all-toast' })
  }

  const typeColors: Record<string, string> = {
    info: '#1565c0',
    warning: '#f57f17',
    success: '#2e7d32',
    error: '#c62828',
    urgent: '#d50000'
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0f4ff' }}>
      <Sidebar role="student" userName={user?.name || ''} userEmail={user?.email || ''} />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
                🔔 Notifications
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {unreadCount} unread · View your recent alerts, updates, and messages.
              </p>
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-sm font-semibold px-4 py-2 rounded-xl transition-colors hover:bg-gray-200" style={{ background: '#e8eaf6', color: '#1a237e' }}>
                  ✅ Mark All as Read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAllNotifications} className="text-sm font-semibold px-4 py-2 rounded-xl transition-colors hover:bg-red-50 text-red-600 border border-red-100">
                  🗑️ Clear All
                </button>
              )}
            </div>
          </div>

          <div className="nexus-card p-6">
            {loading ? (
              <div className="text-center py-10 text-gray-400">⏳ Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📭</div>
                <p>You have no notifications at this time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map(notif => (
                  <div key={notif.id} 
                    className={`p-4 rounded-xl border transition-all ${!notif.is_read ? 'bg-white shadow-sm' : 'bg-gray-50 opacity-75'}`}
                    style={{ borderColor: !notif.is_read ? `${typeColors[notif.type]}40` : '#e5e7eb', borderLeftWidth: !notif.is_read ? '4px' : '1px', borderLeftColor: !notif.is_read ? typeColors[notif.type] : '#e5e7eb' }}>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 text-sm" style={{ color: !notif.is_read ? typeColors[notif.type] : '#4b5563' }}>{notif.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                        <div className="text-xs text-gray-400 mt-2 flex items-center gap-3">
                          <span>{new Date(notif.created_at).toLocaleString('en-KE')}</span>
                          {notif.link && <Link href={notif.link} className="text-blue-600 hover:underline font-semibold">View Details →</Link>}
                        </div>
                      </div>
                      {!notif.is_read && (
                        <button onClick={() => markAsRead(notif.id)} className="text-xs text-gray-500 hover:text-gray-800 flex-shrink-0">✓ Mark as read</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}