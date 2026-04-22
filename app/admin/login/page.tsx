'use client'
import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

const ADMIN_STATS = [
  { icon: '👥', label: 'Users Managed', value: '500+' },
  { icon: '📅', label: 'Timetable Entries', value: '30+' },
  { icon: '🛡️', label: 'Secure Access', value: '24/7' },
  { icon: '🏛️', label: 'Departments', value: '7' },
]

const FLOATING_ITEMS = [
  { emoji: '🛡️', x: 7, y: 12, delay: 0 },
  { emoji: '⚙️', x: 88, y: 8, delay: 0.7 },
  { emoji: '📊', x: 10, y: 82, delay: 1.2 },
  { emoji: '🏛️', x: 90, y: 78, delay: 1.8 },
  { emoji: '🔐', x: 48, y: 4, delay: 0.4 },
  { emoji: '📋', x: 4, y: 50, delay: 1.5 },
]

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [activeStat, setActiveStat] = useState(0)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [isScheduleManager, setIsScheduleManager] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const t = setInterval(() => setActiveStat(p => (p + 1) % ADMIN_STATS.length), 2500)
    return () => clearInterval(t)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const provider = isScheduleManager ? 'schedule-manager-login' : 'admin-login'
      const result = await signIn(provider, { email, password, redirect: false })
      if (result?.ok) {
        if (isScheduleManager) {
          toast.success('Welcome, Schedule Manager! ✅')
          router.push('/schedule-manager/dashboard')
        } else {
          toast.success('Welcome, Administrator! ✅')
          router.push('/admin/dashboard')
        }
      } else {
        toast.error(isScheduleManager ? 'Invalid schedule manager credentials.' : 'Invalid admin credentials.')
      }
    } catch {
      toast.error('Connection error.')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!forgotEmail) { toast.error('Please enter your email'); return }
    setForgotLoading(true)
    try {
      const requestedRole = isScheduleManager ? 'schedule_manager' : 'admin'
      const res = await fetch('/api/help/password-reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, role: requestedRole }),
      })
      const data = await res.json()
      if (data.success) setForgotSent(true)
      else toast.error(data.error || 'Failed to send request')
    } catch { toast.error('Connection error') }
    finally { setForgotLoading(false) }
  }

  if (forgotMode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 50%, #166534 100%)' }}>
        <div className="w-full max-w-md">
          <div className="rounded-2xl p-8 shadow-2xl" style={{ background: 'rgba(255,255,255,0.97)' }}>
            <button onClick={() => { setForgotMode(false); setForgotSent(false) }}
              className="flex items-center gap-2 text-sm mb-6 hover:opacity-70 transition-opacity" style={{ color: '#14532d', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Back to sign in
            </button>
            {forgotSent ? (
              <div className="text-center py-4">
                <div className="text-6xl mb-4 animate-bounce">📧</div>
                <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Playfair Display, serif', color: '#14532d' }}>Request Sent!</h2>
                <p className="text-gray-600 text-sm mb-4">{isScheduleManager ? 'Schedule Manager' : 'Admin'} password reset request received for <strong>{forgotEmail}</strong>.</p>
                <button onClick={() => { setForgotMode(false); setForgotSent(false) }} className="btn-primary">Back to Sign In</button>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-4">🔑</div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#14532d' }}>Reset Password</h2>
                <p className="text-gray-500 text-sm mb-6">Enter your {isScheduleManager ? 'schedule manager' : 'admin'} email to request a reset link.</p>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="nexus-label">{isScheduleManager ? 'Schedule Manager Email' : 'Admin Email'}</label>
                    <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                      placeholder={isScheduleManager ? 'manager@mku.ac.ke' : 'admin@mku.ac.ke'} className="nexus-input" required />
                  </div>
                  <button type="submit" disabled={forgotLoading} className="btn-primary w-full justify-center py-3 disabled:opacity-60">
                    {forgotLoading ? 'Sending...' : '📧 Send Reset Request'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 50%, #166534 100%)' }}>
      {mounted && FLOATING_ITEMS.map((item, i) => (
        <div key={i} className="absolute pointer-events-none" style={{
          left: `${item.x}%`, top: `${item.y}%`, fontSize: '2rem', opacity: 0.12,
          animation: `float ${4 + i * 0.5}s ease-in-out ${item.delay}s infinite alternate`,
        }}>{item.emoji}</div>
      ))}

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #86efac, transparent)', transform: 'translate(30%,-30%)' }} />
        <div className="relative z-10 text-center max-w-md">
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-xl"
              style={{ background: 'linear-gradient(135deg, #16a34a, #4ade80)' }}>N</div>
            <div className="text-left">
              <div className="text-white font-bold text-xl" style={{ fontFamily: 'Playfair Display, serif' }}>MKU NEXUS</div>
              <div className="text-green-300 text-xs">Administration Portal</div>
            </div>
          </div>

          {/* Shield with pulsing ring */}
          <div className="relative w-44 h-44 mx-auto mb-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: '#4ade80' }} />
            <div className="absolute inset-4 rounded-full animate-pulse opacity-30" style={{ background: '#22c55e' }} />
            <div className="relative w-32 h-32 rounded-full flex items-center justify-center text-7xl shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>🛡️</div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>Admin Portal</h1>
          <p className="text-green-200 text-base mb-8">System administration — secure, monitored, and fully controlled access.</p>

          {/* Cycling stats */}
          <div className="relative h-20 mb-4">
            {ADMIN_STATS.map((stat, i) => (
              <div key={i} className={`absolute inset-0 flex items-center justify-center gap-4 transition-all duration-500 ${i === activeStat ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '12px 24px' }}>
                <span className="text-3xl">{stat.icon}</span>
                <div className="text-left">
                  <div className="text-white font-bold text-2xl">{stat.value}</div>
                  <div className="text-green-300 text-sm">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 mt-4">
            {[
              { icon: '👥', text: 'User management & role control' },
              { icon: '📅', text: 'Full timetable administration' },
              { icon: '🛟', text: 'Help requests & password resets' },
              { icon: '🧠', text: 'AI training data per semester' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#bbf7d0' }}>
                <span className="text-lg">{f.icon}</span><span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="rounded-3xl p-8 shadow-2xl" style={{ background: 'rgba(255,255,255,0.97)' }}>
            <Link href="/welcome" className="flex items-center gap-2 text-sm mb-6 hover:opacity-70" style={{ color: '#16a34a', textDecoration: 'none' }}>
              ← Portal selection
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-semibold"
              style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>
              🛡️ Restricted Access — All actions logged
            </div>
            <h2 className="text-3xl font-bold mb-1.5" style={{ fontFamily: 'Playfair Display, serif', color: '#14532d' }}>
              {isScheduleManager ? 'Schedule Manager Sign In' : 'Admin Sign In'}
            </h2>
            <p className="text-gray-500 text-sm mb-7">
              {isScheduleManager ? 'Schedule Manager access — use your schedule manager credentials.' : 'Authorized personnel only. Sessions are monitored.'}
            </p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="nexus-label">{isScheduleManager ? 'Schedule Manager Email' : 'Admin Email'}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={isScheduleManager ? 'manager@mku.ac.ke' : 'admin@mku.ac.ke'} className="nexus-input" required />
              </div>
              <div>
                <label className="nexus-label">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Enter admin password" className="nexus-input pr-12" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-lg"
                    tabIndex={-1}>{showPassword ? '🙈' : '👁️'}</button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={isScheduleManager} onChange={e => setIsScheduleManager(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                  Schedule Manager
                </label>
                <button type="button" onClick={() => setForgotMode(true)}
                  className="text-sm hover:underline" style={{ color: '#14532d', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Forgot password?
                </button>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-base disabled:opacity-60 transition-all hover:shadow-lg"
                style={{ background: loading ? '#9ca3af' : 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)' }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : isScheduleManager ? '📋 Sign In as Schedule Manager' : '🛡️ Sign In to Admin Portal'}
              </button>
            </form>

            {/* Security notice */}
            <div className="mt-5 p-3 rounded-xl text-xs flex items-start gap-2" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
              <span className="text-base">🔒</span>
              <span>This portal is restricted to system administrators. All login attempts are recorded and monitored.</span>
            </div>

            <p className="text-center text-sm text-gray-400 mt-5">
              Wrong portal?{' '}
              <Link href="/student/login" style={{ color: '#1a237e', fontWeight: 600 }}>Student</Link>
              {' '}·{' '}
              <Link href="/lecturer/login" style={{ color: '#6a1b9a', fontWeight: 600 }}>Lecturer</Link>
            </p>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes float { from { transform: translateY(0) rotate(-5deg); } to { transform: translateY(-18px) rotate(5deg); } }
      `}</style>
    </div>
  )
}
