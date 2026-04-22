'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import { UserRole } from '@/types'
import toast from 'react-hot-toast'

interface Course {
  id: string; code: string; name: string; duration_years: number; description?: string
  department?: { name: string; code: string }
}
interface GradeInfo {
  id: string; score?: number; grade_letter?: string; status: string; result_released_at?: string
}
interface Unit {
  id: string; code: string; name: string; description?: string; credits: number
  semester: string; year: number; max_students: number
  year_of_study?: number; is_required?: boolean; enrolled?: boolean
  lecturer?: { full_name: string }
  department?: { name: string; code: string }
  timetable?: { id?: string; day_of_week: string; start_time: string; end_time: string; session_type: string
    venue?: { room_number: string; name?: string; floor_number: number; building?: { name: string; has_lift: boolean } } }[]
  // New fields from updated API
  enrollment_status?: string | null
  grade?: GradeInfo | null
  status_color?: string
  status_label?: string
  can_enroll?: boolean
  can_retake?: boolean
}

const dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export default function StudentUnitsPage() {
  const { data: session, update, status } = useSession()
  const user = session?.user as any

  // Use local state for course_id so it updates immediately after registration
  const [myCourseId, setMyCourseId] = useState<string | null>(null)
  const [myYearOfStudy, setMyYearOfStudy] = useState(1)
  const [courseChecked, setCourseChecked] = useState(false)

  const hasCourse = !!(myCourseId)

  const [view, setView] = useState<'my_units'|'browse'|'course_setup'>('course_setup')
  const [courses, setCourses] = useState<Course[]>([])
  const [myUnits, setMyUnits] = useState<Unit[]>([])
  const [available, setAvailable] = useState<Unit[]>([])
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())
  const [selCourse, setSelCourse] = useState('')
  const [selYear, setSelYear] = useState(1)
  const [filterYear, setFilterYear] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [enrolling, setEnrolling] = useState<string|null>(null)
  const [dropping, setDropping] = useState<string|null>(null)
  const [expanded, setExpanded] = useState<string|null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Step 1: Fetch the student's actual course from DB (don't trust session alone)
  useEffect(() => {
    async function checkCourse() {
      if (status === 'loading') return
      // Fetch fresh from a dedicated endpoint
      try {
        const r = await fetch('/api/student/profile')
        const d = await r.json()
        if (d.success && d.data?.course_id) {
          setMyCourseId(d.data.course_id)
          setMyYearOfStudy(d.data.year_of_study || 1)
          setView('my_units')
        } else {
          // Fallback: use session value if available
          const sessionCourseId = user?.course_id
          if (sessionCourseId) {
            setMyCourseId(sessionCourseId)
            setMyYearOfStudy(user?.year_of_study || 1)
            setView('my_units')
          } else {
            setView('course_setup')
          }
        }
      } catch {
        const sessionCourseId = user?.course_id
        if (sessionCourseId) {
          setMyCourseId(sessionCourseId)
          setMyYearOfStudy(user?.year_of_study || 1)
          setView('my_units')
        }
      }
      setCourseChecked(true)
    }
    checkCourse()
  }, [status, user?.course_id])

  useEffect(() => { fetchCourses() }, [])

  useEffect(() => {
    if (hasCourse && courseChecked) fetchMyUnits(statusFilter)
  }, [hasCourse, courseChecked, statusFilter])

  useEffect(() => {
    if (view === 'browse' && myCourseId) fetchAvailable()
  }, [view, myCourseId])

  async function fetchCourses() {
    const r = await fetch('/api/courses')
    const d = await r.json()
    if (d.success) setCourses(d.data)
  }

  async function fetchMyUnits(status = 'all') {
    try {
      const query = status && status !== 'all' ? `?status=${status}` : ''
      const r = await fetch(`/api/units/enrolled${query}`)
      if (!r.ok) {
        console.error('Failed to fetch enrolled units:', r.status, r.statusText)
        toast.error('Failed to load enrolled units')
        return
      }
      const d = await r.json()
      if (d.success) {
        setMyUnits(d.data || [])
      } else {
        console.error('API returned error:', d.error)
        toast.error(d.error || 'Failed to load units')
      }
    } catch (error) {
      console.error('Error fetching enrolled units:', error)
      toast.error('Error loading enrolled units')
    }
  }

  async function fetchAvailable() {
    setLoading(true)
    const courseId = myCourseId || ''
    const params = new URLSearchParams()
    if (courseId) params.set('course_id', courseId)
    const r = await fetch(`/api/units/available?${params}`)
    const d = await r.json()
    if (d.success) {
      setAvailable(d.data)
      setEnrolledIds(new Set(d.enrolled_ids || []))
    }
    setLoading(false)
  }

  async function registerCourse() {
    if (!selCourse) { toast.error('Please select a course'); return }
    setLoading(true)
    const r = await fetch('/api/courses', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ course_id: selCourse, year_of_study: selYear })
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) {
      toast.success('🎓 Course registered! Now browse and enroll in units.')
      // Update local state immediately — don't wait for session refresh
      setMyCourseId(selCourse)
      setMyYearOfStudy(selYear)
      setView('browse')
      // Also update session in background
      await update()
      fetchMyUnits()
    } else {
      toast.error(d.error || 'Failed to register course')
    }
  }

  async function enroll(unitId: string, code: string) {
    setEnrolling(unitId)
    const r = await fetch('/api/enrollments', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ unit_id: unitId })
    })
    const d = await r.json()
    setEnrolling(null)
    if (d.success) {
      toast.success('✅ Enrolled in ' + code)
      setEnrolledIds(p => new Set([...p, unitId]))
      setAvailable(p => p.map(u => u.id === unitId ? {...u, enrolled: true} : u))
      fetchMyUnits()
    } else toast.error(d.error || 'Failed to enroll')
  }

  async function dropUnit(unitId: string, code: string) {
    if (!confirm(`Drop ${code}? You can re-enroll later.`)) return
    setDropping(unitId)
    const r = await fetch('/api/enrollments', {
      method: 'DELETE',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ unit_id: unitId })
    })
    const d = await r.json()
    setDropping(null)
    if (d.success) {
      toast.success('Dropped ' + code)
      setEnrolledIds(p => { const s = new Set(p); s.delete(unitId); return s })
      setAvailable(p => p.map(u => u.id === unitId ? {...u, enrolled: false} : u))
      fetchMyUnits()
    } else toast.error(d.error || 'Failed to drop unit')
  }

  async function changeCourse() {
    if (!confirm('Change your registered course? Your existing unit enrollments will NOT be affected, but you should review them.')) return
    setMyCourseId(null)
    setView('course_setup')
    setSelCourse('')
  }

  const totalCredits = myUnits.reduce((s, u) => s + (u.credits || 0), 0)
  const myCourse = courses.find(c => c.id === myCourseId)
  
  // Filter units by status
  const filteredUnits = statusFilter === 'all' ? myUnits : myUnits.filter(u => (u.status_color || 'blue') === statusFilter)
  
  const filtered = available.filter(u => {
    const yr = filterYear === 0 || (u.year_of_study || 1) === filterYear
    const sr = !search || u.code.toLowerCase().includes(search.toLowerCase()) || u.name.toLowerCase().includes(search.toLowerCase())
    return yr && sr
  })

  if (status === 'loading' || !courseChecked) {
    return (
      <div className="flex h-screen overflow-hidden" style={{background:'#f8f9ff'}}>
        <Sidebar role="student" userName="" userEmail="" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-3">⏳</div>
            <p>Loading your units...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{background:'#f8f9ff'}}>
      <Sidebar role={(user?.role || 'student') as UserRole} userName={user?.name || ''} userEmail={user?.email || ''} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{fontFamily:'Playfair Display, serif',color:'#1a237e'}}>
                📚 My Units
              </h1>
              {myCourse && (
                <p className="text-xs md:text-sm text-gray-500 mt-1">
                  {myCourse.code} · {myCourse.name} · Year {myYearOfStudy}
                  <button onClick={changeCourse} className="ml-2 text-xs underline text-blue-500">Change course</button>
                </p>
              )}
            </div>
            {hasCourse && (
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setView('my_units')}
                  className="px-3 md:px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{background:view==='my_units'?'#1a237e':'#e8eaf6',color:view==='my_units'?'white':'#1a237e'}}>
                  Enrolled ({myUnits.length})
                </button>
                <button onClick={() => setView('browse')}
                  className="px-3 md:px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{background:view==='browse'?'#1a237e':'#e8eaf6',color:view==='browse'?'white':'#1a237e'}}>
                  + Browse & Register
                </button>
              </div>
            )}
          </div>

          {/* ── COURSE SETUP ── */}
          {view === 'course_setup' && (
            <div className="max-w-2xl mx-auto">
              <div className="nexus-card p-6 md:p-8" style={{borderTop:'4px solid #1a237e'}}>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-3">🎓</div>
                  <h2 className="text-xl font-bold" style={{fontFamily:'Playfair Display, serif',color:'#1a237e'}}>
                    Register Your Degree Course
                  </h2>
                  <p className="text-gray-500 text-sm mt-2">
                    Choose your degree programme. You can only be registered to one course at a time.
                  </p>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="nexus-label">Degree Programme *</label>
                    <div className="space-y-2 mt-2">
                      {courses.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">Loading courses...</p>
                      )}
                      {courses.map(c => (
                        <button key={c.id} onClick={() => setSelCourse(c.id)}
                          className="w-full p-4 rounded-xl border-2 text-left transition-all"
                          style={{borderColor:selCourse===c.id?'#1a237e':'#e0e0ef',background:selCourse===c.id?'#e8eaf6':'white'}}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{background:selCourse===c.id?'#1a237e':'#c5cae9'}}>
                              {c.code.slice(0,3)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm truncate" style={{color:'#1a237e'}}>{c.code} — {c.name}</div>
                              <div className="text-xs text-gray-500">{c.department?.name} · {c.duration_years} years</div>
                            </div>
                            {selCourse===c.id && <span className="text-green-600 font-bold flex-shrink-0">✓</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="nexus-label">Year of Study *</label>
                    <div className="grid grid-cols-4 gap-2 mt-1">
                      {[1,2,3,4].map(y => (
                        <button key={y} onClick={() => setSelYear(y)}
                          className="py-2.5 rounded-xl text-sm font-semibold transition-all"
                          style={{background:selYear===y?'#1a237e':'#e8eaf6',color:selYear===y?'white':'#1a237e'}}>
                          Year {y}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={registerCourse} disabled={!selCourse || loading}
                    className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-50"
                    style={{background:'linear-gradient(135deg,#1a237e,#3949ab)'}}>
                    {loading ? '⏳ Registering...' : '🎓 Register Course & Browse Units →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── MY ENROLLED UNITS ── */}
          {view === 'my_units' && (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_0.95fr] gap-4 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {label:'Enrolled Units',value:filteredUnits.length,icon:'📚',color:'#1a237e'},
                    {label:'Total Credits',value:filteredUnits.reduce((s, u) => s + (u.credits || 0), 0),icon:'⭐',color:'#6a1b9a'},
                    {label:'Semester',value:'Sem 1 2026',icon:'📅',color:'#2e7d32'},
                    {label:'Course',value:myCourse?.code||'—',icon:'🎓',color:'#e65100'},
                  ].map(s => (
                    <div key={s.label} className="nexus-card p-4 text-center">
                      <div className="text-2xl mb-1">{s.icon}</div>
                      <div className="font-bold text-base md:text-lg" style={{color:s.color}}>{s.value}</div>
                      <div className="text-xs text-gray-500">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="nexus-card p-4">
                  <p className="text-xs font-semibold text-gray-600 mb-3 uppercase">Filter by Status</p>
                  <div className="grid grid-cols-3 md:grid-cols-2 gap-2">
                    {[
                      { value: 'all', label: 'All', emoji: '⚪' },
                      { value: 'blue', label: 'Required', emoji: '🔵' },
                      { value: 'yellow', label: 'In Progress', emoji: '🟡' },
                      { value: 'green', label: 'Completed (Pass)', emoji: '🟢' },
                      { value: 'red', label: 'Need Retake', emoji: '🔴' },
                      { value: 'purple', label: 'Not Registered', emoji: '🟣' }
                    ].map(s => (
                      <button
                        key={s.value}
                        onClick={() => setStatusFilter(s.value)}
                        className="p-3 rounded-xl border-2 transition-all text-center"
                        style={{
                          borderColor: statusFilter === s.value ? '#1a237e' : '#e0e0ef',
                          background: statusFilter === s.value ? '#e8eaf6' : 'white'
                        }}
                      >
                        <div className="text-lg mb-1">{s.emoji}</div>
                        <div className="text-xs font-semibold" style={{ color: statusFilter === s.value ? '#1a237e' : '#999' }}>
                          {s.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status Color Legend */}
              <div className="nexus-card p-4 mb-5 grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { color: 'blue', label: 'Required', emoji: '🔵' },
                  { color: 'yellow', label: 'In Progress', emoji: '🟡' },
                  { color: 'green', label: 'Completed (Pass)', emoji: '🟢' },
                  { color: 'red', label: 'Need Retake', emoji: '🔴' },
                  { color: 'purple', label: 'Not Registered', emoji: '🟣' }
                ].map(s => (
                  <div key={s.color} className="flex items-center gap-2 text-xs">
                    <span className="text-lg">{s.emoji}</span>
                    <span className="font-semibold text-gray-700">{s.label}</span>
                  </div>
                ))}
              </div>

              {myUnits.length === 0 ? (
                <div className="nexus-card p-12 text-center text-gray-400">
                  <div className="text-5xl mb-4">📭</div>
                  <h3 className="text-lg font-semibold mb-2">No Units Enrolled</h3>
                  <p className="text-sm mb-4">Browse and enroll in units for your course.</p>
                  <button onClick={() => setView('browse')}
                    className="px-5 py-2.5 rounded-xl text-white font-semibold"
                    style={{background:'linear-gradient(135deg,#1a237e,#3949ab)'}}>
                    Browse Units →
                  </button>
                </div>
              ) : filteredUnits.length === 0 ? (
                <div className="nexus-card p-12 text-center text-gray-400">
                  <div className="text-5xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold mb-2">No Units Match Filter</h3>
                  <p className="text-sm mb-4">Try adjusting your status filters.</p>
                  <button onClick={() => setStatusFilter('all')}
                    className="px-5 py-2.5 rounded-xl text-white font-semibold"
                    style={{background:'linear-gradient(135deg,#1a237e,#3949ab)'}}>
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredUnits.map(u => {
                    const colorMap: {[key: string]: string} = {
                      'blue': '#2196f3',    // Required
                      'yellow': '#ffc107', // In progress
                      'green': '#4caf50',   // Completed pass
                      'red': '#f44336',     // Failed/retake
                      'purple': '#9c27b0',  // Not registered
                      'gray': '#9e9e9e'     // Grade pending
                    }
                    const bgColorMap: {[key: string]: string} = {
                      'blue': '#e3f2fd',
                      'yellow': '#fff9c4',
                      'green': '#e8f5e9',
                      'red': '#ffebee',
                      'purple': '#f3e5f5',
                      'gray': '#f5f5f5'
                    }
                    const borderColor = colorMap[u.status_color || 'blue'] || '#2196f3'
                    const bgColor = bgColorMap[u.status_color || 'blue'] || '#e3f2fd'
                    
                    return (
                      <div key={u.id} className="nexus-card p-5 overflow-hidden" style={{borderLeft:`5px solid ${borderColor}`, background: bgColor}}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-bold" style={{color:'#1a237e'}}>{u.code}</span>
                              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white" style={{background: borderColor}}>
                                {u.status_label || 'Enrolled'}
                              </span>
                              <span className="badge badge-purple text-xs">{u.credits} cr</span>
                            </div>
                            <p className="font-semibold text-sm text-gray-800">{u.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{u.lecturer?.full_name || 'Lecturer TBA'}</p>
                          </div>
                          <button onClick={() => dropUnit(u.id, u.code)} disabled={dropping===u.id}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 transition-all"
                            style={{background:'#fce4ec',color:'#c62828'}}>
                            {dropping===u.id ? '...' : 'Drop'}
                          </button>
                        </div>

                        {/* Grade info if available */}
                        {u.grade && (
                          <div className="mb-3 p-2.5 rounded-lg text-xs" style={{background: 'rgba(0,0,0,0.05)'}}>
                            {u.grade.score && (
                              <div className="font-semibold text-gray-800">
                                Score: {u.grade.score}/100 {u.grade.grade_letter && `(${u.grade.grade_letter})`}
                              </div>
                            )}
                            {u.grade.result_released_at && (
                              <div className="text-gray-600 text-xs mt-1">
                                Grade released: {new Date(u.grade.result_released_at).toLocaleDateString()}
                              </div>
                            )}
                            {u.grade.status && (
                              <div className="text-gray-600 text-xs mt-1">
                                Status: {u.grade.status.replace(/_/g, ' ')}
                              </div>
                            )}
                          </div>
                        )}

                        {u.timetable && u.timetable.length > 0 && (
                          <div className="space-y-1.5">
                            {u.timetable.sort((a,b) => dayOrder.indexOf(a.day_of_week)-dayOrder.indexOf(b.day_of_week)).map((t, i) => (
                              <div key={i} className="flex items-center gap-2 p-2 rounded-lg text-xs" style={{background:'rgba(0,0,0,0.03)',border:`1px solid ${borderColor}20`}}>
                                <span className="font-bold w-10 flex-shrink-0" style={{color: borderColor}}>{t.day_of_week.slice(0,3)}</span>
                                <span className="text-gray-600">{t.start_time.slice(0,5)}–{t.end_time.slice(0,5)}</span>
                                <span className="flex-1 truncate text-gray-700">{t.venue?.name||t.venue?.room_number||'Venue TBA'}{t.venue?.building?`, ${t.venue.building.name}`:''}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <a href="/student/materials" className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{background:'#e8eaf6',color:'#1a237e'}}>📁 Materials</a>
                          <a href="/student/forums" className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{background:'#f3e5f5',color:'#6a1b9a'}}>💬 Forum</a>
                          <a href="/student/timetable" className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{background:'#e8f5e9',color:'#2e7d32'}}>📅 Timetable</a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── CURRICULUM BROWSER ── */}
          {view === 'browse' && (
            <div>
              {/* Legend */}
              <div className="nexus-card p-4 mb-5 grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { color: 'blue', label: 'Required', emoji: '🔵' },
                  { color: 'yellow', label: 'In Progress', emoji: '🟡' },
                  { color: 'green', label: 'Completed (Pass)', emoji: '🟢' },
                  { color: 'red', label: 'Need Retake', emoji: '🔴' },
                  { color: 'purple', label: 'Not Registered', emoji: '🟣' }
                ].map(s => (
                  <div key={s.color} className="flex items-center gap-2 text-xs">
                    <span className="text-lg">{s.emoji}</span>
                    <span className="font-semibold text-gray-700">{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Search & Filter */}
              <div className="nexus-card p-3 md:p-4 mb-5 flex items-center gap-3 flex-wrap">
                <input 
                  className="nexus-input flex-1 text-sm min-w-40" 
                  placeholder="Search by code or name..."
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
                <select 
                  className="nexus-input text-sm" 
                  style={{width:'auto'}} 
                  value={filterYear} 
                  onChange={e => setFilterYear(parseInt(e.target.value))}
                >
                  <option value={0}>All Years</option>
                  {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
                <span className="text-xs text-gray-600 flex-shrink-0 font-semibold">
                  {filtered.length} units
                </span>
              </div>

              {loading ? (
                <div className="nexus-card text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">⏳</div>
                  <p>Loading curriculum...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="nexus-card p-12 text-center text-gray-400">
                  <div className="text-4xl mb-3">🔍</div>
                  <h3 className="text-lg font-semibold mb-2">No Units Found</h3>
                  <p className="text-sm">
                    {available.length === 0
                      ? `No units are linked to your course (${myCourse?.code}). Please contact admin.`
                      : 'Try adjusting your search filters.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {[1,2,3,4].map(yr => {
                    const yUnits = filtered.filter(u => (u.year_of_study||0) === yr)
                    if (!yUnits.length) return null
                    return (
                      <div key={yr}>
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                          YEAR {yr}
                          <span className="text-xs font-normal text-gray-500">({yUnits.length} units)</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {yUnits.map(u => {
                            const isExp = expanded === u.id
                            const colorMap: {[key: string]: string} = {
                              'blue': '#2196f3',    // Required
                              'yellow': '#ffc107', // In progress
                              'green': '#4caf50',   // Completed pass
                              'red': '#f44336',     // Need retake
                              'purple': '#9c27b0',  // Not registered
                              'gray': '#9e9e9e'    // Grade pending
                            }
                            const bgColorMap: {[key: string]: string} = {
                              'blue': '#e3f2fd',
                              'yellow': '#fff9c4',
                              'green': '#e8f5e9',
                              'red': '#ffebee',
                              'purple': '#f3e5f5',
                              'gray': '#f5f5f5'
                            }
                            const borderColor = colorMap[u.status_color || 'blue'] || '#2196f3'
                            const bgColor = bgColorMap[u.status_color || 'blue'] || '#e3f2fd'
                            
                            return (
                              <div 
                                key={u.id} 
                                className="nexus-card overflow-hidden transition-all hover:shadow-md"
                                style={{borderLeft:`5px solid ${borderColor}`, background: bgColor}}
                              >
                                <div className="p-4">
                                  <div className="flex items-start gap-2 mb-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                        <span className="font-bold text-sm" style={{color:'#1a237e'}}>{u.code}</span>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{background: borderColor}}>
                                          {u.status_label}
                                        </span>
                                        <span className="badge badge-purple text-xs">{u.credits} cr</span>
                                        {u.is_required && <span className="badge badge-orange text-xs">Required</span>}
                                      </div>
                                      <p className="text-sm font-semibold text-gray-800 leading-snug">{u.name}</p>
                                      <p className="text-xs text-gray-600 mt-1">{u.lecturer?.full_name||'Lecturer TBA'}</p>
                                    </div>
                                  </div>

                                  {/* Grade info if available */}
                                  {u.grade && (
                                    <div className="mb-3 p-2 rounded-lg text-xs" style={{background: 'rgba(0,0,0,0.05)'}}>
                                      {u.grade.score && (
                                        <div className="font-semibold">
                                          Score: {u.grade.score}/100 {u.grade.grade_letter && `(${u.grade.grade_letter})`}
                                        </div>
                                      )}
                                      {u.grade.result_released_at && (
                                        <div className="text-gray-600 text-xs mt-1">
                                          Grade released: {new Date(u.grade.result_released_at).toLocaleDateString()}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Action buttons */}
                                  <div className="flex gap-2">
                                    {u.enrollment_status === 'active' ? (
                                      <button 
                                        onClick={() => dropUnit(u.id, u.code)} 
                                        disabled={dropping===u.id}
                                        className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                        style={{background:'#fce4ec',color:'#c62828'}}>
                                        {dropping===u.id ? '...' : '✕ Drop'}
                                      </button>
                                    ) : u.can_retake ? (
                                      <button 
                                        onClick={() => enroll(u.id, u.code)} 
                                        disabled={enrolling===u.id}
                                        className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white"
                                        style={{background:'#ff6f00'}}>
                                        {enrolling===u.id ? '...' : '🔄 Retake'}
                                      </button>
                                    ) : u.can_enroll ? (
                                      <button 
                                        onClick={() => enroll(u.id, u.code)} 
                                        disabled={enrolling===u.id}
                                        className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white"
                                        style={{background:'linear-gradient(135deg,#1a237e,#3949ab)'}}>
                                        {enrolling===u.id ? '...' : '+ Enroll'}
                                      </button>
                                    ) : (
                                      <button 
                                        disabled
                                        className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                        style={{background:'#e0e0e0',color:'#999'}}>
                                        Not Available
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => setExpanded(isExp ? null : u.id)}
                                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                      style={{background:'#f5f5f5',color:'#666'}}>
                                      {isExp ? '▲' : 'ℹ'}
                                    </button>
                                  </div>

                                  {/* Expandable details */}
                                  {isExp && (
                                    <div className="mt-3 space-y-2 border-t pt-2">
                                      {u.description && (
                                        <p className="text-xs text-gray-700 leading-relaxed p-2 rounded-lg" style={{background:'rgba(0,0,0,0.03)'}}>
                                          {u.description}
                                        </p>
                                      )}
                                      {u.timetable && u.timetable.length > 0
                                        ? (
                                          <div>
                                            <div className="text-xs font-semibold text-gray-600 mb-1">Schedule:</div>
                                            {u.timetable.sort((a,b) => dayOrder.indexOf(a.day_of_week)-dayOrder.indexOf(b.day_of_week)).map((t, i) => (
                                              <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded" style={{background:'rgba(0,0,0,0.03)'}}>
                                                <span className="font-bold w-12 flex-shrink-0" style={{color:'#1a237e'}}>
                                                  {t.day_of_week.slice(0,3)}
                                                </span>
                                                <span className="text-gray-600">
                                                  {t.start_time.slice(0,5)}–{t.end_time.slice(0,5)}
                                                </span>
                                                <span className="flex-1 truncate text-gray-700">
                                                  📍 {t.venue?.name||t.venue?.room_number||'TBA'}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        )
                                        : <p className="text-xs text-gray-500 italic p-1">No schedule assigned yet</p>
                                      }
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
