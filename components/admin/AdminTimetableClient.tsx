'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const typeColors: Record<string, string> = { lecture: '#1a237e', lab: '#6a1b9a', tutorial: '#2e7d32', exam: '#c62828' }

interface TimetableEntry {
  id: string; day_of_week: string; start_time: string; end_time: string; session_type: string; semester: string; year: number
  unit?: { code: string; name: string; lecturer?: { full_name: string } }
  venue?: { room_number: string; name?: string; floor_number: number; building?: { name: string; code: string; has_lift: boolean } }
}
interface Unit { id: string; code: string; name: string; lecturer?: { full_name: string } }
interface Venue { id: string; room_number: string; name?: string; floor_number: number; building?: { name: string; code: string; has_lift: boolean } }

interface Props {
  timetable: TimetableEntry[]
  units: Unit[]
  venues: Venue[]
}

export default function AdminTimetableClient({ timetable, units, venues }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [form, setForm] = useState({
    unit_id: '', venue_id: '', day_of_week: 'Monday', start_time: '', end_time: '',
    session_type: 'lecture', semester: 'Semester 1', year: new Date().getFullYear(),
  })

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Timetable entry added! ✅ AI will use this data.')
        setShowForm(false)
        setForm({ unit_id: '', venue_id: '', day_of_week: 'Monday', start_time: '', end_time: '', session_type: 'lecture', semester: 'Semester 1', year: new Date().getFullYear() })
        window.location.reload()
      } else { toast.error(data.error || 'Failed to add entry') }
    } finally { setSubmitting(false) }
  }

  async function deleteEntry(id: string) {
    if (!confirm('Delete this timetable entry?')) return
    await fetch(`/api/timetable?id=${id}`, { method: 'DELETE' })
    toast.success('Entry deleted')
    window.location.reload()
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#2e7d32' }}>
              📅 Units & Timetable
            </h1>
            <p className="text-gray-500 mt-1">{timetable.length} timetable entries · Used by AI for real-time scheduling queries</p>
          </div>
          <div className="flex gap-3">
            <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: '#e0e0ef' }}>
              {(['grid', 'list'] as const).map(v => (
                <button key={v} onClick={() => setViewMode(v)}
                  className="px-4 py-2 text-sm font-semibold capitalize"
                  style={{ background: viewMode === v ? '#2e7d32' : 'white', color: viewMode === v ? 'white' : '#444' }}>
                  {v === 'grid' ? '⊞' : '☰'} {v}
                </button>
              ))}
            </div>
            <button onClick={() => setShowForm(!showForm)} className="text-white font-semibold px-5 py-2.5 rounded-xl"
              style={{ background: showForm ? '#e0e0e0' : 'linear-gradient(135deg, #2e7d32, #43a047)', color: showForm ? '#333' : 'white' }}>
              {showForm ? '✕ Cancel' : '+ Add Entry'}
            </button>
          </div>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="nexus-card p-6 mb-6 animate-fade-in" style={{ borderTop: '4px solid #2e7d32' }}>
            <h2 className="font-bold text-lg mb-5" style={{ fontFamily: 'Playfair Display, serif', color: '#2e7d32' }}>
              Add Timetable Entry
            </h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="nexus-label">Unit *</label>
                  <select className="nexus-input" value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))} required>
                    <option value="">-- Select Unit --</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.code} — {u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="nexus-label">Venue *</label>
                  <select className="nexus-input" value={form.venue_id} onChange={e => setForm(f => ({ ...f, venue_id: e.target.value }))} required>
                    <option value="">-- Select Venue --</option>
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.room_number}{v.name ? ` (${v.name})` : ''} — {v.building?.name}
                        {v.floor_number > 0 && !v.building?.has_lift ? ' ⚠️' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="nexus-label">Day *</label>
                  <select className="nexus-input" value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}>
                    {DAYS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="nexus-label">Start Time *</label>
                  <input type="time" className="nexus-input" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} required />
                </div>
                <div>
                  <label className="nexus-label">End Time *</label>
                  <input type="time" className="nexus-input" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} required />
                </div>
                <div>
                  <label className="nexus-label">Session Type</label>
                  <select className="nexus-input" value={form.session_type} onChange={e => setForm(f => ({ ...f, session_type: e.target.value }))}>
                    {['lecture', 'lab', 'tutorial', 'exam'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
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
                  <input type="number" className="nexus-input" value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))} min={2024} max={2030} />
                </div>
              </div>
              <button type="submit" disabled={submitting}
                className="text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #2e7d32, #43a047)' }}>
                {submitting ? '⏳ Adding...' : '✅ Add Entry'}
              </button>
            </form>
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {DAYS.map(day => {
              const dayEntries = timetable.filter(t => t.day_of_week === day)
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
              return (
                <div key={day} className="nexus-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#2e7d32' }}>{day}</h3>
                    <span className="badge badge-green text-xs">{dayEntries.length} classes</span>
                  </div>
                  {!dayEntries.length ? (
                    <p className="text-xs text-gray-400 text-center py-4">No classes</p>
                  ) : (
                    <div className="space-y-2">
                      {dayEntries.map(entry => (
                        <div key={entry.id} className="p-3 rounded-xl flex items-start justify-between gap-2"
                          style={{ background: '#f8f9ff', borderLeft: `3px solid ${typeColors[entry.session_type] || '#1a237e'}` }}>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs" style={{ color: typeColors[entry.session_type] }}>
                              {entry.start_time.slice(0,5)}–{entry.end_time.slice(0,5)}
                            </div>
                            <div className="text-xs font-medium truncate">{entry.unit?.code}</div>
                            <div className="text-xs text-gray-500 truncate">{entry.venue?.room_number}, {entry.venue?.building?.name}</div>
                            {entry.venue?.floor_number && entry.venue.floor_number > 0 && !entry.venue.building?.has_lift && (
                              <div className="text-xs" style={{ color: '#e65100' }}>⚠️ No lift</div>
                            )}
                          </div>
                          <button onClick={() => deleteEntry(entry.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="nexus-card p-6">
            <table className="nexus-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Unit</th>
                  <th>Lecturer</th>
                  <th>Venue</th>
                  <th>Type</th>
                  <th>Accessibility</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {timetable.map(entry => (
                  <tr key={entry.id}>
                    <td className="font-medium">{entry.day_of_week}</td>
                    <td className="font-mono text-sm">{entry.start_time.slice(0,5)}–{entry.end_time.slice(0,5)}</td>
                    <td>
                      <div className="font-semibold text-sm">{entry.unit?.code}</div>
                      <div className="text-xs text-gray-400">{entry.unit?.name}</div>
                    </td>
                    <td className="text-sm text-gray-600">{entry.unit?.lecturer?.full_name}</td>
                    <td>
                      <div className="text-sm">{entry.venue?.room_number}</div>
                      <div className="text-xs text-gray-400">{entry.venue?.building?.name}</div>
                    </td>
                    <td>
                      <span className="badge text-xs capitalize"
                        style={{ background: typeColors[entry.session_type] + '18', color: typeColors[entry.session_type] }}>
                        {entry.session_type}
                      </span>
                    </td>
                    <td>
                      {entry.venue?.floor_number === 0 || entry.venue?.building?.has_lift ? (
                        <span className="accessible-badge accessible-yes text-xs">♿ Accessible</span>
                      ) : (
                        <span className="accessible-badge accessible-no text-xs">♿ No Lift F{entry.venue?.floor_number}</span>
                      )}
                    </td>
                    <td>
                      <button onClick={() => deleteEntry(entry.id)} className="btn-danger">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
