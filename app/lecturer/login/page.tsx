'use client'
import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

const LECTURER_AVATARS = [
  { bg: '#6a1b9a, #9c27b0', emoji: '👩‍🏫', name: 'Dr. Wanjiku', dept: 'Business Mgmt' },
  { bg: '#4a0072, #7b1fa2', emoji: '👨‍💼', name: 'Prof. Otieno', dept: 'Finance & Acct' },
  { bg: '#880e4f, #e91e63', emoji: '👩‍🔬', name: 'Dr. Njoki', dept: 'Journalism' },
  { bg: '#1a237e, #3949ab', emoji: '👨‍🏫', name: 'Dr. Kamau', dept: 'Law' },
]

const FLOATING_ITEMS = [
  { emoji: '📖', x: 6, y: 15, delay: 0 },
  { emoji: '🎯', x: 90, y: 10, delay: 0.6 },
  { emoji: '📊', x: 12, y: 80, delay: 1.1 },
  { emoji: '🏆', x: 88, y: 75, delay: 1.7 },
  { emoji: '💼', x: 50, y: 5, delay: 0.4 },
  { emoji: '📐', x: 3, y: 50, delay: 1.3 },
]

export default function LecturerLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [helpMode, setHelpMode] = useState(false)
  const [helpForm, setHelpForm] = useState({ name: '', email: '', description: '' })
  const [helpLoading, setHelpLoading] = useState(false)
  const [helpSent, setHelpSent] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [activeAvatar, setActiveAvatar] = useState(0)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const t = setInterval(() => setActiveAvatar(p => (p + 1) % LECTURER_AVATARS.length), 3200)
    return () => clearInterval(t)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await signIn('lecturer-login', { email, password, redirect: false })
      if (result?.ok) { toast.success('Welcome, Lecturer! 👨‍🏫'); router.push('/lecturer/dashboard') }
      else toast.error('Invalid credentials for lecturer portal.')
    } catch { toast.error('Connection error.') }
    finally { setLoading(false) }
  }

  async function handleHelpSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!helpForm.email || !helpForm.description) { toast.error('Fill in all required fields'); return }
    setHelpLoading(true)
    try {
      const res = await fetch('/api/help/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...helpForm, role: 'lecturer', request_type: 'password_reset', subject: 'Password Reset — Lecturer Account' }),
      })
      const data = await res.json()
      if (data.success) setHelpSent(true)
      else toast.error(data.error || 'Failed')
    } catch { toast.error('Connection error') }
    finally { setHelpLoading(false) }
  }

  if (helpMode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #1a0033 0%, #4a0072 50%, #6a1b9a 100%)' }}>
        <div className="w-full max-w-md rounded-3xl p-8 shadow-2xl" style={{ background: 'rgba(255,255,255,0.97)' }}>
          <button onClick={() => { setHelpMode(false); setHelpSent(false) }}
            className="flex items-center gap-2 text-sm mb-6 hover:opacity-70" style={{ color: '#6a1b9a', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Back to sign in
          </button>
          {helpSent ? (
            <div className="text-center py-4">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Playfair Display, serif', color: '#4a0072' }}>Request Submitted!</h2>
              <p className="text-gray-600 text-sm mb-2">Admin will review and send a secure reset link to <strong>{helpForm.email}</strong>.</p>
              <p className="text-gray-400 text-xs">Usually within 24 hours · Link expires after 2 hours</p>
              <button onClick={() => { setHelpMode(false); setHelpSent(false) }} className="btn-primary mt-5">Back to Sign In</button>
            </div>
          ) : (
            <>
              <div className="text-4xl mb-3">🛟</div>
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#4a0072' }}>Contact Help Centre</h2>
              <p className="text-gray-500 text-sm mb-6">Lecturer passwords require admin approval to reset for security reasons.</p>
              <form onSubmit={handleHelpSubmit} className="space-y-4">
                <div>
                  <label className="nexus-label">Full Name *</label>
                  <input value={helpForm.name} onChange={e => setHelpForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="As in the system" className="nexus-input" required />
                </div>
                <div>
                  <label className="nexus-label">Institutional Email *</label>
                  <input type="email" value={helpForm.email} onChange={e => setHelpForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="yourname@mku.ac.ke" className="nexus-input" required />
                </div>
                <div>
                  <label className="nexus-label">Describe Your Situation *</label>
                  <textarea value={helpForm.description} onChange={e => setHelpForm(f => ({ ...f, description: e.target.value }))}
                    className="nexus-input" rows={3} placeholder="e.g. forgot password, account locked..." required />
                </div>
                <button type="submit" disabled={helpLoading}
                  className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #4a0072, #6a1b9a)' }}>
                  {helpLoading ? 'Submitting...' : '🛟 Submit Request'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0033 0%, #4a0072 50%, #6a1b9a 100%)' }}>
      {mounted && FLOATING_ITEMS.map((item, i) => (
        <div key={i} className="absolute pointer-events-none" style={{
          left: `${item.x}%`, top: `${item.y}%`, fontSize: '2rem', opacity: 0.12,
          animation: `float ${4 + i * 0.5}s ease-in-out ${item.delay}s infinite alternate`,
        }}>{item.emoji}</div>
      ))}

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #e879f9, transparent)', transform: 'translate(30%,-30%)' }} />
        <div className="relative z-10 text-center max-w-md">
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-xl"
              style={{ background: 'linear-gradient(135deg, #9333ea, #c026d3)' }}>N</div>
            <div className="text-left">
              <div className="text-white font-bold text-xl" style={{ fontFamily: 'Playfair Display, serif' }}>MKU NEXUS</div>
              <div className="text-purple-300 text-xs">Faculty Management Platform</div>
            </div>
          </div>

          {/* Lecturer avatars */}
          <div className="relative w-52 h-52 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full" style={{ border: '2px dashed rgba(255,255,255,0.2)', animation: 'spin 25s linear infinite' }} />
            {LECTURER_AVATARS.map((av, i) => (
              <div key={i} className={`absolute inset-8 rounded-full flex flex-col items-center justify-center transition-all duration-700 ${i === activeAvatar ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
                style={{ background: `linear-gradient(135deg, ${av.bg})` }}>
                <div className="text-5xl mb-1">{av.emoji}</div>
                <div className="text-white font-bold text-sm">{av.name}</div>
                <div className="text-white/70 text-xs">{av.dept}</div>
              </div>
            ))}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {LECTURER_AVATARS.map((_, i) => (
                <div key={i} className="rounded-full transition-all duration-300"
                  style={{ width: i === activeAvatar ? '20px' : '8px', height: '8px', background: i === activeAvatar ? '#d946ef' : 'rgba(255,255,255,0.3)' }} />
              ))}
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-3 mt-8" style={{ fontFamily: 'Playfair Display, serif' }}>Lecturer Portal</h1>
          <p className="text-purple-200 text-base mb-7">Manage units, engage students, post polls and track learning outcomes.</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '📤', text: 'Upload materials' },
              { icon: '📊', text: 'Create polls' },
              { icon: '📅', text: 'Manage timetable' },
              { icon: '♿', text: 'Review appeals' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#e9d5ff' }}>
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
            <Link href="/welcome" className="flex items-center gap-2 text-sm mb-6 hover:opacity-70" style={{ color: '#6a1b9a', textDecoration: 'none' }}>
              ← Portal selection
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-semibold"
              style={{ background: '#f3e5f5', color: '#6a1b9a', border: '1px solid #ce93d8' }}>
              👨‍🏫 Faculty Access
            </div>
            <h2 className="text-3xl font-bold mb-1.5" style={{ fontFamily: 'Playfair Display, serif', color: '#4a0072' }}>Lecturer Sign In</h2>
            <p className="text-gray-500 text-sm mb-7">Access your faculty dashboard and teaching tools.</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="nexus-label">Institutional Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="yourname@mku.ac.ke" className="nexus-input" required />
              </div>
              <div>
                <label className="nexus-label">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password" className="nexus-input pr-12" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-lg"
                    tabIndex={-1}>{showPassword ? '🙈' : '👁️'}</button>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => setHelpMode(true)}
                  className="text-sm hover:underline" style={{ color: '#6a1b9a', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Forgot password? Contact Help Centre
                </button>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-base disabled:opacity-60 transition-all hover:shadow-lg"
                style={{ background: loading ? '#9ca3af' : 'linear-gradient(135deg, #4a0072 0%, #9333ea 100%)' }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : '👨‍🏫 Sign In to Lecturer Portal'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t grid grid-cols-3 gap-3" style={{ borderColor: '#f3e5f5' }}>
              {[{ n: '30+', l: 'Units' }, { n: '7', l: 'Departments' }, { n: 'AI', l: 'Powered' }].map(s => (
                <div key={s.l} className="text-center">
                  <div className="font-bold text-sm" style={{ color: '#4a0072' }}>{s.n}</div>
                  <div className="text-xs text-gray-400">{s.l}</div>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-gray-400 mt-4">
              Not a lecturer?{' '}
              <Link href="/student/login" style={{ color: '#1a237e', fontWeight: 600 }}>Student</Link>
              {' '}·{' '}
              <Link href="/admin/login" style={{ color: '#2e7d32', fontWeight: 600 }}>Admin</Link>
            </p>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes float { from { transform: translateY(0) rotate(-5deg); } to { transform: translateY(-18px) rotate(5deg); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
