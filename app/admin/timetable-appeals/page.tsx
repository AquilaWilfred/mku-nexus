'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import toast from 'react-hot-toast'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#e65100', bg: '#fff3e0' },
  under_review: { label: 'Under Review', color: '#1565c0', bg: '#e3f2fd' },
  approved: { label: 'Approved', color: '#2e7d32', bg: '#e8f5e9' },
  rejected: { label: 'Rejected', color: '#c62828', bg: '#ffebee' },
  escalated: { label: 'Escalated', color: '#6a1b9a', bg: '#f3e5f5' },
}

export default function AdminTimetableAppeals() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [appeals, setAppeals] = useState<any[]>([])
  const [activationReqs, setActivationReqs] = useState<any[]>([])
  const [tab, setTab] = useState<'appeals' | 'activation'>('appeals')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)
  const [activationForm, setActivationForm] = useState({ notes: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [appRes, actRes] = await Promise.all([
      fetch('/api/timetable-appeals'),
      fetch('/api/activation-request'),
    ])
    const [appData, actData] = await Promise.all([appRes.json(), actRes.json()])
    if (appData.success) setAppeals(appData.data || [])
    if (actData.success) setActivationReqs(actData.data || [])
    setLoading(false)
  }

  async function handleActivation(id: string, status: 'approved' | 'rejected') {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/activation-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: activationForm.notes }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Request ${status}! User has been notified.`)
        setSelected(null)
        loadAll()
      } else toast.error(data.error || 'Failed')
    } catch { toast.error('Connection error') }
    setSubmitting(false)
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role="admin" userName={user?.name || ''} userEmail={user?.email || ''} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
            📋 Timetable Appeals & Activation Requests
          </h1>
        </div>

        <div className="flex gap-2 mb-5">
          <button onClick={() => setTab('appeals')}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: tab === 'appeals' ? '#1a237e' : 'white', color: tab === 'appeals' ? 'white' : '#1a237e', border: '1.5px solid #1a237e' }}>
            📋 Timetable Appeals ({appeals.length})
          </button>
          <button onClick={() => setTab('activation')}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: tab === 'activation' ? '#1a237e' : 'white', color: tab === 'activation' ? 'white' : '#1a237e', border: '1.5px solid #1a237e' }}>
            🔓 Activation Requests ({activationReqs.filter(r => r.status === 'pending').length} pending)
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : tab === 'appeals' ? (
          <div className="space-y-3">
            {appeals.length === 0 ? (
              <div className="nexus-card p-12 text-center text-gray-400">
                <div className="text-4xl mb-3">📭</div><p>No timetable appeals yet.</p>
              </div>
            ) : appeals.map(appeal => {
              const statusCfg = STATUS_CONFIG[appeal.status] || STATUS_CONFIG.pending
              const unit = appeal.unit as any
              const submitter = appeal.submitter as any
              return (
                <div key={appeal.id} className="nexus-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-gray-800">{unit?.code} — {unit?.name}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
                        <span className="text-xs text-gray-400 capitalize">{appeal.appeal_type.replace('_', ' ')}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">By: {submitter?.full_name} ({appeal.submitter_role})</p>
                      <p className="text-sm text-gray-700 mt-2">{appeal.description?.slice(0, 100)}...</p>
                      {appeal.manager_notes && (
                        <p className="text-xs mt-2 p-2 rounded-lg" style={{ background: '#e8f5e9', color: '#2e7d32' }}>
                          📋 Manager: {appeal.manager_notes}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">{new Date(appeal.created_at).toLocaleDateString('en-KE')}</div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {activationReqs.length === 0 ? (
              <div className="nexus-card p-12 text-center text-gray-400">
                <div className="text-4xl mb-3">🔓</div><p>No activation requests.</p>
              </div>
            ) : activationReqs.map(req => {
              const reqUser = req.user as any
              const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending
              return (
                <div key={req.id} className="nexus-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-sm">{reqUser?.full_name}</span>
                        <span className="text-xs capitalize text-gray-500">{reqUser?.role}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: statusCfg.bg, color: statusCfg.color }}>{req.status}</span>
                      </div>
                      <p className="text-xs text-gray-500">{reqUser?.email}</p>
                      <p className="text-sm text-gray-700 mt-2"><strong>Reason:</strong> {req.reason}</p>
                      {req.admin_notes && (
                        <p className="text-xs mt-1 text-gray-500">Admin notes: {req.admin_notes}</p>
                      )}
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => { setSelected(req); setActivationForm({ notes: '' }) }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                          style={{ background: '#1a237e', color: 'white' }}>
                          Review
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Activation review modal */}
      {selected && tab === 'activation' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
                  🔓 Review Activation Request
                </h2>
                <p className="text-gray-500 text-sm">{(selected.user as any)?.full_name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-2xl text-gray-400 hover:text-gray-700">×</button>
            </div>

            <div className="p-4 rounded-xl mb-4" style={{ background: '#f8f9ff' }}>
              <p className="text-xs text-gray-500 font-semibold uppercase mb-1">User's Reason</p>
              <p className="text-sm text-gray-700">{selected.reason}</p>
            </div>

            <div className="mb-4">
              <label className="nexus-label">Admin Notes (optional)</label>
              <textarea value={activationForm.notes} onChange={e => setActivationForm({ notes: e.target.value })}
                className="nexus-input" rows={2} placeholder="Add notes for the user..." />
            </div>

            <div className="flex gap-3">
              <button onClick={() => handleActivation(selected.id, 'approved')} disabled={submitting}
                className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-60"
                style={{ background: '#2e7d32' }}>
                {submitting ? '...' : '✅ Approve & Reactivate'}
              </button>
              <button onClick={() => handleActivation(selected.id, 'rejected')} disabled={submitting}
                className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-60"
                style={{ background: '#c62828' }}>
                {submitting ? '...' : '❌ Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
