'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/schedule-manager/dashboard', icon: '📊' },
  { label: 'Timetable Appeals', href: '/schedule-manager/appeals', icon: '📋' },
  { label: 'Manage Timetable', href: '/schedule-manager/timetable', icon: '📅' },
  { label: 'Notifications', href: '/schedule-manager/notifications', icon: '🔔' },
]

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const SLOTS = [
  { label:'07:00–10:00', start:'07:00', end:'10:00' },
  { label:'10:00–13:00', start:'10:00', end:'13:00' },
  { label:'13:00–16:00', start:'13:00', end:'16:00' },
  { label:'16:00–19:00', start:'16:00', end:'19:00' },
]

function SMSidebar({ userName, userEmail }: { userName: string; userEmail: string }) {
  const pathname = usePathname()
  return (
    <aside className="nexus-sidebar w-64 flex flex-col h-full flex-shrink-0">
      <div className="p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>N</span>
          </div>
          <div>
            <div className="text-white font-bold text-base" style={{ fontFamily: 'Playfair Display, serif' }}>MKU NEXUS</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Schedule Manager</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? 'active' : ''}`}>
            <span>{item.icon}</span><span className="text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <button onClick={() => signOut({ callbackUrl: '/schedule-manager/login' })}
          className="nav-item w-full text-left" style={{ color: 'rgba(255,100,100,0.9)' }}>
          <span>🚪</span><span className="text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}

export default function SMTimetable() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [entries, setEntries] = useState<any[]>([])
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({ venue_id: '', day_of_week: '', start_time: '', end_time: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  useEffect(() => {
    async function load() {
      const [ttRes, venRes] = await Promise.all([
        fetch('/api/timetable?full=true'),
        fetch('/api/timetable/venues'),
      ])
      const [ttData, venData] = await Promise.all([ttRes.json(), venRes.json()])
      if (ttData.success) setEntries(ttData.data || [])
      if (venData.success) setVenues(venData.data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    try {
      const updates: any = {}
      if (editForm.venue_id) updates.venue_id = editForm.venue_id
      if (editForm.day_of_week) updates.day_of_week = editForm.day_of_week
      if (editForm.start_time) updates.start_time = editForm.start_time
      if (editForm.end_time) updates.end_time = editForm.end_time

      const res = await fetch(`/api/timetable?id=${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Timetable updated! ✅')
        setSelected(null)
        // Reload
        const r = await fetch('/api/timetable?full=true')
        const d = await r.json()
        if (d.success) setEntries(d.data || [])
      } else toast.error(data.error || 'Failed')
    } catch { toast.error('Connection error') }
    setSubmitting(false)
  }

  if (loading) return (
    <div className="flex h-screen" style={{ background: '#f0f4ff' }}>
      <SMSidebar userName={user?.name || ''} userEmail={user?.email || ''} />
      <main className="flex-1 flex items-center justify-center text-gray-400">Loading timetable...</main>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0f4ff' }}>
      <SMSidebar userName={user?.name || ''} userEmail={user?.email || ''} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0d47a1' }}>
            📅 Manage Timetable
          </h1>
          <p className="text-gray-500 text-sm mt-1">{entries.length} entries · Click any cell to edit</p>
        </div>

        <div className="nexus-card p-4 overflow-x-auto">
          <div style={{ minWidth: '860px' }}>
            <div className="grid mb-2" style={{ gridTemplateColumns: '110px repeat(7,1fr)', gap: '6px' }}>
              <div />
              {DAYS.map(d => (
                <div key={d} className="text-center py-2 rounded-xl text-xs font-bold"
                  style={{ background: d === today ? '#0d47a1' : '#e3f2fd', color: d === today ? 'white' : '#0d47a1' }}>
                  {d === today && <div className="text-white/60 text-xs mb-0.5">TODAY</div>}
                  {d.slice(0, 3).toUpperCase()}
                </div>
              ))}
            </div>
            {SLOTS.map(slot => (
              <div key={slot.label} className="grid mb-2" style={{ gridTemplateColumns: '110px repeat(7,1fr)', gap: '6px' }}>
                <div className="flex items-center justify-end pr-3 text-xs font-medium" style={{ color: '#0d47a180' }}>{slot.label}</div>
                {DAYS.map(day => {
                  const entry = entries.find(e => e.day_of_week === day && e.start_time?.slice(0, 5) === slot.start)
                  const hasOverride = entry?.has_active_override
                  if (!entry) return <div key={day} className="rounded-xl h-20" style={{ background: '#f0f4ff', border: '1px dashed #bbdefb' }} />
                  return (
                    <button key={day} onClick={() => {
                      setSelected(entry)
                      setEditForm({ venue_id: entry.venue_id || '', day_of_week: entry.day_of_week, start_time: entry.start_time?.slice(0, 5), end_time: entry.end_time?.slice(0, 5), reason: '' })
                    }}
                      className="rounded-xl p-2 text-left h-20 hover:shadow-md hover:scale-105 transition-all relative"
                      style={{ background: hasOverride ? '#fff8e1' : 'white', border: `2px solid ${hasOverride ? '#e65100' : '#0d47a1'}` }}>
                      {hasOverride && <div className="absolute top-1 right-1 text-xs">📍</div>}
                      <div className="font-bold text-xs truncate" style={{ color: '#0d47a1' }}>{entry.unit?.code}</div>
                      <div className="text-gray-500 text-xs truncate">{entry.unit?.name}</div>
                      <div className="text-gray-400 text-xs mt-1">{entry.venue?.room_number || 'TBA'}</div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </main>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0d47a1' }}>
                  ✏️ Edit Timetable Entry
                </h2>
                <p className="text-gray-500 text-sm">{selected.unit?.code} — {selected.unit?.name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-2xl text-gray-400">×</button>
            </div>

            {selected.venue_change_tag && (
              <div className="p-3 rounded-xl mb-4 text-xs font-medium" style={{ background: '#fff3e0', color: '#e65100' }}>
                🏷️ {selected.venue_change_tag}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="nexus-label">Venue</label>
                <select value={editForm.venue_id} onChange={e => setEditForm(f => ({ ...f, venue_id: e.target.value }))}
                  className="nexus-input">
                  <option value="">— Keep current: {selected.venue?.room_number} —</option>
                  {venues.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.room_number} — {v.name} ({v.building?.name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="nexus-label">Day</label>
                <select value={editForm.day_of_week} onChange={e => setEditForm(f => ({ ...f, day_of_week: e.target.value }))}
                  className="nexus-input">
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="nexus-label">Start Time</label>
                  <input type="time" value={editForm.start_time} onChange={e => setEditForm(f => ({ ...f, start_time: e.target.value }))}
                    className="nexus-input" />
                </div>
                <div>
                  <label className="nexus-label">End Time</label>
                  <input type="time" value={editForm.end_time} onChange={e => setEditForm(f => ({ ...f, end_time: e.target.value }))}
                    className="nexus-input" />
                </div>
              </div>

              <div className="p-3 rounded-xl text-xs" style={{ background: '#e3f2fd', color: '#1565c0' }}>
                💡 Changes here update the main timetable permanently. Affected students and lecturers are automatically notified.
              </div>

              <button type="submit" disabled={submitting}
                className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0d47a1, #0288d1)' }}>
                {submitting ? 'Saving...' : '💾 Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
