'use client'
import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

const FLOATING_ITEMS = [
  { emoji: '📚', x: 8, y: 12, delay: 0, size: 2.2 },
  { emoji: '🎓', x: 88, y: 8, delay: 0.5, size: 2.8 },
  { emoji: '✏️', x: 15, y: 78, delay: 1, size: 2 },
  { emoji: '🔬', x: 92, y: 72, delay: 1.5, size: 2.4 },
  { emoji: '💡', x: 50, y: 5, delay: 0.8, size: 2 },
  { emoji: '🏛️', x: 5, y: 50, delay: 1.2, size: 2.2 },
  { emoji: '📝', x: 95, y: 40, delay: 0.3, size: 1.8 },
  { emoji: '🌍', x: 70, y: 90, delay: 1.8, size: 2.5 },
]

const STUDENT_AVATARS = [
  { bg: 'from-blue-400 to-indigo-600', emoji: '👩‍🎓', name: 'Sarah K.', course: 'BBM' },
  { bg: 'from-purple-400 to-pink-600', emoji: '👨‍🎓', name: 'James M.', course: 'BAF' },
  { bg: 'from-green-400 to-teal-600', emoji: '👩‍💻', name: 'Grace N.', course: 'BJL' },
  { bg: 'from-orange-400 to-red-500', emoji: '👨‍🔬', name: 'David O.', course: 'BJS' },
]

