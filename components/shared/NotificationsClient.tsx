'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Notification {
  id: string; title: string; message: string; type: string
  link?: string; action_type?: string; is_read: boolean; created_at: string
}

const typeIcons: Record<string, string> = {
  info: 'ℹ️', success: '✅', warning: '⚠️', urgent: '🚨', error: '❌'
}
const actionIcons: Record<string, string> = {
  appeal: '📋', timetable: '📅', enrollment: '📚', event: '📢',
  activation: '🔓', venue_change: '🏛️',
}
const roleHeadingColors: Record<string, string> = {
  student: '#1a237e', lecturer: '#6a1b9a', admin: '#2e7d32', schedule_manager: '#0d47a1',
}

export default function NotificationsClient({ userRole }: { userRole: string }) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const color = roleHeadingColors[userRole] || '#1a237e'

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/notifications')
    const data = await res.json()
    if (data.success) setNotifications(data.data)
    setLoading(false)
  }

  async function markRead(id?: string) {
    const body = id ? { id } : { all: true }
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!id) toast.success('All marked as read')
    load()
  }

  function clearAll() {
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

  async function handleClick(n: Notification) {
    // Mark as read first
    if (!n.is_read) {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      })
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
    }
    // Navigate if link provided
    if (n.link) {
      router.push(n.link)
    }
  }

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color }}>
              🔔 Notifications
            </h1>
            <p className="text-gray-500 mt-1 text-sm">{unread} unread · {notifications.length} total</p>
          </div>
          <div className="flex gap-2">
            {unread > 0 && (
              <button onClick={() => markRead()} className="text-sm font-semibold px-4 py-2 rounded-xl"
                style={{ background: '#f5f5f5', color: '#333' }}>✅ Mark All Read</button>
            )}
            {notifications.length > 0 && (
              <button onClick={clearAll} className="text-sm font-semibold px-4 py-2 rounded-xl text-red-600 border border-red-100 hover:bg-red-50 transition-colors">🗑️ Clear All</button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="nexus-card p-16 text-center text-gray-400">
            <div className="text-5xl mb-4">🔔</div>
            <p>No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => (
              <div key={n.id}
                className="nexus-card p-4 transition-all hover:shadow-md"
                style={{
                  opacity: n.is_read ? 0.7 : 1,
                  borderLeft: `4px solid ${n.is_read ? '#e0e0ef' : color}`,
                  cursor: n.link ? 'pointer' : 'default',
                }}
                onClick={() => handleClick(n)}>
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">
                    {n.action_type ? (actionIcons[n.action_type] || typeIcons[n.type] || 'ℹ️') : (typeIcons[n.type] || 'ℹ️')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm">{n.title}</span>
                      {!n.is_read && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />}
                      {n.link && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `${color}15`, color }}>
                          Click to view →
                        </span>
                      )}
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
  )
}
