'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import DeactivatedBanner from '@/components/shared/DeactivatedBanner'
import Link from 'next/link'

export default function StudentTimetableAppealDetailPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const params = useParams()
  const id = params?.id as string | undefined
  const [appeal, setAppeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    async function loadAppeal() {
      setLoading(true)
      try {
        const res = await fetch(`/api/timetable-appeals/${id}`)
        const body = await res.json()
        if (!res.ok) {
          setError(body.error || 'Failed to load appeal')
          return
        }
        setAppeal(body.data)
      } catch (err) {
        setError('Failed to load appeal')
      } finally {
        setLoading(false)
      }
    }
    loadAppeal()
  }, [id])

  const statusColors: Record<string, string> = {
    pending: '#e65100', under_review: '#1565c0', approved: '#2e7d32', rejected: '#c62828', escalated: '#6a1b9a',
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0f4ff' }}>
      <Sidebar role="student" userName={user?.name || ''} userEmail={user?.email || ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DeactivatedBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
                📝 Appeal Details
              </h1>
              <p className="text-gray-500 text-sm mt-1">View the current status of your timetable appeal.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/student/timetable-appeal" className="px-4 py-2 rounded-xl bg-white border text-sm font-semibold hover:bg-gray-50">
                Back to appeals
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-400">⏳ Loading appeal…</div>
          ) : error ? (
            <div className="nexus-card p-6 text-center text-red-600">{error}</div>
          ) : appeal ? (
            <div className="space-y-6">
              <div className="nexus-card p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{appeal.unit?.code || 'Appeal'}</h2>
                    <p className="text-sm text-gray-500">{appeal.appeal_type.replace('_', ' ')}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: `${statusColors[appeal.status]}20`, color: statusColors[appeal.status] }}>
                    {appeal.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700">Submitted By</h3>
                    <p className="text-sm text-gray-600">{appeal.submitter?.full_name || 'You'}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(appeal.created_at).toLocaleString('en-KE')}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700">Unit</h3>
                    <p className="text-sm text-gray-600">{appeal.unit?.code || '-'} — {appeal.unit?.name || '-'}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700">Description</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{appeal.description}</p>
                  </div>
                  {appeal.current_venue && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700">Current Venue</h3>
                      <p className="text-sm text-gray-600">{appeal.current_venue.room_number} — {appeal.current_venue.name}</p>
                    </div>
                  )}
                  {appeal.requested_venue && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700">Requested Venue</h3>
                      <p className="text-sm text-gray-600">{appeal.requested_venue.room_number} — {appeal.requested_venue.name}</p>
                    </div>
                  )}
                  {appeal.manager_notes && (
                    <div className="rounded-xl bg-green-50 p-4 text-sm text-gray-800">
                      <h3 className="font-semibold">Manager Note</h3>
                      <p>{appeal.manager_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">No appeal details available.</div>
          )}
        </main>
      </div>
    </div>
  )
}