export default function StudentLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [activeAvatar, setActiveAvatar] = useState(0)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => setActiveAvatar(p => (p + 1) % STUDENT_AVATARS.length), 3000)
    return () => clearInterval(timer)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { toast.error('Please fill in all fields'); return }
    setLoading(true)
    try {
      const result = await signIn('student-login', { email, password, redirect: false })
      if (result?.ok) {
        toast.success('Welcome back! 🎓')
        router.push('/student/dashboard')
      } else {
        toast.error('Invalid email or password.')
      }
    } catch { toast.error('Connection error. Please try again.') }
    finally { setLoading(false) }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!forgotEmail) { toast.error('Please enter your email'); return }
    setForgotLoading(true)
    try {
      const res = await fetch('/api/help/password-reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, role: 'student' }),
      })
      const data = await res.json()
      if (data.success) setForgotSent(true)
      else toast.error(data.error || 'Failed to send request')
    } catch { toast.error('Connection error') }
    finally { setForgotLoading(false) }
  }

  if (forgotMode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0d1457 0%, #1a237e 50%, #1565c0 100%)' }}>
        <div className="w-full max-w-md">
          <div className="rounded-2xl p-8 shadow-2xl" style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}>
            <button onClick={() => { setForgotMode(false); setForgotSent(false) }}
              className="flex items-center gap-2 text-sm mb-6 hover:opacity-70 transition-opacity" style={{ color: '#1a237e', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Back to sign in
            </button>
            {forgotSent ? (
              <div className="text-center py-4">
                <div className="text-6xl mb-4 animate-bounce">📧</div>
                <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>Request Sent!</h2>
                <p className="text-gray-600 text-sm mb-4">Admin will email a reset link to <strong>{forgotEmail}</strong> within 24 hours.</p>
                <button onClick={() => { setForgotMode(false); setForgotSent(false) }} className="btn-primary">Back to Sign In</button>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-4">🔑</div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>Reset Password</h2>
                <p className="text-gray-500 text-sm mb-6">Enter your student email to request a reset link.</p>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="nexus-label">Student Email</label>
                    <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                      placeholder="your.email@students.mku.ac.ke" className="nexus-input" required />
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
    <div className="min-h-screen flex overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d1457 0%, #1a237e 50%, #283593 100%)' }}>
      {/* Floating emoji background */}
      {mounted && FLOATING_ITEMS.map((item, i) => (
        <div key={i} className="absolute pointer-events-none select-none"
          style={{
            left: `${item.x}%`, top: `${item.y}%`,
            fontSize: `${item.size}rem`,
            opacity: 0.15,
            animation: `float ${4 + i * 0.5}s ease-in-out ${item.delay}s infinite alternate`,
          }}>
          {item.emoji}
        </div>
      ))}

      {/* Left panel — art & branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #60a5fa, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #818cf8, transparent)', transform: 'translate(-30%, 30%)' }} />

        <div className="relative z-10 text-center max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-xl"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>N</div>
            <div className="text-left">
              <div className="text-white font-bold text-xl" style={{ fontFamily: 'Playfair Display, serif' }}>MKU NEXUS</div>
              <div className="text-blue-300 text-xs">Academic Intelligence Platform</div>
            </div>
          </div>

          {/* Rotating student avatars */}
          <div className="relative w-56 h-56 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', border: '2px dashed rgba(255,255,255,0.2)', animation: 'spin 20s linear infinite' }} />
            {STUDENT_AVATARS.map((av, i) => (
              <div key={i} className={`absolute inset-8 rounded-full flex flex-col items-center justify-center transition-all duration-700 ${i === activeAvatar ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
                style={{ background: `linear-gradient(135deg, ${av.bg.replace('from-','').replace(' to-',', ')})` }}>
                <div className="text-5xl mb-1">{av.emoji}</div>
                <div className="text-white font-bold text-sm">{av.name}</div>
                <div className="text-white/70 text-xs">{av.course} Student</div>
              </div>
            ))}
            {/* Dots */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {STUDENT_AVATARS.map((_, i) => (
                <div key={i} className="rounded-full transition-all duration-300"
                  style={{ width: i === activeAvatar ? '20px' : '8px', height: '8px', background: i === activeAvatar ? '#60a5fa' : 'rgba(255,255,255,0.3)' }} />
              ))}
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-3 mt-8" style={{ fontFamily: 'Playfair Display, serif' }}>Student Portal</h1>
          <p className="text-blue-200 text-base mb-8 leading-relaxed">
            Your complete academic companion — timetables, materials, events and AI support all in one place.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '📅', text: 'Live timetable' },
              { icon: '🤖', text: 'AI assistant' },
              { icon: '📁', text: 'Study materials' },
              { icon: '📊', text: 'Class polls' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#bfdbfe' }}>
                <span className="text-lg">{f.icon}</span><span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="rounded-3xl p-8 shadow-2xl"
            style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(30px)' }}>

            <Link href="/welcome" className="flex items-center gap-2 text-sm mb-6 hover:opacity-70 transition-opacity"
              style={{ color: '#1a237e', textDecoration: 'none' }}>
              ← Portal selection
            </Link>

            {/* Mobile logo */}
            <div className="flex items-center gap-3 mb-6 lg:hidden">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #1a237e, #3b82f6)' }}>N</div>
              <span className="font-bold text-lg" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>MKU NEXUS</span>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-semibold"
              style={{ background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' }}>
              🎓 Student Access
            </div>
            <h2 className="text-3xl font-bold mb-1.5" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>Welcome back</h2>
            <p className="text-gray-500 text-sm mb-7">Sign in to access your academic dashboard.</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="nexus-label">Student Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your.email@students.mku.ac.ke" className="nexus-input" required />
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
                <button type="button" onClick={() => setForgotMode(true)}
                  className="text-sm hover:underline" style={{ color: '#1a237e', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Forgot password?
                </button>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-base disabled:opacity-60 transition-all hover:shadow-lg active:scale-98"
                style={{ background: loading ? '#9ca3af' : 'linear-gradient(135deg, #1a237e 0%, #3b82f6 100%)' }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : '🎓 Sign In to Student Portal'}
              </button>
            </form>

            {/* Stats strip */}
            <div className="mt-6 pt-5 border-t grid grid-cols-3 gap-3" style={{ borderColor: '#e0e0ef' }}>
              {[{ n: '30+', l: 'Active Units' }, { n: '7', l: 'Departments' }, { n: '24/7', l: 'AI Support' }].map(s => (
                <div key={s.l} className="text-center">
                  <div className="font-bold text-sm" style={{ color: '#1a237e' }}>{s.n}</div>
                  <div className="text-xs text-gray-400">{s.l}</div>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-gray-400 mt-4">
              Not a student?{' '}
              <Link href="/lecturer/login" style={{ color: '#6a1b9a', fontWeight: 600 }}>Lecturer</Link>
              {' '}·{' '}
              <Link href="/admin/login" style={{ color: '#2e7d32', fontWeight: 600 }}>Admin</Link>
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes float {
          from { transform: translateY(0px) rotate(-5deg); }
          to   { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
