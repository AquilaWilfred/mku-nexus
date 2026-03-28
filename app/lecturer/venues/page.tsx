'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import { UserRole } from '@/types'
import toast from 'react-hot-toast'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SESSION_TYPES = ['lecture', 'lab', 'tutorial', 'exam']

interface Venue {
  id: string; room_number: string; name?: string; capacity: number; floor_number: number
  is_accessible: boolean; building?: { id: string; name: string; code: string; has_lift: boolean }
}
interface Unit { id: string; code: string; name: string }
interface VenueRequest {
  id: string; status: string; day_of_week: string; start_time: string; end_time: string
  session_type: string; semester: string; year: number; notes?: string; created_at: string
  admin_notes?: string; reviewed_at?: string
  venue?: { room_number: string; name?: string; building?: { name: string } }
  unit?: { code: string; name: string }
}

export default function LecturerVenues() {
  const { data: session } = useSession()
  const [venues, setVenues] = useState<Venue[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [requests, setRequests] = useState<VenueRequest[]>([])
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [form, setForm] = useState({
    venue_id: '', unit_id: '', day_of_week: 'Monday', start_time: '08:00', end_time: '10:00',
    session_type: 'lecture', semester: 'Semester 1', year: new Date().getFullYear(), notes: '',
  })

  const role = (session?.user as any)?.role || 'lecturer'

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [vRes, uRes, rRes] = await Promise.all([
      fetch('/api/timetable/venues'),
      fetch('/api/lecturer/units'),
      fetch('/api/venue-requests'),
    ])
    const [v, u, r] = await Promise.all([vRes.json(), uRes.json(), rRes.json()])
    if (v.success) setVenues(v.data)
    if (u.success) setUnits(u.data)
    if (r.success) setRequests(r.data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.venue_id || !form.unit_id) { toast.error('Please select a venue and unit'); return }
    if (form.start_time >= form.end_time) { toast.error('End time must be after start time'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/venue-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Venue request submitted! Admin will review and approve. 🏛️')
        setShowForm(false)
        setForm({ venue_id: '', unit_id: '', day_of_week: 'Monday', start_time: '08:00', end_time: '10:00', session_type: 'lecture', semester: 'Semester 1', year: new Date().getFullYear(), notes: '' })
        loadData()
      } else {
        toast.error(data.error || 'Failed to submit request')
      }
    } finally { setSubmitting(false) }
  }

  const filteredVenues = venues.filter(v =>
    !searchTerm || v.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.building?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const statusColors: Record<string, string> = {
    pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444'
  }
  const statusIcons: Record<string, string> = {
    pending: '⏳', approved: '✅', rejected: '❌'
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role={role as UserRole} userName={session?.user?.name || ''} userEmail={session?.user?.email || ''} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
                🏛️ Venue Requests
              </h1>
              <p className="text-gray-500 mt-1">Request a venue for your classes — admin will approve or suggest alternatives</p>
            </div>
            <button onClick={() => setShowForm(!showForm)}
              className="text-white font-semibold px-5 py-2.5 rounded-xl"
              style={{ background: showForm ? '#e0e0e0' : 'linear-gradient(135deg, #6a1b9a, #9c27b0)', color: showForm ? '#333' : 'white' }}>
              {showForm ? '✕ Cancel' : '+ Request Venue'}
            </button>
          </div>

          {showForm && (
            <div className="nexus-card p-6 mb-6 animate-fade-in" style={{ borderTop: '4px solid #6a1b9a' }}>
              <h2 className="text-lg font-bold mb-5" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
                New Venue Request
              </h2>

              {/* Venue picker */}
              <div className="mb-5">
                <label className="nexus-label">Search & Select Venue *</label>
                <input
                  className="nexus-input mb-3"
                  placeholder="Search by room number, name, or building..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
                  {filteredVenues.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, venue_id: v.id }))}
                      className="p-3 rounded-xl text-left border-2 transition-all"
                      style={{
                        borderColor: form.venue_id === v.id ? '#6a1b9a' : '#e0e0ef',
                        background: form.venue_id === v.id ? '#f3e5f5' : 'white',
                      }}>
                      <div className="font-bold text-sm" style={{ color: '#6a1b9a' }}>
                        {v.room_number}{v.name ? ` — ${v.name}` : ''}
                      </div>
                      <div className="text-xs text-gray-500">{v.building?.name} {v.floor_number > 0 ? `· Floor ${v.floor_number}` : '· Ground'}</div>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-gray-400">👥 {v.capacity} seats</span>
                        {v.building?.has_lift && <span className="text-xs text-green-600">♿ Lift ✓</span>}
                        {!v.building?.has_lift && v.floor_number > 0 && <span className="text-xs text-orange-500">⚠️ No Lift</span>}
                      </div>
                    </button>
                  ))}
                  {filteredVenues.length === 0 && <p className="text-gray-400 text-sm col-span-3">No venues found</p>}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="nexus-label">Unit *</label>
                    <select className="nexus-input" value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))} required>
                      <option value="">-- Select Unit --</option>
                      {units.map(u => <option key={u.id} value={u.id}>{u.code} — {u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="nexus-label">Session Type *</label>
                    <select className="nexus-input" value={form.session_type} onChange={e => setForm(f => ({ ...f, session_type: e.target.value }))}>
                      {SESSION_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="nexus-label">Day of Week *</label>
                    <select className="nexus-input" value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="nexus-label">Start Time *</label>
                      <input type="time" className="nexus-input" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="nexus-label">End Time *</label>
                      <input type="time" className="nexus-input" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} required />
                    </div>
                  </div>
                  <div>
                    <label className="nexus-label">Semester</label>
                    <select className="nexus-input" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}>
                      <option>Semester 1</option>
                      <option>Semester 2</option>
                      <option>Trimester 1</option>
                      <option>Trimester 2</option>
                      <option>Trimester 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="nexus-label">Year</label>
                    <input type="number" className="nexus-input" value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="nexus-label">Notes (optional)</label>
                    <textarea className="nexus-input" rows={2} value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Any special requirements or context..." />
                  </div>
                </div>

                {!form.venue_id && <p className="text-orange-500 text-sm">⚠️ Please select a venue above</p>}

                <button type="submit" disabled={submitting || !form.venue_id || !form.unit_id}
                  className="text-white font-semibold px-6 py-2.5 rounded-xl disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6a1b9a, #9c27b0)' }}>
                  {submitting ? '⏳ Submitting...' : '🏛️ Submit Venue Request'}
                </button>
              </form>
            </div>
          )}

          {/* My Requests */}
          <div className="nexus-card p-6">
            <h2 className="text-lg font-bold mb-5" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
              My Venue Requests ({requests.length})
            </h2>
            {requests.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-3">🏛️</div>
                <p>No venue requests yet. Submit one above!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(req => (
                  <div key={req.id} className="p-5 rounded-xl border" style={{ borderColor: '#e0e0ef' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="font-bold text-sm">{req.venue?.room_number}{req.venue?.name ? ` — ${req.venue.name}` : ''}</span>
                          <span className="text-sm text-gray-500">{req.venue?.building?.name}</span>
                          <span className="badge badge-purple text-xs">{req.unit?.code}</span>
                          <span className="badge badge-gray text-xs capitalize">{req.session_type}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          📅 {req.day_of_week} · ⏰ {req.start_time?.slice(0,5)} – {req.end_time?.slice(0,5)} · {req.semester} {req.year}
                        </div>
                        {req.notes && <p className="text-xs text-gray-400 mt-1">Note: {req.notes}</p>}
                        {req.admin_notes && (
                          <p className="text-xs mt-1 px-3 py-1 rounded-lg" style={{ background: '#f8f9ff', color: '#444' }}>
                            Admin: {req.admin_notes}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Submitted {new Date(req.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                          {req.reviewed_at && ` · Reviewed ${new Date(req.reviewed_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-3 py-1 rounded-full text-xs font-bold text-white"
                          style={{ background: statusColors[req.status] || '#666' }}>
                          {statusIcons[req.status]} {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </div>
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
