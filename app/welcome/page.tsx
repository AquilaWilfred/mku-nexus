import Link from 'next/link'

export default function WelcomePage() {
  return (
    <div className="min-h-screen nexus-bg flex flex-col">
      {/* Decorative Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="login-orb w-96 h-96 bg-blue-600 top-[-10%] left-[-5%]" />
        <div className="login-orb w-80 h-80 bg-purple-600 top-[20%] right-[-5%]" style={{ animationDelay: '2s' }} />
        <div className="login-orb w-64 h-64 bg-green-600 bottom-[10%] left-[30%]" style={{ animationDelay: '4s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a237e, #6a1b9a)' }}>
            <span className="text-white font-bold text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>S</span>
          </div>
          <div>
            <span className="font-bold text-xl" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>MKU Summit</span>
            <p className="text-xs text-gray-500 leading-none">Smart Academic Platform</p>
          </div>
        </div>
        <div className="text-sm text-gray-500">Mount Kenya University</div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-medium"
            style={{ background: '#e8eaf6', color: '#1a237e', border: '1px solid #c5cae9' }}>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            AI-Powered Campus Intelligence
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
            style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
            Your Campus,
            <br />
            <span style={{ background: 'linear-gradient(135deg, #6a1b9a, #2e7d32)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Intelligently Connected
            </span>
          </h1>

          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-12 leading-relaxed">
            Real-time class updates, AI-powered academic assistant, venue accessibility guides, 
            and seamless communication — all in one platform for MKU.
          </p>

          {/* Portal Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              {
                role: 'Student',
                icon: '🎓',
                description: 'Access classes, materials, timetable & AI assistant',
                href: '/student/login',
                color: '#1a237e',
                bg: '#e8eaf6',
              },
              {
                role: 'Lecturer',
                icon: '👨‍🏫',
                description: 'Manage units, upload materials & post announcements',
                href: '/lecturer/login',
                color: '#6a1b9a',
                bg: '#f3e5f5',
              },
              {
                role: 'Schedule Manager',
                icon: '📋',
                description: 'Review timetable appeals, manage schedules & venues',
                href: '/schedule-manager/login',
                color: '#0d47a1',
                bg: '#e3f2fd',
              },
              {
                role: 'Admin',
                icon: '⚙️',
                description: 'Monitor system, manage users & train AI',
                href: '/admin/login',
                color: '#2e7d32',
                bg: '#e8f5e9',
              },
            ].map((portal) => (
              <Link
                key={portal.role}
                href={portal.href}
                className="nexus-card nexus-card-interactive p-8 flex flex-col items-center gap-4 no-underline group"
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: portal.bg }}>
                  {portal.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1" style={{ fontFamily: 'Playfair Display, serif', color: portal.color }}>
                    {portal.role} Portal
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{portal.description}</p>
                </div>
                <div className="mt-auto">
                  <span className="btn-primary text-sm px-5 py-2" style={{ background: `linear-gradient(135deg, ${portal.color}, ${portal.color}dd)` }}>
                    Sign In →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* Feature Strip */}
      <div className="relative z-10 border-t border-gray-100 bg-white/60 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-8 py-6 flex flex-wrap justify-center gap-8">
          {[
            { icon: '🤖', text: 'AI Academic Assistant' },
            { icon: '📅', text: 'Real-time Timetable' },
            { icon: '♿', text: 'Accessibility Aware' },
            { icon: '📢', text: 'Live Announcements' },
            { icon: '📚', text: 'Learning Materials' },
            { icon: '🎯', text: 'Quiz Mode' },
          ].map(f => (
            <div key={f.text} className="flex items-center gap-2 text-sm text-gray-600">
              <span>{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
