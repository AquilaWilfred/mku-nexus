'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

export default function DeactivatedBanner() {
  const { data: session } = useSession()
  const user = session?.user as any
  const isActive = user?.is_active !== false

  const [showForm, setShowForm] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (isActive) return null

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    if (reason.trim().length < 10) {
      toast.error('Please provide a detailed reason (at least 10 characters)')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/activation-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Reactivation request sent to admin! ✅')
        setSubmitted(true)
        setShowForm(false)
      } else {
        toast.error(data.error || 'Failed to send request')
      }
    } catch {
      toast.error('Connection error')
    }
    setSubmitting(false)
  }

  return (
    <>
      {/* Sticky deactivation banner */}
      <div className="sticky top-0 z-40 w-full px-4 py-3 flex items-center gap-3 flex-wrap"
        style={{ background: '#c62828', color: 'white' }}>
        <span className="text-xl">🔒</span>
        <div className="flex-1">
          <span className="font-bold text-sm">Account Deactivated — </span>
          <span className="text-sm opacity-90">
            Your account has been deactivated. You cannot make requests, register units, or receive updates.
          </span>
        </div>
        {!submitted ? (
          <button onClick={() => setShowForm(true)}
            className="px-4 py-1.5 rounded-xl text-sm font-bold bg-white text-red-700 hover:bg-red-50 flex-shrink-0">
            Request Reactivation
          </button>
        ) : (
          <span className="px-4 py-1.5 rounded-xl text-sm font-bold bg-white/20 text-white flex-shrink-0">
            ✅ Request Sent — Awaiting Admin Review
          </span>
        )}
      </div>

      {/* Reactivation request form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#c62828' }}>
                  🔓 Request Account Reactivation
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Explain why your account should be reactivated. Admin will review your request.
                </p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-2xl text-gray-400 hover:text-gray-700">×</button>
            </div>

            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="nexus-label">Reason for Reactivation *</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)}
                  className="nexus-input" rows={4}
                  placeholder="Explain why you believe your account should be reactivated. Be specific about your situation..."
                  required />
                <p className="text-xs text-gray-400 mt-1">{reason.length} characters (minimum 10)</p>
              </div>

              <div className="p-3 rounded-xl text-xs" style={{ background: '#fff3e0', color: '#e65100' }}>
                ⚠️ Only the System Administrator can reactivate your account. You will receive a notification when reviewed.
              </div>

              <button type="submit" disabled={submitting || reason.trim().length < 10}
                className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #c62828, #d32f2f)' }}>
                {submitting ? 'Sending...' : '📤 Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
