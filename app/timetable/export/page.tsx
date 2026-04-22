'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'

interface TimetableEntry {
  id: string
  day_of_week: string
  start_time: string
  end_time: string
  session_type: string
  semester: string
  year: number
  unit: { code?: string; name?: string; lecturer?: { full_name?: string } }
  venue?: { room_number?: string; name?: string; floor_number?: number; building?: { name?: string; code?: string } }
}

export default function TimetableExportSheetPage() {
  const { data: session } = useSession()
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const role = (session?.user as any)?.role || 'student'
  const userName = (session?.user as any)?.name || 'MKU User'
  const userEmail = (session?.user as any)?.email || ''

  useEffect(() => {
    async function loadTimetable() {
      try {
        const res = await fetch('/api/timetable?full=true')
        if (!res.ok) {
          throw new Error(`Failed to load timetable (${res.status})`)
        }
        const data = await res.json()
        if (!data.success) {
          throw new Error(data.error || 'Unable to load timetable data')
        }
        setEntries(data.data || [])
      } catch (err: any) {
        setError(err?.message || 'Unable to load timetable data')
      } finally {
        setLoading(false)
      }
    }

    loadTimetable()
  }, [])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#eef2ff' }}>
      <Sidebar role={role} userName={userName} userEmail={userEmail} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Playfair Display, serif', color: '#0d47a1' }}>
                  📊 Timetable Spreadsheet View
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  This view mirrors a spreadsheet layout so you can scan timetable rows, columns, and venue details without seeing raw XML.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/api/timetable/export?download=true"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  ⬇️ Download XML
                </a>
                <a
                  href="/api/timetable/export"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  🔗 Open Raw XML
                </a>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Timetable sheet</h2>
                <p className="text-sm text-slate-500">Browse the exam timetable in a spreadsheet-style layout.</p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-700">
                {loading ? 'Loading...' : `${entries.length} rows`}
              </div>
            </div>

            {error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 mt-5">
                {error}
              </div>
            ) : (
              <div className="mt-5 overflow-auto rounded-[2rem] border border-slate-200 bg-slate-50 shadow-inner">
                <table className="min-w-full border-separate border-spacing-0 text-sm">
                  <thead className="bg-slate-950 text-white">
                    <tr>
                      {['Unit Code', 'Unit Name', 'Lecturer', 'Day', 'Start', 'End', 'Type', 'Venue', 'Building', 'Floor', 'Semester', 'Year'].map((heading) => (
                        <th key={heading} className="sticky top-0 border-b border-slate-800 px-4 py-3 text-left font-medium">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={12} className="h-56 text-center text-slate-500">Loading timetable rows…</td>
                      </tr>
                    ) : entries.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="h-56 text-center text-slate-500">No timetable rows available.</td>
                      </tr>
                    ) : entries.map((entry, index) => {
                      const venueLabel = entry.venue?.room_number || entry.venue?.name || 'TBA'
                      const buildingLabel = entry.venue?.building?.name || entry.venue?.building?.code || 'TBA'
                      return (
                        <tr key={entry.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="border-b border-slate-200 px-4 py-3 text-slate-900">{entry.unit?.code || 'TBA'}</td>
                          <td className="border-b border-slate-200 px-4 py-3 text-slate-900">{entry.unit?.name || 'TBA'}</td>
                          <td className="border-b border-slate-200 px-4 py-3 text-slate-900">{entry.unit?.lecturer?.full_name || 'TBA'}</td>
                          <td className="border-b border-slate-200 px-4 py-3 text-slate-900">{entry.day_of_week || 'TBA'}</td>
                          <td className="border-b border-slate-200 px-4 py-3 text-slate-900">{entry.start_time?.slice(0, 5) || 'TBA'}</td>
                          <td className="border-b border-slate-200 px-4 py-3 text-slate-900">{entry.end_time?.slice(0, 5) || 'TBA'}</td>
                          <td className="border-b border-slate-200 px-4 py-3 text-slate-900">{entry.session_type || 'N/A'}</td>
                          <td className="border-b border-slate-200 px-4 py-3 text-slate-900">{venueLabel}</td>
                          <td className="border-b border-slate-200 px-4 py-3 text-slate-900">{buildingLabel}</td>
                          <td className="border-b border-slate-200 px-4 py-3 text-slate-900">{entry.venue?.floor_number ?? '-'}</td>
                          <td className="border-b border-slate-200 px-4 py-3 text-slate-900">{entry.semester || 'N/A'}</td>
                          <td className="border-b border-slate-200 px-4 py-3 text-slate-900">{entry.year || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
