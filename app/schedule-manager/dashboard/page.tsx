'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import SMSidebar from '@/components/shared/SMSidebar'
import Link from 'next/link'

export default function SMDashboard() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [stats, setStats] = useState({ pending: 0, underReview: 0, approved: 0, rejected: 0 })
  const [recentAppeals, setRecentAppeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/timetable-appeals')
        const data = await res.json()
        if (data.success) {
          const appeals = data.data || []
          setRecentAppeals(appeals.slice(0, 5))
          setStats({
            pending: appeals.filter((a: any) => a.status === 'pending').length,
            underReview: appeals.filter((a: any) => a.status === 'under_review').length,
            approved: appeals.filter((a: any) => a.status === 'approved').length,
            rejected: appeals.filter((a: any) => a.status === 'rejected').length,
          })
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    { label: 'Pending Appeals', value: stats.pending, icon: '⏳', color: '#e65100', bg: '#fff3e0' },
    { label: 'Under Review', value: stats.underReview, icon: '🔍', color: '#1565c0', bg: '#e3f2fd' },
    { label: 'Approved', value: stats.approved, icon: '✅', color: '#2e7d32', bg: '#e8f5e9' },
    { label: 'Rejected', value: stats.rejected, icon: '❌', color: '#c62828', bg: '#ffebee' },
  ]

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0f4ff' }}>
      <SMSidebar userName={user?.name || ''} userEmail={user?.email || ''} />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0d47a1' }}>
            📋 Schedule Manager Dashboard
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map(card => (
            <div key={card.label} className="nexus-card p-5" style={{ borderLeft: `4px solid ${card.color}` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: card.color, fontFamily: 'Playfair Display, serif' }}>
                    {loading ? '...' : card.value}
                  </p>
                </div>
                <span className="text-3xl">{card.icon}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="nexus-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base" style={{ color: '#0d47a1', fontFamily: 'Playfair Display, serif' }}>
              📝 Recent Appeals
            </h2>
            <Link href="/schedule-manager/appeals" className="text-sm font-semibold" style={{ color: '#0d47a1' }}>
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : recentAppeals.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-3">📭</div>
              <p>No appeals yet. All quiet!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAppeals.map(appeal => (
                <div key={appeal.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f8f9ff' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-800">
                        {(appeal.unit as any)?.code || 'Unknown Unit'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: appeal.status === 'pending' ? '#fff3e0' : appeal.status === 'approved' ? '#e8f5e9' : '#ffebee',
                          color: appeal.status === 'pending' ? '#e65100' : appeal.status === 'approved' ? '#2e7d32' : '#c62828',
                        }}>
                        {appeal.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{appeal.appeal_type} — {appeal.description?.slice(0, 60)}</p>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(appeal.created_at).toLocaleDateString('en-KE')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)', border: '2px solid #0d47a120' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-semibold text-sm" style={{ color: '#0d47a1' }}>Your Role — Schedule Manager</p>
              <p className="text-xs text-gray-600 mt-0.5">
                You handle timetable accessibility, venue change requests, time change appeals, and schedule conflicts.
                All timetable appeals from students and lecturers come to you first.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
