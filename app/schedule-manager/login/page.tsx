'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function ScheduleManagerLogin() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await signIn('schedule-manager-login', {
      email: form.email.trim().toLowerCase(),
      password: form.password,
      redirect: false,
    })
    setLoading(false)
    if (res?.ok) {
      toast.success('Welcome, Schedule Manager!')
      router.push('/schedule-manager/dashboard')
    } else {
      toast.error('Invalid credentials or unauthorized role.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0d47a1, #1565c0, #0288d1)' }}>
      <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
            style={{ background: 'linear-gradient(135deg, #0d47a1, #0288d1)' }}>
            📋
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0d47a1' }}>
            Schedule Manager
          </h1>
          <p className="text-gray-500 text-sm mt-1">MKU NEXUS Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="nexus-label">Email Address</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="nexus-input" placeholder="manager@mku.ac.ke" required />
          </div>
          <div>
            <label className="nexus-label">Password</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="nexus-input" placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-2xl font-bold text-white disabled:opacity-60 transition-all"
            style={{ background: 'linear-gradient(135deg, #0d47a1, #0288d1)' }}>
            {loading ? 'Signing in...' : '🔐 Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Schedule Manager accounts are created by the System Administrator.
        </p>
      </div>
    </div>
  )
}
