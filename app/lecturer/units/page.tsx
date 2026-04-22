'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import { UserRole } from '@/types'
import toast from 'react-hot-toast'

interface Unit {
  id: string; code: string; name: string; description?: string; credits: number
  semester: string; year: number; max_students: number
  department?: { name: string; code: string }
  course_units?: { course_id: string; year_of_study?: number; course?: { id: string; code: string; name: string } }[]
  timetable?: TimetableEntry[]
}
interface TimetableEntry {
  id: string; day_of_week: string; start_time: string; end_time: string; session_type: string
  venue?: { id: string; room_number: string; name?: string; floor_number: number; capacity: number; building?: { name: string; has_lift: boolean } }
}
interface Venue {
  id: string; room_number: string; name?: string; capacity: number; floor_number: number
  is_accessible: boolean; has_projector: boolean; has_ac: boolean
  building?: { id: string; name: string; code: string; has_lift: boolean }
}
interface Course {
  id: string; code: string; name: string
  department?: { name: string; code: string }
}
interface Override {
  id: string; timetable_id: string; override_type: string; override_date?: string
  reason: string; is_cancelled: boolean; created_at: string
  new_venue?: Venue
}

// The 4 fixed 3-hour session slots
const SESSION_SLOTS = [
  { label: 'Session 1',  display: '07:00 – 10:00', start: '07:00:00', end: '10:00:00' },
  { label: 'Session 2',  display: '10:00 – 13:00', start: '10:00:00', end: '13:00:00' },
  { label: 'Session 3',  display: '13:00 – 16:00', start: '13:00:00', end: '16:00:00' },
  { label: 'Session 4',  display: '16:00 – 19:00', start: '16:00:00', end: '19:00:00' },
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SESSION_TYPES = ['lecture', 'lab', 'tutorial']
const TYPE_COLORS: Record<string, string> = { lecture: '#6a1b9a', lab: '#1565c0', tutorial: '#2e7d32' }

function slotLabel(start_time: string) {
  const s = start_time.slice(0, 5)
  const slot = SESSION_SLOTS.find(sl => sl.start.slice(0, 5) === s)
  return slot ? `${slot.label} (${slot.display})` : start_time.slice(0, 5)
}

export default function LecturerUnitsPage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [tab, setTab] = useState<'my_units' | 'register'>('my_units')
  const [myUnits, setMyUnits] = useState<Unit[]>([])
  const [available, setAvailable] = useState<Unit[]>([])
  const [scheduled, setScheduled] = useState<Unit[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [overrides, setOverrides] = useState<{ [k: string]: Override[] }>({})
  const [loading, setLoading] = useState(false)

  // Registration form state
  const [selCourse, setSelCourse] = useState('')
  const [selUnit, setSelUnit] = useState('')
  const [selVenue, setSelVenue] = useState('')
  const [selDay, setSelDay] = useState('Monday')
  const [selSlot, setSelSlot] = useState(SESSION_SLOTS[0].start)
  const [selType, setSelType] = useState('lecture')
  const [registering, setRegistering] = useState(false)

  // Override/change modal
  const [overrideModal, setOverrideModal] = useState<{ timetableId: string; unitCode: string } | null>(null)
  const [ovType, setOvType] = useState<'temporary' | 'permanent'>('temporary')
  const [ovDate, setOvDate] = useState('')
  const [ovVenue, setOvVenue] = useState('')
  const [ovSlot, setOvSlot] = useState('')
  const [ovDay, setOvDay] = useState('')
  const [ovReason, setOvReason] = useState('')
  const [ovCancelled, setOvCancelled] = useState(false)
  const [submittingOverride, setSubmittingOverride] = useState(false)

  useEffect(() => { fetchMyUnits(); fetchVenues() }, [])
  useEffect(() => { if (tab === 'register') fetchRegisterData() }, [tab])

  async function fetchMyUnits() {
    setLoading(true)
    const r = await fetch('/api/lecturer/register-units?semester=Semester 1&year=2026')
    const d = await r.json()
    if (d.success) {
      setMyUnits(d.my_units || [])
      setCourses(d.courses || [])
      for (const u of (d.my_units || [])) {
        for (const t of (u.timetable || [])) fetchOverrides(t.id)
      }
    }
    setLoading(false)
  }

  async function fetchRegisterData() {
    const params = new URLSearchParams({ 'semester': 'Semester 1', 'year': '2026' })
    if (selCourse) params.set('course_id', selCourse)
    const r = await fetch(`/api/lecturer/register-units?${params}`)
    const d = await r.json()
    if (d.success) {
      setAvailable(d.available_units || [])
      setScheduled(d.scheduled_units || [])
      setCourses(d.courses || [])
    }
  }

  async function fetchVenues() {
    const r = await fetch('/api/venues')
    const d = await r.json()
    if (d.success) setVenues(d.data || [])
  }

  async function fetchOverrides(timetableId: string) {
    const r = await fetch(`/api/timetable/override?timetable_id=${timetableId}`)
    const d = await r.json()
    if (d.success) setOverrides(p => ({ ...p, [timetableId]: d.data || [] }))
  }

  // Re-fetch available units when course selection changes
  useEffect(() => {
    if (tab === 'register') fetchRegisterData()
  }, [selCourse])

  async function registerUnit() {
    if (!selUnit) { toast.error('Please select a unit'); return }
    if (!selVenue) { toast.error('Please select a venue'); return }
    setRegistering(true)
    const r = await fetch('/api/lecturer/register-units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unit_id: selUnit,
        venue_id: selVenue,
        day_of_week: selDay,
        slot_start: selSlot,
        session_type: selType,
        semester: 'Semester 1',
        year: 2026
      })
    })
    const d = await r.json()
    setRegistering(false)
    if (d.success) {
      toast.success('✅ Unit registered! Timetable slot created.')
      setSelUnit(''); setSelVenue(''); setSelCourse('')
      setTab('my_units')
      fetchMyUnits()
    } else {
      toast.error(d.error || 'Failed to register unit')
    }
  }

  async function unregisterUnit(unitId: string, code: string) {
    if (!confirm(`Unregister ${code}? This removes the timetable slot and frees the unit for another lecturer.`)) return
    const r = await fetch(`/api/lecturer/register-units?unit_id=${unitId}`, { method: 'DELETE' })
    const d = await r.json()
    if (d.success) { toast.success('Removed ' + code); fetchMyUnits() }
    else toast.error(d.error || 'Failed')
  }

  async function submitOverride() {
    if (!overrideModal) return
    if (!ovReason.trim()) { toast.error('Please provide a reason'); return }
    if (ovType === 'temporary' && !ovDate) { toast.error('Please pick the affected date'); return }
    if (!ovCancelled && ovType === 'temporary' && !ovVenue) {
      toast.error('Please select a new venue, or tick the cancellation checkbox'); return
    }
    setSubmittingOverride(true)

    let new_start_time = null, new_end_time = null
    if (ovSlot) {
      const slot = SESSION_SLOTS.find(s => s.start === ovSlot)
      if (slot) { new_start_time = slot.start; new_end_time = slot.end }
    }

    const r = await fetch('/api/timetable/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timetable_id: overrideModal.timetableId,
        override_type: ovType,
        override_date: ovDate || null,
        new_venue_id: ovVenue || null,
        new_day_of_week: ovDay || null,
        new_start_time,
        new_end_time,
        reason: ovReason,
        is_cancelled: ovCancelled,
      })
    })
    const d = await r.json()
    setSubmittingOverride(false)
    if (d.success) {
      toast.success(ovCancelled ? '⚠️ Cancellation logged. Students notified.' : '✅ Change saved. Students notified.')
      setOverrideModal(null); resetOv(); fetchMyUnits()
    } else toast.error(d.error || 'Failed')
  }

  function resetOv() {
    setOvType('temporary'); setOvDate(''); setOvVenue(''); setOvDay('')
    setOvSlot(''); setOvReason(''); setOvCancelled(false)
  }

  // Units filtered by selected course in register tab
  const filteredAvailable = selCourse
    ? available.filter(u => (u.course_units || []).some(cu => cu.course_id === selCourse))
    : available
  const filteredScheduled = selCourse
    ? scheduled.filter(u => (u.course_units || []).some(cu => cu.course_id === selCourse))
    : scheduled

  const selectedSlotObj = SESSION_SLOTS.find(s => s.start === selSlot)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role={(user?.role || 'lecturer') as UserRole} userName={user?.name || ''} userEmail={user?.email || ''} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
                📖 My Teaching Units
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {myUnits.length}/4 units this semester · Sessions are 3 hours each
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setTab('my_units')}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: tab === 'my_units' ? '#6a1b9a' : '#f3e5f5', color: tab === 'my_units' ? 'white' : '#6a1b9a' }}>
                My Units ({myUnits.length})
              </button>
              <button onClick={() => setTab('register')} disabled={myUnits.length >= 4}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                style={{ background: tab === 'register' ? '#6a1b9a' : '#f3e5f5', color: tab === 'register' ? 'white' : '#6a1b9a' }}>
                + Register Unit
              </button>
            </div>
          </div>

          {/* Session slots info bar */}
          <div className="nexus-card p-3 mb-5 flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-gray-500 mr-1">Daily Sessions:</span>
            {SESSION_SLOTS.map(s => (
              <span key={s.start} className="text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ background: '#f3e5f5', color: '#6a1b9a' }}>
                {s.label}: {s.display}
              </span>
            ))}
          </div>

          {myUnits.length >= 4 && (
            <div className="p-3 rounded-xl mb-5 text-sm" style={{ background: '#fff3e0', borderLeft: '4px solid #e65100' }}>
              <strong className="text-orange-800">📌 Maximum reached:</strong>
              <span className="text-orange-700"> You have 4 units registered for this semester.</span>
            </div>
          )}

          {/* ── MY UNITS ── */}
          {tab === 'my_units' && (
            loading ? (
              <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">⏳</div><p>Loading...</p></div>
            ) : myUnits.length === 0 ? (
              <div className="nexus-card p-12 text-center text-gray-400">
                <div className="text-5xl mb-4">📖</div>
                <h3 className="text-lg font-semibold mb-2">No Units Registered</h3>
                <p className="text-sm mb-4">Register up to 4 units to teach this semester.</p>
                <button onClick={() => setTab('register')} className="px-5 py-2.5 rounded-xl text-white font-semibold"
                  style={{ background: 'linear-gradient(135deg,#6a1b9a,#9c27b0)' }}>
                  Register Units →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {myUnits.map(u => (
                  <div key={u.id} className="nexus-card overflow-hidden" style={{ borderLeft: '4px solid #6a1b9a' }}>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-lg" style={{ color: '#6a1b9a', fontFamily: 'Playfair Display, serif' }}>
                              {u.code}
                            </span>
                            <span className="badge badge-purple text-xs">{u.credits} cr</span>
                          </div>
                          <h3 className="font-semibold text-gray-800 text-sm">{u.name}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">{u.department?.name}</p>
                          {/* Show which courses this unit belongs to */}
                          {u.course_units && u.course_units.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {u.course_units.map((cu, i) => cu.course && (
                                <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                                  style={{ background: '#ede7f6', color: '#6a1b9a' }}>
                                  {cu.course.code}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button onClick={() => unregisterUnit(u.id, u.code)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
                          style={{ background: '#fce4ec', color: '#c62828' }}>
                          Unregister
                        </button>
                      </div>

                      {(u.timetable || []).length === 0 ? (
                        <p className="text-xs text-gray-400 italic p-2">No timetable slot yet</p>
                      ) : (u.timetable || []).map((t, i) => {
                        const tOvs = overrides[t.id] || []
                        const latest = tOvs[0]
                        const isTemp = latest?.override_type === 'temporary'
                        const isCancelled = latest?.is_cancelled
                        const isPerm = latest?.override_type === 'permanent'
                        return (
                          <div key={i} className="mb-2">
                            <div className="p-3 rounded-xl text-sm"
                              style={{
                                background: isCancelled ? '#fce4ec' : isTemp ? '#fffde7' : '#f8f9ff',
                                border: isCancelled ? '2px solid #e53935' : isTemp ? '2px solid #f9a825' : '1px solid #e8eaf6'
                              }}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs px-2 py-0.5 rounded-full text-white"
                                    style={{ background: TYPE_COLORS[t.session_type] || '#6a1b9a' }}>
                                    {t.session_type}
                                  </span>
                                  <span className="font-semibold text-xs" style={{ color: '#6a1b9a' }}>{t.day_of_week}</span>
                                  <span className="text-xs font-medium text-gray-600">{slotLabel(t.start_time)}</span>
                                </div>
                                {/* Only allow changes via the override flow */}
                                <button onClick={() => { setOverrideModal({ timetableId: t.id, unitCode: u.code }); resetOv() }}
                                  className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                                  style={{ background: '#f3e5f5', color: '#6a1b9a' }}>
                                  ✏️ Report Change
                                </button>
                              </div>
                              <div className="text-xs text-gray-600">
                                📍 {t.venue?.room_number}{t.venue?.name ? ` — ${t.venue.name}` : ''}{t.venue?.building ? `, ${t.venue.building.name}` : ''}
                                <span className="ml-1 text-gray-400">· Cap: {t.venue?.capacity}</span>
                                {t.venue?.building?.has_lift && <span className="ml-1 text-green-600">♿✓</span>}
                              </div>
                              {isPerm && !isCancelled && (
                                <span className="mt-1.5 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                                  style={{ background: '#e8f5e9', color: '#2e7d32' }}>
                                  🔄 Venue altered
                                </span>
                              )}
                              {isTemp && !isCancelled && (
                                <span className="mt-1.5 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                                  style={{ background: '#fffde7', color: '#f57f17' }}>
                                  ⚡ Temp change on {latest.override_date}
                                </span>
                              )}
                              {isCancelled && (
                                <span className="mt-1.5 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                                  style={{ background: '#fce4ec', color: '#c62828' }}>
                                  ❌ Cancelled on {latest?.override_date}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── REGISTER UNIT ── */}
          {tab === 'register' && (
            <div className="max-w-2xl mx-auto">
              <div className="nexus-card p-6" style={{ borderTop: '4px solid #6a1b9a' }}>
                <h2 className="text-lg font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
                  Register a Unit to Teach
                </h2>
                <p className="text-xs text-gray-400 mb-5">
                  Select a course → pick a unit from that course → choose day, session slot and venue.
                  Once registered, the slot is locked.
                </p>

                <div className="space-y-5">

                  {/* Step 1: Course */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-purple-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                      <label className="nexus-label mb-0">Select Degree Course *</label>
                    </div>
                    <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto border rounded-xl p-2" style={{ borderColor: '#e8eaf6' }}>
                      {courses.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Loading courses...</p>}
                      {courses.map(c => (
                        <button key={c.id} onClick={() => { setSelCourse(c.id); setSelUnit('') }}
                          className="w-full p-3 rounded-xl border-2 text-left transition-all"
                          style={{ borderColor: selCourse === c.id ? '#6a1b9a' : '#e0e0ef', background: selCourse === c.id ? '#f3e5f5' : 'white' }}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: selCourse === c.id ? '#6a1b9a' : '#ce93d8' }}>
                              {c.code.slice(0, 3)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm truncate" style={{ color: '#6a1b9a' }}>{c.code} — {c.name}</div>
                            </div>
                            {selCourse === c.id && <span className="text-purple-600 font-bold">✓</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Unit (only show after course is selected) */}
                  {selCourse && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-purple-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                        <label className="nexus-label mb-0">Select Unit from {courses.find(c => c.id === selCourse)?.code} *</label>
                      </div>
                      {filteredAvailable.length === 0 && filteredScheduled.length === 0 ? (
                        <div className="p-4 rounded-xl text-center text-sm text-gray-400"
                          style={{ background: '#f8f9ff', border: '1px solid #e8eaf6' }}>
                          No units available for this course this semester.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto border rounded-xl p-2" style={{ borderColor: '#e8eaf6' }}>
                          {/* Available units */}
                          {filteredAvailable.map(u => (
                            <button key={u.id} onClick={() => setSelUnit(u.id)}
                              className="w-full p-3 rounded-xl border-2 text-left transition-all"
                              style={{ borderColor: selUnit === u.id ? '#6a1b9a' : '#e0e0ef', background: selUnit === u.id ? '#f3e5f5' : 'white' }}>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                  style={{ background: selUnit === u.id ? '#6a1b9a' : '#ce93d8' }}>
                                  {u.code.slice(0, 3)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm" style={{ color: '#6a1b9a' }}>{u.code} — {u.name}</div>
                                  <div className="text-xs text-gray-400">{u.department?.name} · {u.credits} credits · Max {u.max_students} students</div>
                                </div>
                                {selUnit === u.id && <span className="text-purple-600 font-bold">✓</span>}
                              </div>
                            </button>
                          ))}
                          
                          {/* Scheduled units (greyed out) */}
                          {filteredScheduled.length > 0 && (
                            <>
                              {filteredAvailable.length > 0 && <div className="border-t my-2"></div>}
                              <div className="px-2 py-1.5">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Already Scheduled (cannot register):</p>
                              </div>
                              {filteredScheduled.map(u => {
                                const firstSlot = (u.timetable || [])[0]
                                return (
                                  <div key={u.id}
                                    className="w-full p-3 rounded-xl border-2 opacity-60 cursor-not-allowed"
                                    style={{ borderColor: '#d0d0d0', background: '#f5f5f5' }}>
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                        style={{ background: '#999' }}>
                                        {u.code.slice(0, 3)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm text-gray-600">{u.code} — {u.name}</div>
                                        <div className="text-xs text-gray-400">
                                          {u.department?.name} · {u.credits} credits
                                          {firstSlot && (
                                            <span className="ml-2 px-2 py-0.5 rounded-full inline-block"
                                              style={{ background: '#e0e0e0', color: '#666', fontSize: '0.7rem', fontWeight: '600' }}>
                                              📅 {firstSlot.day_of_week} {firstSlot.start_time.slice(0, 5)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3: Day + Slot + Type (only show after unit selected) */}
                  {selUnit && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-6 rounded-full bg-purple-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                        <label className="nexus-label mb-0">Choose Day & Session Slot *</label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Day</label>
                          <select className="nexus-input mt-1 text-sm" value={selDay} onChange={e => setSelDay(e.target.value)}>
                            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Session Type</label>
                          <select className="nexus-input mt-1 text-sm" value={selType} onChange={e => setSelType(e.target.value)}>
                            {SESSION_TYPES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Session Slot (3 hours) *</label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {SESSION_SLOTS.map(s => (
                            <button key={s.start} onClick={() => setSelSlot(s.start)}
                              className="p-3 rounded-xl border-2 text-left transition-all"
                              style={{ borderColor: selSlot === s.start ? '#6a1b9a' : '#e0e0ef', background: selSlot === s.start ? '#f3e5f5' : 'white' }}>
                              <div className="font-bold text-sm" style={{ color: '#6a1b9a' }}>{s.label}</div>
                              <div className="text-xs text-gray-500">{s.display}</div>
                              {selSlot === s.start && <div className="text-xs text-purple-600 font-semibold mt-0.5">Selected ✓</div>}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Venue (only show after slot selected) */}
                  {selUnit && selSlot && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-purple-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
                        <label className="nexus-label mb-0">Select Venue * <span className="text-gray-400 font-normal text-xs">(system checks conflicts)</span></label>
                      </div>
                      <div className="space-y-2 max-h-56 overflow-y-auto border rounded-xl p-2" style={{ borderColor: '#e8eaf6' }}>
                        {venues.map(v => (
                          <button key={v.id} onClick={() => setSelVenue(v.id)}
                            className="w-full p-3 rounded-xl border-2 text-left transition-all"
                            style={{ borderColor: selVenue === v.id ? '#6a1b9a' : '#e0e0ef', background: selVenue === v.id ? '#f3e5f5' : 'white' }}>
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="font-bold text-sm" style={{ color: '#6a1b9a' }}>
                                  {v.room_number}{v.name ? ` — ${v.name}` : ''}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {v.building?.name} · Capacity: {v.capacity}
                                  {v.building?.has_lift ? ' · ♿' : ''}
                                  {v.has_projector ? ' · 📽' : ''}
                                  {v.has_ac ? ' · ❄️' : ''}
                                </div>
                              </div>
                              {selVenue === v.id && <span className="text-purple-600 font-bold flex-shrink-0">✓</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary before registering */}
                  {selUnit && selVenue && selSlot && (
                    <div className="p-4 rounded-xl text-sm" style={{ background: '#f3e5f5', border: '2px solid #6a1b9a' }}>
                      <div className="font-bold text-sm mb-2" style={{ color: '#6a1b9a' }}>📋 Registration Summary</div>
                      <div className="space-y-1 text-xs text-gray-700">
                        <div><strong>Unit:</strong> {available.find(u => u.id === selUnit)?.code} — {available.find(u => u.id === selUnit)?.name}</div>
                        <div><strong>Day:</strong> {selDay} &nbsp;|&nbsp; <strong>Slot:</strong> {SESSION_SLOTS.find(s => s.start === selSlot)?.display}</div>
                        <div><strong>Venue:</strong> {venues.find(v => v.id === selVenue)?.room_number} — {venues.find(v => v.id === selVenue)?.building?.name}</div>
                        <div><strong>Type:</strong> {selType}</div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 italic">⚠️ Once registered this slot is locked. Use "Report Change" to request adjustments.</p>
                    </div>
                  )}

                  <button onClick={registerUnit} disabled={registering || !selUnit || !selVenue || !selSlot}
                    className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#6a1b9a,#9c27b0)' }}>
                    {registering ? '⏳ Registering...' : '📅 Confirm Registration & Create Timetable →'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* OVERRIDE / CHANGE MODAL */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
                  ✏️ Report Timetable Change — {overrideModal.unitCode}
                </h2>
                <button onClick={() => setOverrideModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
              </div>

              <div className="p-3 rounded-xl mb-4 text-xs" style={{ background: '#f3e5f5', color: '#6a1b9a' }}>
                ℹ️ The original registered slot cannot be permanently deleted. Use <strong>Permanent</strong> to update the venue/slot going forward, or <strong>Temporary</strong> for a one-off session change.
              </div>

              <div className="space-y-4">
                {/* Change type */}
                <div>
                  <label className="nexus-label">Change Type *</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {(['temporary', 'permanent'] as const).map(t => (
                      <button key={t} onClick={() => setOvType(t)}
                        className="py-3 rounded-xl text-sm font-semibold transition-all"
                        style={{ background: ovType === t ? '#6a1b9a' : '#f3e5f5', color: ovType === t ? 'white' : '#6a1b9a' }}>
                        {t === 'temporary' ? '⚡ Temporary (one session)' : '🔄 Permanent (update schedule)'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {ovType === 'temporary'
                      ? 'Affects one specific date. Shown in yellow on student timetables.'
                      : 'Updates the regular timetable from now. Shown as "venue altered".'}
                  </p>
                </div>

                {/* Cancel toggle */}
                <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                  style={{ background: '#fce4ec' }}
                  onClick={() => setOvCancelled(!ovCancelled)}>
                  <input type="checkbox" checked={ovCancelled} onChange={() => {}} className="w-4 h-4 rounded pointer-events-none" />
                  <span className="text-sm font-semibold select-none" style={{ color: '#c62828' }}>
                    ❌ I will NOT attend this class (cancel the session)
                  </span>
                </div>

                {ovType === 'temporary' && (
                  <div>
                    <label className="nexus-label">Affected Date * <span className="text-gray-400 font-normal">(the specific session date)</span></label>
                    <input type="date" className="nexus-input mt-1 text-sm" value={ovDate} onChange={e => setOvDate(e.target.value)} />
                  </div>
                )}

                {!ovCancelled && (
                  <>
                    <div>
                      <label className="nexus-label">New Venue {ovType === 'temporary' ? '*' : '(if changing venue)'}</label>
                      <select className="nexus-input mt-1 text-sm" value={ovVenue} onChange={e => setOvVenue(e.target.value)}>
                        <option value="">— Keep existing venue —</option>
                        {venues.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.room_number}{v.name ? ` — ${v.name}` : ''} ({v.building?.name}) · Cap {v.capacity}
                          </option>
                        ))}
                      </select>
                    </div>

                    {ovType === 'temporary' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="nexus-label">New Day (optional)</label>
                          <select className="nexus-input mt-1 text-sm" value={ovDay} onChange={e => setOvDay(e.target.value)}>
                            <option value="">Same day</option>
                            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="nexus-label">New Session Slot (optional)</label>
                          <select className="nexus-input mt-1 text-sm" value={ovSlot} onChange={e => setOvSlot(e.target.value)}>
                            <option value="">Same slot</option>
                            {SESSION_SLOTS.map(s => (
                              <option key={s.start} value={s.start}>{s.label}: {s.display}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {ovType === 'permanent' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="nexus-label">New Day (optional)</label>
                          <select className="nexus-input mt-1 text-sm" value={ovDay} onChange={e => setOvDay(e.target.value)}>
                            <option value="">Same day</option>
                            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="nexus-label">New Session Slot (optional)</label>
                          <select className="nexus-input mt-1 text-sm" value={ovSlot} onChange={e => setOvSlot(e.target.value)}>
                            <option value="">Same slot</option>
                            {SESSION_SLOTS.map(s => (
                              <option key={s.start} value={s.start}>{s.label}: {s.display}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="nexus-label">Reason * <span className="text-gray-400 font-normal">(shown to students)</span></label>
                  <textarea className="nexus-input mt-1 text-sm" rows={3}
                    placeholder="e.g. Emergency, venue under maintenance, room too small for class size..."
                    value={ovReason} onChange={e => setOvReason(e.target.value)} />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setOverrideModal(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: '#f5f5f5', color: '#666' }}>
                    Cancel
                  </button>
                  <button onClick={submitOverride} disabled={submittingOverride}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: ovCancelled ? 'linear-gradient(135deg,#c62828,#e53935)' : 'linear-gradient(135deg,#6a1b9a,#9c27b0)' }}>
                    {submittingOverride ? '⏳...' : ovCancelled ? '❌ Save & Notify Students' : '✅ Save & Notify Students'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
