'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import SMSidebar from '@/components/shared/SMSidebar'
import Link from 'next/link'
import toast from 'react-hot-toast'

const APPEAL_TYPES: Record<string, string> = {
  venue_change: '🏛️ Venue Change',
  time_change: '⏰ Time Change',
  accessibility: '♿ Accessibility',
  clash: '⚡ Schedule Clash',
  cancellation: '❌ Cancellation',
  other: '📝 Other',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#e65100', bg: '#fff3e0' },
  under_review: { label: 'Under Review', color: '#1565c0', bg: '#e3f2fd' },
  approved: { label: 'Approved', color: '#2e7d32', bg: '#e8f5e9' },
  rejected: { label: 'Rejected', color: '#c62828', bg: '#ffebee' },
  escalated: { label: 'Escalated to Admin', color: '#6a1b9a', bg: '#f3e5f5' },
}

export default function SMAppeals() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [appeals, setAppeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [selected, setSelected] = useState<any | null>(null)
  const [reviewForm, setReviewForm] = useState({ status: '', manager_notes: '', apply_venue_change: false })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/timetable-appeals')
      const data = await res.json()
      if (data.success) setAppeals(data.data || [])
    } catch {}
    setLoading(false)
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !reviewForm.status) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/timetable-appeals/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Appeal updated & submitter notified! ✅')
        setSelected(null)
        setReviewForm({ status: '', manager_notes: '', apply_venue_change: false })
        load()
      } else toast.error(data.error || 'Failed')
    } catch { toast.error('Connection error') }
    setSubmitting(false)
  }

  const filtered = appeals.filter(a => filter === 'all' ? true : a.status === filter)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0f4ff' }}>
      <SMSidebar userName={user?.name || ''} userEmail={user?.email || ''} />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0d47a1' }}>
              📋 Timetable Appeals
            </h1>
            <p className="text-gray-500 text-sm mt-1">{appeals.length} total · {appeals.filter(a => a.status === 'pending').length} pending</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['pending', 'under_review', 'approved', 'rejected', 'all'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                style={{
                  background: filter === s ? '#0d47a1' : '#f0f4ff',
                  color: filter === s ? 'white' : '#0d47a1',
                  border: '1.5px solid #0d47a1',
                }}>
                {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading appeals...</div>
        ) : filtered.length === 0 ? (
          <div className="nexus-card p-12 text-center text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <p>No {filter !== 'all' ? filter : ''} appeals found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(appeal => {
              const statusCfg = STATUS_CONFIG[appeal.status] || STATUS_CONFIG.pending
              const submitter = appeal.submitter as any
              const unit = appeal.unit as any
              return (
                <div key={appeal.id} className="nexus-card p-5 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => { setSelected(appeal); setReviewForm({ status: appeal.status, manager_notes: appeal.manager_notes || '', apply_venue_change: false }) }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-sm" style={{ color: '#0d47a1' }}>
                          {APPEAL_TYPES[appeal.appeal_type] || appeal.appeal_type}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: statusCfg.bg, color: statusCfg.color }}>
                          {statusCfg.label}
                        </span>
                        <span className="text-xs text-gray-400 capitalize">{appeal.submitter_role}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">
                        {unit?.code} — {unit?.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        By: {submitter?.full_name} ({submitter?.email})
                      </p>
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{appeal.description}</p>
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(appeal.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6" style={{ background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)', borderBottom: '3px solid #0d47a1' }}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0d47a1' }}>
                    {APPEAL_TYPES[selected.appeal_type] || selected.appeal_type}
                  </h2>
                  <p className="text-gray-600 text-sm mt-0.5">
                    {(selected.unit as any)?.code} · Submitted by {(selected.submitter as any)?.full_name}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="text-2xl text-gray-400 hover:text-gray-700">×</button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Appeal details */}
              <div className="p-4 rounded-2xl space-y-2" style={{ background: '#f8f9ff' }}>
                <p className="text-xs text-gray-500 font-semibold uppercase">Description</p>
                <p className="text-sm text-gray-700">{selected.description}</p>
              </div>

              {selected.current_venue && (
                <div className="p-3 rounded-xl text-sm" style={{ background: '#fff3e0' }}>
                  <span className="font-semibold text-orange-700">Current Venue: </span>
                  {(selected.current_venue as any)?.room_number} — {(selected.current_venue as any)?.building?.name}
                </div>
              )}
              {selected.requested_venue && (
                <div className="p-3 rounded-xl text-sm" style={{ background: '#e8f5e9' }}>
                  <span className="font-semibold text-green-700">Requested Venue: </span>
                  {(selected.requested_venue as any)?.room_number} — {(selected.requested_venue as any)?.building?.name}
                </div>
              )}

              <form onSubmit={handleReview} className="space-y-4">
                <div>
                  <label className="nexus-label">Update Status *</label>
                  <select value={reviewForm.status} onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))}
                    className="nexus-input" required>
                    <option value="">— Select status —</option>
                    <option value="under_review">🔍 Under Review</option>
                    <option value="approved">✅ Approve</option>
                    <option value="rejected">❌ Reject</option>
                    <option value="escalated">⬆️ Escalate to Admin</option>
                  </select>
                </div>

                {/* If venue change appeal and approving, offer to apply it */}
                {selected.appeal_type === 'venue_change' && selected.requested_venue_id && selected.timetable_id && reviewForm.status === 'approved' && (
                  <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style={{ background: '#e8f5e9' }}
                    onClick={() => setReviewForm(f => ({ ...f, apply_venue_change: !f.apply_venue_change }))}>
                    <input type="checkbox" checked={reviewForm.apply_venue_change} readOnly className="w-4 h-4 accent-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      ✅ Also apply this venue change to the timetable now
                    </span>
                  </div>
                )}

                <div>
                  <label className="nexus-label">Notes / Response to Submitter</label>
                  <textarea value={reviewForm.manager_notes} onChange={e => setReviewForm(f => ({ ...f, manager_notes: e.target.value }))}
                    className="nexus-input" rows={3} placeholder="Explain your decision or provide instructions..." />
                </div>

                <button type="submit" disabled={submitting || !reviewForm.status}
                  className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #0d47a1, #0288d1)' }}>
                  {submitting ? 'Saving...' : '📤 Submit Review & Notify'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
