'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import { UserRole } from '@/types'
import toast from 'react-hot-toast'

interface Appeal {
  id: string; disability_type: string; description: string; status: string
  admin_notes?: string; lecturer_notes?: string; created_at: string
  student?: { full_name: string; student_id: string; is_disabled: boolean; disability_type?: string }
  unit?: { code: string; name: string }
  current_venue?: { room_number: string; name: string; floor_number: number; building?: { name: string; has_lift: boolean } }
  requested_venue?: { room_number: string; name: string; building?: { name: string; has_lift: boolean } }
}

const statusTabs = ['all', 'pending', 'under_review', 'approved', 'rejected'] as const
const statusCfg: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: '#e65100', bg: '#fff3e0', label: '⏳ Pending' },
  under_review: { color: '#1565c0', bg: '#e3f2fd', label: '🔍 Under Review' },
  approved: { color: '#2e7d32', bg: '#e8f5e9', label: '✅ Approved' },
  rejected: { color: '#c62828', bg: '#ffebee', label: '❌ Rejected' },
}

export default function AdminAppeals() {
  const { data: session } = useSession()
  const [appeals, setAppeals] = useState<Appeal[]>([])
  const [activeTab, setActiveTab] = useState<string>('all')
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadAppeals() }, [])

  async function loadAppeals() {
    const res = await fetch('/api/admin/appeals')
    const data = await res.json()
    if (data.success) setAppeals(data.data)
  }

  async function handleDecision(appealId: string, newStatus: 'approved' | 'rejected') {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/appeals/${appealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, admin_notes: adminNotes }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(newStatus === 'approved' ? 'Appeal approved ✅' : 'Appeal rejected')
        setSelectedAppeal(null)
        setAdminNotes('')
        loadAppeals()
      } else { toast.error(data.error || 'Failed to update appeal') }
    } finally { setSubmitting(false) }
  }

  const role = (session?.user as unknown as { role: UserRole })?.role || 'admin'
  const filtered = activeTab === 'all' ? appeals : appeals.filter(a => a.status === activeTab)
  const counts = {
    all: appeals.length,
    pending: appeals.filter(a => a.status === 'pending').length,
    under_review: appeals.filter(a => a.status === 'under_review').length,
    approved: appeals.filter(a => a.status === 'approved').length,
    rejected: appeals.filter(a => a.status === 'rejected').length,
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role={role} userName={session?.user?.name || ''} userEmail={session?.user?.email || ''} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#2e7d32' }}>
              ♿ Accessibility Appeals
            </h1>
            <p className="text-gray-500 mt-1">Review and resolve student disability accommodation requests</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total', count: counts.all, color: '#1a237e', bg: '#e8eaf6' },
              { label: 'Pending', count: counts.pending, color: '#e65100', bg: '#fff3e0' },
              { label: 'Under Review', count: counts.under_review, color: '#1565c0', bg: '#e3f2fd' },
              { label: 'Approved', count: counts.approved, color: '#2e7d32', bg: '#e8f5e9' },
            ].map(s => (
              <div key={s.label} className="nexus-card p-4" style={{ borderTop: `3px solid ${s.color}` }}>
                <div className="text-xs font-semibold text-gray-500 uppercase">{s.label}</div>
                <div className="text-2xl font-bold mt-1" style={{ color: s.color, fontFamily: 'Playfair Display, serif' }}>{s.count}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {statusTabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors"
                style={{
                  background: activeTab === tab ? '#2e7d32' : '#f0f2ff',
                  color: activeTab === tab ? 'white' : '#444',
                }}>
                {tab.replace('_', ' ')} ({counts[tab]})
              </button>
            ))}
          </div>

          {/* Modal */}
          {selectedAppeal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="nexus-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-lg" style={{ fontFamily: 'Playfair Display, serif', color: '#2e7d32' }}>
                    Admin Decision
                  </h3>
                  <button onClick={() => { setSelectedAppeal(null); setAdminNotes('') }} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                  <div className="p-3 rounded-xl" style={{ background: '#f8f9ff' }}>
                    <div className="text-xs text-gray-500 mb-1">Student</div>
                    <div className="font-semibold">{selectedAppeal.student?.full_name}</div>
                    <div className="text-xs text-gray-400">ID: {selectedAppeal.student?.student_id}</div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: '#f8f9ff' }}>
                    <div className="text-xs text-gray-500 mb-1">Disability Type</div>
                    <div className="font-semibold">{selectedAppeal.disability_type}</div>
                  </div>
                  {selectedAppeal.unit && (
                    <div className="p-3 rounded-xl" style={{ background: '#f8f9ff' }}>
                      <div className="text-xs text-gray-500 mb-1">Affected Unit</div>
                      <div className="font-semibold">{selectedAppeal.unit.code} — {selectedAppeal.unit.name}</div>
                    </div>
                  )}
                  {selectedAppeal.current_venue && (
                    <div className="p-3 rounded-xl" style={{ background: '#fff8f0' }}>
                      <div className="text-xs text-orange-700 font-semibold mb-1">Current Venue</div>
                      <div>{selectedAppeal.current_venue.room_number}, {selectedAppeal.current_venue.building?.name}</div>
                      <div className="text-xs mt-1" style={{ color: selectedAppeal.current_venue.building?.has_lift ? '#2e7d32' : '#c62828' }}>
                        {selectedAppeal.current_venue.building?.has_lift ? '♿ Has lift' : `♿ No lift · Floor ${selectedAppeal.current_venue.floor_number}`}
                      </div>
                    </div>
                  )}
                  {selectedAppeal.requested_venue && (
                    <div className="p-3 rounded-xl" style={{ background: '#f0fff4' }}>
                      <div className="text-xs text-green-700 font-semibold mb-1">Requested Venue</div>
                      <div>{selectedAppeal.requested_venue.room_number}, {selectedAppeal.requested_venue.building?.name}</div>
                      <div className="text-xs mt-1" style={{ color: '#2e7d32' }}>
                        ♿ {selectedAppeal.requested_venue.building?.has_lift ? 'Has lift' : 'Ground floor accessible'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl mb-4" style={{ background: '#f8f9ff' }}>
                  <div className="text-xs text-gray-500 mb-1">Student Description</div>
                  <p className="text-sm">{selectedAppeal.description}</p>
                </div>

                {selectedAppeal.lecturer_notes && (
                  <div className="p-3 rounded-xl mb-4" style={{ background: '#f3e5f5' }}>
                    <div className="text-xs font-semibold mb-1" style={{ color: '#6a1b9a' }}>Lecturer Assessment</div>
                    <p className="text-sm">{selectedAppeal.lecturer_notes}</p>
                  </div>
                )}

                <div className="mb-5">
                  <label className="nexus-label">Admin Decision Notes</label>
                  <textarea className="nexus-input" rows={3} value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    placeholder="Explain your decision, any conditions, alternative arrangements..." />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => handleDecision(selectedAppeal.id, 'approved')}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #2e7d32, #43a047)' }}>
                    ✅ Approve
                  </button>
                  <button onClick={() => handleDecision(selectedAppeal.id, 'rejected')}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #c62828, #e53935)' }}>
                    ❌ Reject
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* List */}
          <div className="nexus-card p-6">
            <h2 className="text-lg font-bold mb-5" style={{ fontFamily: 'Playfair Display, serif', color: '#2e7d32' }}>
              {activeTab === 'all' ? 'All Appeals' : `${activeTab.replace('_', ' ')} Appeals`} ({filtered.length})
            </h2>
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <p>No appeals in this category</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map(appeal => {
                  const cfg = statusCfg[appeal.status]
                  return (
                    <div key={appeal.id} className="p-5 rounded-xl border" style={{ borderColor: '#e0e0ef' }}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold">{appeal.student?.full_name}</span>
                            <span className="badge badge-gray text-xs">{appeal.student?.student_id}</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                          </div>
                          <div className="text-sm text-gray-600">{appeal.disability_type}</div>
                          {appeal.unit && <div className="text-xs text-gray-400 mt-0.5">Unit: {appeal.unit.code}</div>}
                          <p className="text-sm text-gray-500 mt-2 line-clamp-2">{appeal.description}</p>
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(appeal.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                        {(appeal.status === 'pending' || appeal.status === 'under_review') && (
                          <button onClick={() => { setSelectedAppeal(appeal); setAdminNotes(appeal.admin_notes || '') }}
                            className="text-white font-semibold px-4 py-2 rounded-xl text-sm flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #2e7d32, #43a047)' }}>
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
