'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import toast from 'react-hot-toast'

const APPEAL_TYPES = [
  { value: 'venue_change', label: '🏛️ Venue Change', desc: 'Request a different room or building' },
  { value: 'time_change', label: '⏰ Time Change', desc: 'Request a different time slot' },
  { value: 'accessibility', label: '♿ Accessibility', desc: 'Accessibility accommodation needed' },
  { value: 'clash', label: '⚡ Schedule Clash', desc: 'Conflict with another commitment' },
  { value: 'other', label: '📝 Other', desc: 'Other timetable-related request' },
]

export default function LecturerTimetableAppeal() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [form, setForm] = useState({
    appeal_type: '', unit_id: '', timetable_id: '',
    current_venue_id: '', requested_venue_id: '', description: '',
  })
  const [units, setUnits] = useState<any[]>([])
  const [venues, setVenues] = useState<any[]>([])
  const [myAppeals, setMyAppeals] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [unitRes, venRes, appRes] = await Promise.all([
      fetch('/api/lecturer/units'),
      fetch('/api/timetable/venues'),
      fetch('/api/timetable-appeals'),
    ])
    const [unitData, venData, appData] = await Promise.all([unitRes.json(), venRes.json(), appRes.json()])
    if (unitData.success) setUnits(unitData.data || [])
    if (venData.success) setVenues(venData.data || [])
    if (appData.success) setMyAppeals(appData.data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/timetable-appeals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Appeal submitted to Schedule Manager! 📋')
        setForm({ appeal_type: '', unit_id: '', timetable_id: '', current_venue_id: '', requested_venue_id: '', description: '' })
        loadData()
      } else toast.error(data.error || 'Failed')
    } catch { toast.error('Connection error') }
    setSubmitting(false)
  }

  const statusColors: Record<string, string> = {
    pending: '#e65100', under_review: '#1565c0', approved: '#2e7d32', rejected: '#c62828', escalated: '#6a1b9a',
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#fdf4ff' }}>
      <Sidebar role="lecturer" userName={user?.name || ''} userEmail={user?.email || ''} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#4a0072' }}>
            📋 Timetable Appeal
          </h1>
          <p className="text-gray-500 text-sm mt-1">Submit timetable change requests to the Schedule Manager.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="nexus-card p-6">
            <h2 className="font-bold mb-4" style={{ color: '#4a0072' }}>New Appeal</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="nexus-label">Appeal Type *</label>
                <select value={form.appeal_type} onChange={e => setForm(f => ({ ...f, appeal_type: e.target.value }))}
                  className="nexus-input" required>
                  <option value="">— Select type —</option>
                  {APPEAL_TYPES.map(at => <option key={at.value} value={at.value}>{at.label}</option>)}
                </select>
              </div>
              <div>
                <label className="nexus-label">Related Unit *</label>
                <select value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}
                  className="nexus-input" required>
                  <option value="">— Select unit —</option>
                  {units.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.code} — {u.name}</option>
                  ))}
                </select>
              </div>
              {(form.appeal_type === 'venue_change' || form.appeal_type === 'accessibility') && (
                <div>
                  <label className="nexus-label">Preferred Venue (optional)</label>
                  <select value={form.requested_venue_id} onChange={e => setForm(f => ({ ...f, requested_venue_id: e.target.value }))}
                    className="nexus-input">
                    <option value="">— No preference —</option>
                    {venues.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.room_number} — {v.name} ({v.building?.name})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="nexus-label">Description *</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="nexus-input" rows={4} placeholder="Describe your request in detail..." required />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #4a0072, #9333ea)' }}>
                {submitting ? 'Submitting...' : '📤 Submit to Schedule Manager'}
              </button>
            </form>
          </div>

          <div className="nexus-card p-6">
            <h2 className="font-bold mb-4" style={{ color: '#4a0072' }}>My Appeals</h2>
            {myAppeals.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">📭</div><p>No appeals yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {myAppeals.map(appeal => (
                  <div key={appeal.id} className="p-4 rounded-xl" style={{ background: '#fdf4ff', border: `2px solid ${statusColors[appeal.status]}30` }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-sm">{(appeal.unit as any)?.code}</span>
                        <span className="text-xs font-bold ml-2 px-2 py-0.5 rounded-full"
                          style={{ background: `${statusColors[appeal.status]}20`, color: statusColors[appeal.status] }}>
                          {appeal.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{appeal.appeal_type}</p>
                        {appeal.manager_notes && (
                          <p className="text-xs mt-1 p-2 rounded" style={{ background: '#e8f5e9', color: '#2e7d32' }}>
                            💬 {appeal.manager_notes}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{new Date(appeal.created_at).toLocaleDateString('en-KE')}</span>
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
