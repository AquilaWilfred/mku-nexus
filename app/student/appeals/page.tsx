'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import toast from 'react-hot-toast'
import { UserRole, DisabilityAppeal } from '@/types'

export default function StudentAppeals() {
  const { data: session } = useSession()
  const [appeals, setAppeals] = useState<DisabilityAppeal[]>([])
  const [venues, setVenues] = useState<{ id: string; room_number: string; name: string; is_accessible: boolean; floor_number: number; building: { name: string; has_lift: boolean } }[]>([])
  const [units, setUnits] = useState<{ id: string; code: string; name: string }[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    disability_type: '',
    description: '',
    unit_id: '',
    current_venue_id: '',
    requested_venue_id: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [appealsRes, venuesRes, unitsRes] = await Promise.all([
      fetch('/api/disability'),
      fetch('/api/venues'),
      fetch('/api/units/enrolled'),
    ])
    const [appealsData, venuesData, unitsData] = await Promise.all([
      appealsRes.json(), venuesRes.json(), unitsRes.json()
    ])
    if (appealsData.success) setAppeals(appealsData.data)
    if (venuesData.success) setVenues(venuesData.data)
    if (unitsData.success) setUnits(unitsData.data)
  }

  async function submitAppeal(e: React.FormEvent) {
    e.preventDefault()
    if (!form.disability_type || !form.description) {
      toast.error('Please fill in disability type and description')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/disability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Appeal submitted! Admin and lecturer have been notified. ♿')
        setShowForm(false)
        setForm({ disability_type: '', description: '', unit_id: '', current_venue_id: '', requested_venue_id: '' })
        loadData()
      } else {
        toast.error(data.error || 'Failed to submit appeal')
      }
    } catch {
      toast.error('Connection error')
    } finally {
      setLoading(false)
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'badge-orange',
    under_review: 'badge-navy',
    approved: 'badge-green',
    rejected: 'badge-red',
  }

  const accessibleVenues = venues.filter(v => v.is_accessible || v.floor_number === 0)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar
        role={(session?.user as unknown as { role: UserRole })?.role || 'student'}
        userName={session?.user?.name || ''}
        userEmail={session?.user?.email || ''}
      />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
                ♿ Accessibility Appeals
              </h1>
              <p className="text-gray-500 mt-1">Request venue accommodations for disability-related needs</p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary">
              {showForm ? '✕ Cancel' : '+ New Appeal'}
            </button>
          </div>

          {/* Info Banner */}
          <div className="nexus-card p-5 mb-6" style={{ borderLeft: '4px solid #1a237e', background: '#f0f4ff' }}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: '#1a237e' }}>
              🏛️ Building Accessibility Guide
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-green-700 mb-1">✅ Buildings WITH Lift:</p>
                <p className="text-gray-600">Main Academic Block, Technology Hub, Library Block, Administration Block</p>
              </div>
              <div>
                <p className="font-medium text-red-700 mb-1">❌ Buildings WITHOUT Lift:</p>
                <p className="text-gray-600">Science Complex (ground floor accessible), Sports Complex</p>
              </div>
            </div>
          </div>

          {/* Appeal Form */}
          {showForm && (
            <div className="nexus-card p-6 mb-6 animate-fade-in">
              <h2 className="text-lg font-bold mb-5" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
                Submit New Accessibility Appeal
              </h2>
              <form onSubmit={submitAppeal} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="nexus-label">Disability / Accessibility Need *</label>
                    <input
                      className="nexus-input"
                      value={form.disability_type}
                      onChange={e => setForm(f => ({ ...f, disability_type: e.target.value }))}
                      placeholder="e.g., Mobility impairment, uses wheelchair"
                      required
                    />
                  </div>
                  <div>
                    <label className="nexus-label">Related Unit (Optional)</label>
                    <select className="nexus-input" value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}>
                      <option value="">-- All units / General --</option>
                      {units.map(u => <option key={u.id} value={u.id}>{u.code} - {u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="nexus-label">Current Venue (Problematic)</label>
                    <select className="nexus-input" value={form.current_venue_id} onChange={e => setForm(f => ({ ...f, current_venue_id: e.target.value }))}>
                      <option value="">-- Select venue --</option>
                      {venues.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name || v.room_number} — {v.building?.name} {!v.building?.has_lift && v.floor_number > 0 ? '(No Lift ⚠️)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="nexus-label">Preferred Accessible Venue</label>
                    <select className="nexus-input" value={form.requested_venue_id} onChange={e => setForm(f => ({ ...f, requested_venue_id: e.target.value }))}>
                      <option value="">-- Select accessible venue --</option>
                      {accessibleVenues.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name || v.room_number} — {v.building?.name} {v.building?.has_lift ? '(Lift ✓)' : '(Ground floor)'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="nexus-label">Detailed Description *</label>
                  <textarea
                    className="nexus-input"
                    rows={4}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Please describe your accessibility needs in detail and why the current venue is a challenge for you..."
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? 'Submitting...' : '✅ Submit Appeal'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Appeals List */}
          <div className="nexus-card p-6">
            <h2 className="text-lg font-bold mb-5" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
              My Appeals ({appeals.length})
            </h2>
            {appeals.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-5xl mb-3">♿</div>
                <p className="font-medium">No appeals submitted yet</p>
                <p className="text-sm mt-1">Submit an appeal if you need venue accommodations</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appeals.map(appeal => (
                  <div key={appeal.id} className="border rounded-xl p-5" style={{ borderColor: '#e0e0ef' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{appeal.disability_type}</span>
                          <span className={`badge ${statusColors[appeal.status]} capitalize text-xs`}>
                            {appeal.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{appeal.description}</p>
                        {appeal.admin_notes && (
                          <div className="mt-3 p-3 rounded-lg text-sm" style={{ background: '#e8f5e9' }}>
                            <span className="font-semibold text-green-800">Admin note: </span>
                            <span className="text-green-700">{appeal.admin_notes}</span>
                          </div>
                        )}
                        {appeal.lecturer_notes && (
                          <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: '#e8eaf6' }}>
                            <span className="font-semibold" style={{ color: '#1a237e' }}>Lecturer note: </span>
                            <span className="text-gray-700">{appeal.lecturer_notes}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(appeal.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
