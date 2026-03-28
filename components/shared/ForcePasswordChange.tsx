'use client'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import toast from 'react-hot-toast'

interface Props { userRole: string }

export default function ForcePasswordChange({ userRole }: Props) {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (done) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (newPassword !== confirm) { toast.error('Passwords do not match'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        setDone(true)
        toast.success('✅ Password changed! Signing you in again...')
        // Sign out and redirect to login so JWT is refreshed without must_change_password
        setTimeout(() => signOut({ callbackUrl: `/${userRole}/login` }), 1800)
      } else {
        toast.error(data.error || 'Failed to change password')
      }
    } catch {
      toast.error('Connection error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    // Blocks all interaction beneath
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        style={{ border: '3px solid #1a237e' }}>
        <div className="p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🔐</div>
            <h2 className="text-xl md:text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
              Set Your Password
            </h2>
            <p className="text-gray-500 mt-2 text-sm">
              Your account was set up by an administrator. Please choose a personal password before continuing.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
              <input type="password" className="nexus-input" placeholder="Minimum 6 characters"
                value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} autoFocus />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
              <input type="password" className="nexus-input" placeholder="Repeat your password"
                value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>

            {newPassword && confirm && newPassword !== confirm && (
              <p className="text-red-500 text-sm">⚠️ Passwords do not match</p>
            )}

            {/* Password strength */}
            {newPassword.length > 0 && (
              <div className="flex gap-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-1 flex-1 rounded-full"
                    style={{ background: newPassword.length >= i * 2 ? (newPassword.length >= 8 ? '#2e7d32' : '#f59e0b') : '#e0e0ef' }} />
                ))}
                <span className="text-xs text-gray-400 ml-2">
                  {newPassword.length < 6 ? 'Too short' : newPassword.length < 8 ? 'Fair' : 'Good'}
                </span>
              </div>
            )}

            <button type="submit" disabled={submitting || !newPassword || !confirm}
              className="w-full text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg, #1a237e, #3949ab)' }}>
              {submitting ? '⏳ Saving...' : '🔒 Set Password & Continue'}
            </button>
          </form>

          <p className="text-xs text-center text-gray-400 mt-4">
            This step is mandatory and cannot be skipped.
          </p>
        </div>
      </div>
    </div>
  )
}
