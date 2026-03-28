'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface Building {
  id: string; name: string; code: string; has_lift: boolean; floors: number; accessibility_notes?: string; location_description?: string
  venues: { id: string; room_number: string; name?: string; capacity: number; floor_number: number; is_accessible: boolean; has_projector: boolean; has_ac: boolean }[]
}

interface VenueRequest {
  id: string; status: string; day_of_week: string; start_time: string; end_time: string
  session_type: string; semester: string; year: number; notes?: string; created_at: string; admin_notes?: string
  lecturer?: { full_name: string; email: string }
  unit?: { code: string; name: string }
  venue?: { room_number: string; name?: string; building?: { name: string } }
}

interface Props {
  buildings: Building[]
  venueRequests: VenueRequest[]
}

const statusColors: Record<string, string> = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' }

export default function AdminVenuesClient({ buildings, venueRequests: initialRequests }: Props) {
  const [venueRequests, setVenueRequests] = useState(initialRequests)
  const [activeTab, setActiveTab] = useState<'buildings' | 'requests'>('requests')
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [filterStatus, setFilterStatus] = useState('pending')

  async function loadRequests() {
    const res = await fetch('/api/venue-requests')
    const data = await res.json()
    if (data.success) setVenueRequests(data.data)
  }

  async function handleReview(id: string, status: 'approved' | 'rejected') {
    try {
      const res = await fetch(`/api/venue-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: adminNotes }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(status === 'approved' ? '✅ Venue approved & added to timetable!' : '❌ Venue request rejected')
        setReviewingId(null)
        setAdminNotes('')
        loadRequests()
      } else {
        toast.error(data.error || 'Failed to process request')
      }
    } catch {
      toast.error('Error processing request')
    }
  }

  const filteredRequests = filterStatus === 'all' ? venueRequests : venueRequests.filter(r => r.status === filterStatus)
  const pendingCount = venueRequests.filter(r => r.status === 'pending').length

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#2e7d32' }}>
              🏛️ Buildings & Venues
            </h1>
            <p className="text-gray-500 mt-1">Manage campus venues and approve lecturer venue requests</p>
          </div>
          {pendingCount > 0 && (
            <div className="px-4 py-2 rounded-xl text-white font-bold text-sm"
              style={{ background: '#f59e0b' }}>
              ⚡ {pendingCount} Pending Request{pendingCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 rounded-xl p-1" style={{ background: '#f0f2ff', width: 'fit-content' }}>
          <button onClick={() => setActiveTab('requests')}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: activeTab === 'requests' ? '#2e7d32' : 'transparent', color: activeTab === 'requests' ? 'white' : '#444' }}>
            📋 Venue Requests {pendingCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-amber-400 text-white">{pendingCount}</span>}
          </button>
          <button onClick={() => setActiveTab('buildings')}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: activeTab === 'buildings' ? '#2e7d32' : 'transparent', color: activeTab === 'buildings' ? 'white' : '#444' }}>
            🏢 All Buildings & Rooms
          </button>
        </div>

        {activeTab === 'requests' && (
          <div>
            {/* Filter */}
            <div className="flex gap-2 mb-4">
              {['pending', 'approved', 'rejected', 'all'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold border capitalize"
                  style={{
                    background: filterStatus === s ? '#2e7d32' : 'white',
                    color: filterStatus === s ? 'white' : '#444',
                    borderColor: filterStatus === s ? '#2e7d32' : '#e0e0ef',
                  }}>
                  {s} ({s === 'all' ? venueRequests.length : venueRequests.filter(r => r.status === s).length})
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {filteredRequests.length === 0 ? (
                <div className="nexus-card p-16 text-center text-gray-400">
                  <div className="text-4xl mb-3">✅</div>
                  <p>No {filterStatus !== 'all' ? filterStatus : ''} requests</p>
                </div>
              ) : filteredRequests.map(req => (
                <div key={req.id} className="nexus-card p-6"
                  style={{ borderLeft: `4px solid ${statusColors[req.status] || '#999'}` }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-bold">{req.venue?.room_number}{req.venue?.name ? ` — ${req.venue.name}` : ''}</span>
                        <span className="text-gray-500 text-sm">{req.venue?.building?.name}</span>
                        <span className="badge badge-purple text-xs">{req.unit?.code}</span>
                        <span className="badge badge-gray text-xs capitalize">{req.session_type}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white capitalize"
                          style={{ background: statusColors[req.status] }}>
                          {req.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 mb-1">
                        <strong>{req.unit?.name}</strong>
                      </div>
                      <div className="text-sm text-gray-600">
                        📅 {req.day_of_week} · ⏰ {req.start_time?.slice(0,5)} – {req.end_time?.slice(0,5)} · {req.semester} {req.year}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        👨‍🏫 {req.lecturer?.full_name} ({req.lecturer?.email}) · Submitted {new Date(req.created_at).toLocaleDateString('en-KE')}
                      </div>
                      {req.notes && <p className="text-xs text-gray-500 mt-1">Lecturer note: {req.notes}</p>}
                      {req.admin_notes && <p className="text-xs mt-1 text-gray-600">Admin note: {req.admin_notes}</p>}
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex-shrink-0">
                        {reviewingId === req.id ? (
                          <div className="space-y-2">
                            <textarea
                              className="nexus-input text-xs"
                              rows={2}
                              placeholder="Admin notes (optional)"
                              value={adminNotes}
                              onChange={e => setAdminNotes(e.target.value)}
                              style={{ minWidth: '200px' }}
                            />
                            <div className="flex gap-2">
                              <button onClick={() => handleReview(req.id, 'approved')}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                                style={{ background: '#10b981' }}>
                                ✅ Approve
                              </button>
                              <button onClick={() => handleReview(req.id, 'rejected')}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                                style={{ background: '#ef4444' }}>
                                ❌ Reject
                              </button>
                              <button onClick={() => { setReviewingId(null); setAdminNotes('') }}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 bg-gray-100">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setReviewingId(req.id)}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                            style={{ background: 'linear-gradient(135deg, #2e7d32, #43a047)' }}>
                            Review →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'buildings' && (
          <div className="space-y-6">
            {buildings.map(b => (
              <div key={b.id} className="nexus-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#2e7d32' }}>
                      {b.name} <span className="text-sm text-gray-400">({b.code})</span>
                    </h2>
                    <div className="flex gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${b.has_lift ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {b.has_lift ? '♿ Lift ✓' : '⚠️ No Lift'}
                      </span>
                      <span className="text-xs text-gray-400">{b.floors} floor{b.floors !== 1 ? 's' : ''}</span>
                      <span className="text-xs text-gray-400">{b.venues?.length || 0} rooms</span>
                    </div>
                    {b.accessibility_notes && <p className="text-xs text-gray-500 mt-1">{b.accessibility_notes}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {(b.venues || []).map(v => (
                    <div key={v.id} className="p-3 rounded-xl border" style={{ borderColor: '#e0e0ef', background: '#fafbff' }}>
                      <div className="font-bold text-sm" style={{ color: '#1a237e' }}>{v.room_number}</div>
                      {v.name && <div className="text-xs text-gray-500">{v.name}</div>}
                      <div className="text-xs text-gray-400 mt-1">👥 {v.capacity} seats · Floor {v.floor_number}</div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {v.is_accessible && <span className="text-xs bg-green-50 text-green-700 px-1 rounded">♿</span>}
                        {v.has_projector && <span className="text-xs bg-blue-50 text-blue-700 px-1 rounded">📽️</span>}
                        {v.has_ac && <span className="text-xs bg-cyan-50 text-cyan-700 px-1 rounded">❄️</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
