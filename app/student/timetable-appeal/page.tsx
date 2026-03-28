'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import DeactivatedBanner from '@/components/shared/DeactivatedBanner'
import toast from 'react-hot-toast'

const APPEAL_TYPES = [
  { value: 'venue_change', label: '🏛️ Venue Change', desc: 'Request a different classroom or venue' },
  { value: 'accessibility', label: '♿ Accessibility', desc: 'Need an accessible venue or accommodation' },
  { value: 'clash', label: '⚡ Schedule Clash', desc: 'Two classes overlap in time' },
  { value: 'time_change', label: '⏰ Time Change', desc: 'Request a different time slot' },
  { value: 'other', label: '📝 Other', desc: 'Other timetable-related issue' },
]

export default function StudentTimetableAppeal() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [form, setForm] = useState({
    appeal_type: '',
    unit_id: '',
    timetable_id: '',
    current_venue_id: '',
    requested_venue_id: '',
    description: '',
  })
  const [units, setUnits] = useState<any[]>([])
  const [timetableEntries, setTimetableEntries] = useState<any[]>([])
  const [venues, setVenues] = useState<any[]>([])
  const [myAppeals, setMyAppeals] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [ttRes, venRes, appealsRes] = await Promise.all([
      fetch('/api/timetable'),
      fetch('/api/timetable/venues'),
      fetch('/api/timetable-appeals'),
    ])
    const [ttData, venData, appealsData] = await Promise.all([ttRes.json(), venRes.json(), appealsRes.json()])
    if (ttData.success) {
      setTimetableEntries(ttData.data || [])
      const unitMap = new Map()
      for (const e of ttData.data || []) {
        if (e.unit) unitMap.set(e.unit_id, e.unit)
      }
      setUnits(Array.from(unitMap.values()))
    }
    if (venData.success) setVenues(venData.data || [])
    if (appealsData.success) setMyAppeals(appealsData.data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/timetable-appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Appeal submitted! Schedule Manager will review it soon. 📋')
        setForm({ appeal_type: '', unit_id: '', timetable_id: '', current_venue_id: '', requested_venue_id: '', description: '' })
        loadData()
      } else {
        toast.error(data.error || 'Failed to submit')
      }
    } catch { toast.error('Connection error') }
    setSubmitting(false)
  }

  const statusColors: Record<string, string> = {
    pending: '#e65100', under_review: '#1565c0', approved: '#2e7d32',
    rejected: '#c62828', escalated: '#6a1b9a',
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0f4ff' }}>
      <Sidebar role="student" userName={user?.name || ''} userEmail={user?.email || ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DeactivatedBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
              📋 Timetable Appeal
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Submit a timetable issue — the Schedule Manager will review and respond.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Submit Form */}
            <div className="nexus-card p-6">
              <h2 className="font-bold mb-4" style={{ color: '#1a237e' }}>Submit New Appeal</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="nexus-label">Appeal Type *</label>
                  <div className="grid grid-cols-1 gap-2">
                    {APPEAL_TYPES.map(at => (
                      <div key={at.value}
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all"
                        style={{
                          borderColor: form.appeal_type === at.value ? '#1a237e' : '#e5e7eb',
                          background: form.appeal_type === at.value ? '#e8eaf6' : 'white',
                        }}
                        onClick={() => setForm(f => ({ ...f, appeal_type: at.value }))}>
                        <span className="text-lg">{at.label.split(' ')[0]}</span>
                        <div>
                          <div className="font-semibold text-sm text-gray-800">{at.label.slice(2)}</div>
                          <div className="text-xs text-gray-500">{at.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="nexus-label">Related Unit *</label>
                  <select value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}
                    className="nexus-input" required>
                    <option value="">— Select a unit —</option>
                    {units.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.code} — {u.name}</option>
                    ))}
                  </select>
                </div>

                {(form.appeal_type === 'venue_change' || form.appeal_type === 'accessibility') && (
                  <>
                    <div>
                      <label className="nexus-label">Requested Venue (if known)</label>
                      <select value={form.requested_venue_id} onChange={e => setForm(f => ({ ...f, requested_venue_id: e.target.value }))}
                        className="nexus-input">
                        <option value="">— No preference / Not sure —</option>
                        {venues.map((v: any) => (
                          <option key={v.id} value={v.id}>
                            {v.room_number} — {v.name} ({v.building?.name}) {v.is_accessible ? '♿' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="nexus-label">Description *</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="nexus-input" rows={4}
                    placeholder="Describe your issue in detail. Include specific dates, times, or any other relevant information..."
                    required />
                </div>

                <div className="p-3 rounded-xl text-xs" style={{ background: '#e3f2fd', color: '#1565c0' }}>
                  💡 Your appeal goes directly to the Schedule Manager who specialises in timetable accessibility and changes.
                  You will receive a notification when it's reviewed.
                </div>

                <button type="submit" disabled={submitting || !form.appeal_type || !form.unit_id || !form.description}
                  className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #1a237e, #3949ab)' }}>
                  {submitting ? 'Submitting...' : '📤 Submit Appeal'}
                </button>
              </form>
            </div>

            {/* My Appeals History */}
            <div className="nexus-card p-6">
              <h2 className="font-bold mb-4" style={{ color: '#1a237e' }}>My Appeals ({myAppeals.length})</h2>
              {myAppeals.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-3xl mb-2">📭</div>
                  <p>No appeals yet.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {myAppeals.map(appeal => (
                    <div key={appeal.id} className="p-4 rounded-xl" style={{ background: '#f8f9ff', border: `2px solid ${statusColors[appeal.status]}30` }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-gray-800">
                              {(appeal.unit as any)?.code || 'Unit'}
                            </span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background: `${statusColors[appeal.status]}20`, color: statusColors[appeal.status] }}>
                              {appeal.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 capitalize">{appeal.appeal_type.replace('_', ' ')}</p>
                          {appeal.manager_notes && (
                            <div className="mt-2 p-2 rounded-lg text-xs" style={{ background: '#e8f5e9', color: '#2e7d32' }}>
                              💬 Manager: {appeal.manager_notes}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(appeal.created_at).toLocaleDateString('en-KE')}
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
    </div>
  )
}
