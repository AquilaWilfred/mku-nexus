'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface HelpRequest {
  id: string; user_email: string; user_role: string; full_name?: string
  subject: string; description: string; request_type: string
  status: string; admin_response?: string; reset_link?: string
  created_at: string; updated_at: string
}

interface ResetPasswordResult {
  tempPassword: string
  message: string
}

const statusColors: Record<string, string> = {
  open: '#e65100', in_progress: '#1a237e', resolved: '#2e7d32', closed: '#616161'
}
const statusLabels: Record<string, string> = {
  open: '🔴 Open', in_progress: '🔵 In Progress', resolved: '✅ Resolved', closed: '⬛ Closed'
}

export default function AdminHelpClient({ requests: initial }: { requests: HelpRequest[] }) {
  const [requests, setRequests] = useState(initial)
  const [selected, setSelected] = useState<HelpRequest | null>(null)
  const [response, setResponse] = useState('')
  const [resetLink, setResetLink] = useState('')
  const [status, setStatus] = useState('in_progress')
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)
  const [tempPassword, setTempPassword] = useState('')
  const [showTempPassword, setShowTempPassword] = useState(false)

  async function loadRequests() {
    const res = await fetch('/api/admin/help')
    const data = await res.json()
    if (data.success) setRequests(data.data)
  }

  function openRequest(r: HelpRequest) {
    setSelected(r)
    setResponse(r.admin_response || '')
    setResetLink(r.reset_link || '')
    setStatus(r.status)
    setTempPassword('')
    setShowTempPassword(false)
  }

  async function handleResetPassword() {
    if (!selected) return
    setResettingPassword(true)
    try {
      const res = await fetch('/api/admin/help/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          helpRequestId: selected.id,
          userEmail: selected.user_email,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('✅ Password reset successfully!')
        setTempPassword(data.tempPassword)
        setShowTempPassword(true)
        setStatus('resolved')
        setResponse(`Password has been reset. Temporary password sent to user.\n\nUser must change password on first login.`)
      } else {
        toast.error(data.error || 'Failed to reset password')
      }
    } catch (error) {
      toast.error('Connection error')
    } finally {
      setResettingPassword(false)
    }
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/help/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_response: response, reset_link: resetLink, status }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Request updated!')
        setSelected(null)
        loadRequests()
      } else { toast.error(data.error || 'Failed') }
    } catch { toast.error('Error') }
    finally { setSaving(false) }
  }

  const filtered = filterStatus ? requests.filter(r => r.status === filterStatus) : requests
  const openCount = requests.filter(r => r.status === 'open').length

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#2e7d32' }}>
              🛟 Help Centre Requests
            </h1>
            <p className="text-gray-500 mt-1">Manage password reset requests and help tickets from lecturers & students</p>
          </div>
          {openCount > 0 && (
            <span className="px-4 py-2 rounded-xl font-bold text-sm" style={{ background: '#fbe9e7', color: '#e65100' }}>
              {openCount} open request{openCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${filterStatus === s ? 'text-white' : 'bg-white text-gray-600 border-gray-200'}`}
              style={{ background: filterStatus === s ? '#2e7d32' : undefined }}>
              {s ? statusLabels[s] : `All (${requests.length})`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="nexus-card p-16 text-center text-gray-400">
            <div className="text-5xl mb-3">🎉</div>
            <p>No help requests. All clear!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <div key={r.id} className="nexus-card p-5 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openRequest(r)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="text-2xl flex-shrink-0">
                      {r.request_type === 'password_reset' ? '🔑' : r.request_type === 'account_issue' ? '👤' : '💬'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-sm">{r.subject}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#f3e5f5', color: '#6a1b9a' }}>
                          {r.user_role}
                        </span>
                        <span className="text-xs" style={{ color: statusColors[r.status] }}>{statusLabels[r.status]}</span>
                      </div>
                      <p className="text-sm text-gray-500">{r.full_name ? `${r.full_name} · ` : ''}{r.user_email}</p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{r.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">Click to respond →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: '#e0e0ef' }}>
              <div>
                <h2 className="font-bold text-lg" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
                  Respond to Request
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">{selected.full_name || selected.user_email} · {selected.user_role}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-xl px-2" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="p-4 rounded-xl" style={{ background: '#f8f9ff' }}>
                <p className="font-semibold text-sm mb-2" style={{ color: '#1a237e' }}>{selected.subject}</p>
                <p className="text-sm text-gray-600">{selected.description}</p>
                <p className="text-xs text-gray-400 mt-2">From: {selected.user_email}</p>
              </div>

              {selected.request_type === 'password_reset' && (
                <>
                  {!showTempPassword ? (
                    <div className="p-4 rounded-xl border-2" style={{ background: '#fff3e0', borderColor: '#ffb74d' }}>
                      <p className="text-sm font-semibold mb-3" style={{ color: '#e65100' }}>🔐 Password Reset Action</p>
                      <p className="text-sm text-gray-600 mb-4">
                        Click the button below to generate a temporary password for this user. They will be notified and must change it on first login.
                      </p>
                      <button
                        type="button"
                        onClick={handleResetPassword}
                        disabled={resettingPassword}
                        className="w-full py-2.5 rounded-xl font-semibold text-white disabled:opacity-60 transition-all"
                        style={{ background: 'linear-gradient(135deg, #d32f2f, #f57c00)' }}
                      >
                        {resettingPassword ? '⏳ Generating...' : '🔑 Generate & Reset Password'}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border-2" style={{ background: '#e8f5e9', borderColor: '#81c784' }}>
                      <p className="text-sm font-semibold mb-3" style={{ color: '#2e7d32' }}>✅ Password Reset Successful</p>
                      <div className="bg-white p-3 rounded-lg mb-3 font-mono text-sm break-all" style={{ background: '#f5f5f5', border: '1px solid #e0e0e0' }}>
                        <div className="text-xs text-gray-500 mb-1">Temporary Password:</div>
                        <div className="text-base font-bold" style={{ color: '#e65100' }}>{tempPassword}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(tempPassword)
                            toast.success('Copied to clipboard!')
                          }}
                          className="flex-1 py-2 rounded-lg font-semibold text-sm"
                          style={{ background: '#2e7d32', color: 'white', border: 'none', cursor: 'pointer' }}
                        >
                          📋 Copy Password
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowTempPassword(false)}
                          className="px-4 py-2 rounded-lg font-semibold text-sm"
                          style={{ background: '#f5f5f5', color: '#333', border: '1px solid #ddd', cursor: 'pointer' }}
                        >
                          Hide
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="nexus-label">Admin Response</label>
                <textarea className="nexus-input" rows={4} value={response} onChange={e => setResponse(e.target.value)}
                  placeholder="Type your reply to the user... (they will see this)" />
              </div>

              <div>
                <label className="nexus-label">Update Status</label>
                <select className="nexus-input" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="open">🔴 Open</option>
                  <option value="in_progress">🔵 In Progress</option>
                  <option value="resolved">✅ Resolved</option>
                  <option value="closed">⬛ Closed</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-white disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #2e7d32, #43a047)' }}>
                  {saving ? '⏳ Saving...' : '✅ Save Response'}
                </button>
                <button onClick={() => setSelected(null)}
                  className="px-5 py-2.5 rounded-xl font-semibold" style={{ background: '#f5f5f5', color: '#333', border: 'none', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
