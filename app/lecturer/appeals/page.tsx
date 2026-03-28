'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import { UserRole } from '@/types'
import toast from 'react-hot-toast'

interface Appeal {
  id: string; disability_type: string; description: string; status: string
  lecturer_notes?: string; admin_notes?: string; created_at: string
  student?: { full_name: string; student_id: string; is_disabled: boolean }
  unit?: { code: string; name: string }
  current_venue?: { room_number: string; name: string; building?: { name: string; has_lift: boolean } }
  requested_venue?: { room_number: string; name: string; building?: { name: string; has_lift: boolean } }
}

const statusCfg: Record<string, { color: string; bg: string; icon: string }> = {
  pending: { color: '#e65100', bg: '#fff3e0', icon: '⏳' },
  under_review: { color: '#1565c0', bg: '#e3f2fd', icon: '🔍' },
  approved: { color: '#2e7d32', bg: '#e8f5e9', icon: '✅' },
  rejected: { color: '#c62828', bg: '#ffebee', icon: '❌' },
}

export default function LecturerAppeals() {
  const { data: session } = useSession()
  const [appeals, setAppeals] = useState<Appeal[]>([])
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadAppeals() }, [])

  async function loadAppeals() {
    const res = await fetch('/api/disability?role=lecturer')
    const data = await res.json()
    if (data.success) setAppeals(data.data)
  }

  async function submitReview(appealId: string, newStatus: string) {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/disability/${appealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, lecturer_notes: notes }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Review submitted ✅')
        setSelectedAppeal(null)
        setNotes('')
        loadAppeals()
      } else { toast.error(data.error || 'Failed to submit review') }
    } finally { setSubmitting(false) }
  }

  const role = (session?.user as unknown as { role: UserRole })?.role || 'lecturer'
  const pending = appeals.filter(a => a.status === 'pending')
  const reviewed = appeals.filter(a => a.status !== 'pending')

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role={role} userName={session?.user?.name || ''} userEmail={session?.user?.email || ''} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
              ♿ Accessibility Appeals
            </h1>
            <p className="text-gray-500 mt-1">
              Review accommodation requests from students in your units
            </p>
          </div>

          {pending.length > 0 && (
            <div className="mb-6 p-4 rounded-xl flex items-center gap-3"
              style={{ background: '#fff3e0', border: '1px solid #ffcc02' }}>
              ⚠️ <span className="font-semibold text-orange-700">{pending.length} appeal{pending.length > 1 ? 's' : ''} awaiting your review</span>
            </div>
          )}

          {/* Review Modal */}
          {selectedAppeal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="nexus-card p-6 max-w-xl w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>Review Appeal</h3>
                  <button onClick={() => { setSelectedAppeal(null); setNotes('') }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                </div>
                <div className="space-y-3 mb-5">
                  <div className="p-3 rounded-xl" style={{ background: '#f8f9ff' }}>
                    <div className="text-xs text-gray-500">Student</div>
                    <div className="font-semibold">{selectedAppeal.student?.full_name} ({selectedAppeal.student?.student_id})</div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: '#f8f9ff' }}>
                    <div className="text-xs text-gray-500">Disability Type</div>
                    <div className="font-semibold">{selectedAppeal.disability_type}</div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: '#f8f9ff' }}>
                    <div className="text-xs text-gray-500">Description</div>
                    <div className="text-sm">{selectedAppeal.description}</div>
                  </div>
                  {selectedAppeal.current_venue && (
                    <div className="p-3 rounded-xl" style={{ background: '#fff8f0' }}>
                      <div className="text-xs font-semibold text-orange-700">Current venue: </div>
                      <div className="text-sm">{selectedAppeal.current_venue.room_number}, {selectedAppeal.current_venue.building?.name}
                        {selectedAppeal.current_venue.building && !selectedAppeal.current_venue.building.has_lift && <span className="text-red-500"> ⚠️ No lift</span>}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mb-4">
                  <label className="nexus-label">Your Assessment Notes</label>
                  <textarea className="nexus-input" rows={3} value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Comment on the student's situation, confirm the need, suggest alternatives..." />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => submitReview(selectedAppeal.id, 'under_review')}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #6a1b9a, #9c27b0)' }}>
                    Forward to Admin
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pending appeals */}
          <div className="nexus-card p-6 mb-6">
            <h2 className="text-lg font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#e65100' }}>
              ⏳ Pending Review ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No pending appeals 🎉</p>
            ) : (
              <div className="space-y-4">
                {pending.map(appeal => (
                  <div key={appeal.id} className="p-5 rounded-xl border" style={{ borderColor: '#ffe0b2', background: '#fffbf0' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-semibold">{appeal.student?.full_name}
                          <span className="text-xs text-gray-400 ml-2">({appeal.student?.student_id})</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">{appeal.disability_type}</div>
                        {appeal.unit && <div className="text-xs text-gray-500 mt-0.5">Unit: {appeal.unit.code} — {appeal.unit.name}</div>}
                        <p className="text-sm text-gray-700 mt-2 line-clamp-2">{appeal.description}</p>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(appeal.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <button onClick={() => { setSelectedAppeal(appeal); setNotes(appeal.lecturer_notes || '') }}
                        className="text-white font-semibold px-4 py-2 rounded-xl text-sm flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #6a1b9a, #9c27b0)' }}>
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviewed appeals */}
          {reviewed.length > 0 && (
            <div className="nexus-card p-6">
              <h2 className="text-lg font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
                Reviewed ({reviewed.length})
              </h2>
              <div className="space-y-3">
                {reviewed.map(appeal => {
                  const cfg = statusCfg[appeal.status]
                  return (
                    <div key={appeal.id} className="flex items-center gap-4 p-4 rounded-xl border" style={{ borderColor: '#e0e0ef' }}>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{appeal.student?.full_name} — {appeal.disability_type}</div>
                        {appeal.unit && <div className="text-xs text-gray-500">{appeal.unit.code}</div>}
                      </div>
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.icon} {appeal.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
