'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import toast from 'react-hot-toast'

export default function ScheduleManagerAppeals() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [appeals, setAppeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [notes, setNotes] = useState<{ [key: string]: string }>({})
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    loadAppeals()
  }, [])

  async function loadAppeals() {
    setLoading(true)
    try {
      const res = await fetch('/api/timetable-appeals')
      const data = await res.json()
      if (data.success) setAppeals(data.data || [])
    } catch (err) {
      toast.error('Failed to load appeals')
    }
    setLoading(false)
  }

  async function handleUpdateStatus(id: string, status: string) {
    setProcessingId(id)
    try {
      const res = await fetch('/api/timetable-appeals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, manager_notes: notes[id] || '' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Appeal marked as ${status.replace('_', ' ')}`)
        loadAppeals()
      } else {
        toast.error(data.error || 'Failed to update appeal')
      }
    } catch (err) {
      toast.error('Network error')
    }
    setProcessingId(null)
  }

  const filteredAppeals = appeals.filter(a => filter === 'all' || a.status === filter)

  const statusColors: Record<string, string> = {
    pending: '#e65100', under_review: '#1565c0', approved: '#2e7d32', rejected: '#c62828'
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role="schedule_manager" userName={user?.name || ''} userEmail={user?.email || ''} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
            📋 Timetable Appeals Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Review and manage student and lecturer requests for timetable adjustments.
          </p>
        </div>

        <div className="flex gap-2 mb-6 border-b pb-4">
          {['pending', 'under_review', 'approved', 'rejected', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-xs font-bold transition-all capitalize"
              style={{
                background: filter === f ? '#1a237e' : '#e8eaf6',
                color: filter === f ? 'white' : '#1a237e'
              }}>
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading appeals...</div>
        ) : filteredAppeals.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <p>No appeals found for this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredAppeals.map(appeal => (
              <div key={appeal.id} className="nexus-card p-5 border-l-4" style={{ borderLeftColor: statusColors[appeal.status] || '#1a237e' }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      {appeal.unit?.code} <span className="text-xs font-normal text-gray-500 px-2 bg-gray-100 rounded-full">{appeal.appeal_type.replace('_', ' ')}</span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">From: {appeal.submitter?.full_name} ({appeal.submitter_role})</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full capitalize" style={{ background: `${statusColors[appeal.status]}20`, color: statusColors[appeal.status] }}>
                    {appeal.status.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700 mb-4 border">
                  <p><strong>Description:</strong> {appeal.description}</p>
                  {appeal.requested_venue && <p className="mt-1"><strong>Requested Venue:</strong> {appeal.requested_venue.room_number} ({appeal.requested_venue.building?.name})</p>}
                </div>

                {['pending', 'under_review'].includes(appeal.status) && (
                  <div className="space-y-3 pt-3 border-t">
                    <textarea 
                      className="nexus-input w-full text-sm" rows={2} 
                      placeholder="Add a note (optional)..."
                      value={notes[appeal.id] || ''}
                      onChange={e => setNotes(prev => ({ ...prev, [appeal.id]: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      {appeal.status === 'pending' && (
                        <button onClick={() => handleUpdateStatus(appeal.id, 'under_review')} disabled={processingId === appeal.id} className="flex-1 py-2 text-xs font-bold rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200">Start Review</button>
                      )}
                      <button onClick={() => handleUpdateStatus(appeal.id, 'approved')} disabled={processingId === appeal.id} className="flex-1 py-2 text-xs font-bold rounded-lg bg-green-100 text-green-800 hover:bg-green-200">Approve</button>
                      <button onClick={() => handleUpdateStatus(appeal.id, 'rejected')} disabled={processingId === appeal.id} className="flex-1 py-2 text-xs font-bold rounded-lg bg-red-100 text-red-800 hover:bg-red-200">Reject</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}