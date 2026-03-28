'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import { UserRole } from '@/types'
import DocumentPreview from '@/components/shared/DocumentPreview'

interface Event {
  id: string; title: string; description: string; event_type: string
  is_urgent: boolean; start_datetime?: string; created_at: string
  file_url?: string; file_name?: string; file_size?: number; file_type?: string
  creator?: { full_name: string; role: string }
  venue?: { room_number: string; name?: string; building?: { name: string } }
  unit?: { code: string; name: string }
}

const typeIcons: Record<string, string> = {
  general: '📢', class: '📚', exam: '📝', venue_change: '🔄', cancellation: '❌',
  entertainment: '🎉', sports: '⚽', university: '🏛️', emergency: '🚨'
}
const typeBg: Record<string, string> = {
  general: '#e8eaf6', class: '#e3f2fd', exam: '#fce4ec', venue_change: '#fff3e0',
  cancellation: '#fce4ec', entertainment: '#f3e5f5', sports: '#e8f5e9', university: '#e0f2f1', emergency: '#fff8e1'
}

export default function StudentEvents() {
  const { data: session } = useSession()
  const [events, setEvents] = useState<Event[]>([])
  const [filter, setFilter] = useState('all')
  const role = (session?.user as any)?.role || 'student'

  useEffect(() => {
    fetch('/api/events?limit=50')
      .then(r => r.json())
      .then(d => { if (d.success) setEvents(d.data) })
      .catch(() => {})
  }, [])

  const urgent = events.filter(e => e.is_urgent)
  const filtered = filter === 'all' ? events : events.filter(e => e.event_type === filter)
  const types = [...new Set(events.map(e => e.event_type))]

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role={role as UserRole} userName={session?.user?.name || ''} userEmail={session?.user?.email || ''} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
              📢 Events & Announcements
            </h1>
            <p className="text-gray-500 mt-1 text-sm">{events.length} announcements · {urgent.length} urgent</p>
          </div>

          {/* Urgent banner */}
          {urgent.length > 0 && (
            <div className="mb-6 p-4 rounded-xl" style={{ background: '#fce4ec', border: '2px solid #ef9a9a' }}>
              <h3 className="font-bold text-red-800 mb-2">🚨 Urgent Notices</h3>
              {urgent.map(e => (
                <div key={e.id} className="p-3 bg-white rounded-lg mb-2 last:mb-0">
                  <div className="font-semibold text-sm text-red-700">{e.title}</div>
                  <p className="text-xs text-gray-600 mt-0.5">{e.description.slice(0, 120)}...</p>
                </div>
              ))}
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2 mb-5 flex-wrap">
            <button onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${filter === 'all' ? 'text-white' : 'bg-white text-gray-500 border'}`}
              style={filter === 'all' ? { background: '#1a237e' } : {}}>
              All ({events.length})
            </button>
            {types.map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${filter === t ? 'text-white' : 'bg-white text-gray-500 border'}`}
                style={filter === t ? { background: '#1a237e' } : {}}>
                {typeIcons[t]} {t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="nexus-card p-16 text-center text-gray-400">
              <div className="text-5xl mb-3">📭</div>
              <p>No events yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(ev => (
                <div key={ev.id} className="nexus-card p-4 md:p-5"
                  style={{ borderLeft: `4px solid ${ev.is_urgent ? '#ef4444' : '#c5cae9'}`, background: typeBg[ev.event_type] || 'white' }}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{typeIcons[ev.event_type] || '📢'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-sm">{ev.title}</span>
                        {ev.is_urgent && <span className="badge badge-red">🚨 Urgent</span>}
                        {ev.unit && <span className="badge badge-navy">{ev.unit.code}</span>}
                      </div>
                      <p className="text-sm text-gray-700 mt-1 leading-relaxed">{ev.description}</p>
                      <div className="flex gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                        {ev.start_datetime && <span>📅 {new Date(ev.start_datetime).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                        {ev.venue && <span>📍 {ev.venue.name || ev.venue.room_number}, {ev.venue.building?.name}</span>}
                        <span>By {ev.creator?.full_name}</span>
                        <span>{new Date(ev.created_at).toLocaleDateString('en-KE')}</span>
                      </div>
                      {ev.file_url && ev.file_name && (
                        <DocumentPreview fileUrl={ev.file_url} fileName={ev.file_name} fileType={ev.file_type} fileSize={ev.file_size} />
                      )}
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
