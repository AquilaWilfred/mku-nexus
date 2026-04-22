'use client'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import ChatBot from '@/components/shared/ChatBot'

interface Stats {
  total_students: number
  total_lecturers: number
  total_units: number
  total_events: number
  pending_appeals: number
  pending_timetable_appeals: number
  pending_activations: number
  deactivated_users: number
  recent_events: { id: string; title: string; event_type: string; created_at: string; creator?: { full_name: string } }[]
  recent_appeals: { id: string; disability_type: string; status: string; created_at: string; student?: { full_name: string; student_id: string } }[]
  enrollment_trends: { month: string; count: number }[]
  recent_users: { id: string; full_name: string; email: string; role: string; created_at: string; is_active: boolean }[]
  recent_logins: { id: string; logged_in_at: string; logged_out_at?: string; session_duration_seconds?: number; is_active: boolean; user?: { full_name: string; role: string } }[]
}

interface Props {
  stats: Stats
  userName: string
}

const COLORS = ['#1a237e', '#6a1b9a', '#2e7d32', '#e65100']

export default function AdminDashboardClient({ stats, userName }: Props) {
  const roleData = [
    { name: 'Students', value: stats.total_students },
    { name: 'Lecturers', value: stats.total_lecturers },
  ]

  const metricCards = [
    { label: 'Total Students', value: stats.total_students, icon: '🎓', color: 'navy', change: '' },
    { label: 'Lecturers', value: stats.total_lecturers, icon: '👨‍🏫', color: 'purple', change: '' },
    { label: 'Active Units', value: stats.total_units, icon: '📚', color: 'green', change: '' },
    { label: 'Accessibility Appeals', value: stats.pending_appeals, icon: '♿', color: 'orange', change: stats.pending_appeals > 0 ? '⚠️ Needs attention' : '✅ All clear' },
    { label: 'Timetable Appeals', value: stats.pending_timetable_appeals || 0, icon: '📋', color: 'navy', change: stats.pending_timetable_appeals > 0 ? '⚠️ Pending' : '✅ All clear' },
    { label: 'Activation Requests', value: stats.pending_activations || 0, icon: '🔓', color: 'orange', change: stats.pending_activations > 0 ? '⚠️ Pending review' : '✅ None pending' },
    { label: 'Deactivated Users', value: stats.deactivated_users || 0, icon: '🔒', color: 'purple', change: '' },
    { label: 'Total Events', value: stats.total_events, icon: '📢', color: 'green', change: '' },
  ]

  return (
    <main className="flex-1 overflow-y-auto p-8 md:ml-64">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
            System Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            Welcome back, {userName.split(' ')[0]} —{' '}
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <a href="/admin/training"
            className="btn-primary text-sm"
            style={{ background: 'linear-gradient(135deg, #2e7d32, #43a047)' }}>
            🧠 Train AI
          </a>
          <a href="/admin/users" className="btn-secondary text-sm">👥 Manage Users</a>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metricCards.map((card) => (
          <div key={card.label} className={`stat-card ${card.color}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{card.label}</p>
                <p className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
                  {card.value.toLocaleString()}
                </p>
                {card.change && (
                  <p className="text-xs text-gray-500 mt-1">{card.change}</p>
                )}
              </div>
              <span className="text-3xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Enrollment Trends */}
        <div className="nexus-card p-6 lg:col-span-2">
          <h2 className="text-base font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
            📈 Enrollment Trends
          </h2>
          {stats.enrollment_trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.enrollment_trends}>
                <defs>
                  <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a237e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1a237e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f8" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#999' }} />
                <YAxis tick={{ fontSize: 11, fill: '#999' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #e0e0ef', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="count" stroke="#1a237e" fill="url(#enrollGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              No enrollment data yet
            </div>
          )}
        </div>

        {/* User Distribution */}
        <div className="nexus-card p-6">
          <h2 className="text-base font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
            👥 User Distribution
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={roleData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {roleData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {roleData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                <span className="text-gray-600">{item.name}: <strong>{item.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Events */}
        <div className="nexus-card p-6">
          <h2 className="text-base font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
            📢 Recent Events
          </h2>
          {stats.recent_events.length === 0 ? (
            <p className="text-gray-400 text-sm">No events yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recent_events.map(ev => (
                <div key={ev.id} className="flex items-start gap-3 pb-3 border-b last:border-0" style={{ borderColor: '#f0f0f8' }}>
                  <div className="flex-1">
                    <p className="text-sm font-medium line-clamp-1">{ev.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      By {ev.creator?.full_name} · {new Date(ev.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className="badge badge-navy text-xs capitalize flex-shrink-0">{ev.event_type.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
          <a href="/admin/events" className="text-xs mt-3 block" style={{ color: '#1a237e' }}>View all events →</a>
        </div>

        {/* Pending Appeals */}
        <div className="nexus-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
              ♿ Pending Appeals
            </h2>
            {stats.pending_appeals > 0 && (
              <span className="badge badge-orange">{stats.pending_appeals}</span>
            )}
          </div>
          {stats.recent_appeals.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-gray-400 text-sm">All appeals resolved</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recent_appeals.map(appeal => (
                <div key={appeal.id} className="flex items-start gap-3 pb-3 border-b last:border-0" style={{ borderColor: '#f0f0f8' }}>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{appeal.student?.full_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{appeal.disability_type}</p>
                    <p className="text-xs text-gray-400">ID: {appeal.student?.student_id}</p>
                  </div>
                  <a href="/admin/appeals" className="badge badge-orange text-xs">Review</a>
                </div>
              ))}
            </div>
          )}
          <a href="/admin/appeals" className="text-xs mt-3 block" style={{ color: '#1a237e' }}>Manage all appeals →</a>
        </div>

        {/* Recent Users */}
        <div className="nexus-card p-6">
          <h2 className="text-base font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
            👤 Recent Users
          </h2>
          <div className="space-y-3">
            {stats.recent_users.map(user => (
              <div key={user.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: user.role === 'student' ? '#1a237e' : user.role === 'lecturer' ? '#6a1b9a' : '#2e7d32' }}>
                  {user.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                </div>
                {!user.is_active && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                    style={{ background: '#ffebee', color: '#c62828' }}>🔒</span>
                )}
              </div>
            ))}
          </div>
          <a href="/admin/users" className="text-xs mt-3 block" style={{ color: '#1a237e' }}>Manage all users →</a>
        </div>
      </div>

      {/* Login Activity */}
      {stats.recent_logins && stats.recent_logins.length > 0 && (
        <div className="nexus-card p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
              🕐 Recent Login Activity
            </h2>
            <span className="text-xs text-gray-400">Last 10 sessions</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: '#e0e0ef' }}>
                  <th className="text-left py-2 text-xs text-gray-400 font-semibold">User</th>
                  <th className="text-left py-2 text-xs text-gray-400 font-semibold">Role</th>
                  <th className="text-left py-2 text-xs text-gray-400 font-semibold">Login Time</th>
                  <th className="text-left py-2 text-xs text-gray-400 font-semibold">Logout</th>
                  <th className="text-left py-2 text-xs text-gray-400 font-semibold">Duration</th>
                  <th className="text-left py-2 text-xs text-gray-400 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_logins.map((s: any) => {
                  const dur = s.session_duration_seconds
                  const durStr = dur ? (dur >= 3600 ? `${Math.floor(dur/3600)}h ${Math.floor((dur%3600)/60)}m` : `${Math.floor(dur/60)}m`) : '—'
                  return (
                    <tr key={s.id} className="border-b" style={{ borderColor: '#f0f0f8' }}>
                      <td className="py-2 font-medium text-gray-800">{s.user?.full_name || '—'}</td>
                      <td className="py-2 text-xs capitalize" style={{ color: '#6a1b9a' }}>{s.user?.role}</td>
                      <td className="py-2 text-xs text-gray-500">
                        {new Date(s.logged_in_at).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2 text-xs text-gray-500">
                        {s.logged_out_at ? new Date(s.logged_out_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="py-2 text-xs text-gray-500">{durStr}</td>
                      <td className="py-2">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: s.is_active ? '#e8f5e9' : '#f5f5f5', color: s.is_active ? '#2e7d32' : '#999' }}>
                          {s.is_active ? '🟢 Online' : 'Offline'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating AI */}
      <ChatBot userRole="admin" userName={userName} floating={true} />
    </main>
  )
}
