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
interface Unit {
  id: string; code: string; name: string; description?: string; credits: number
  semester: string; year: number; max_students: number
  year_of_study?: number; is_required?: boolean; enrolled?: boolean
  lecturer?: { full_name: string }
  department?: { name: string; code: string }
  timetable?: { id?: string; day_of_week: string; start_time: string; end_time: string; session_type: string
    venue?: { room_number: string; name?: string; floor_number: number; building?: { name: string; has_lift: boolean } } }[]
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
    if (hasCourse && courseChecked) fetchMyUnits()
  }, [hasCourse, courseChecked])

  useEffect(() => {
    if (view === 'browse' && myCourseId) fetchAvailable()
  }, [view, myCourseId])

  async function fetchCourses() {
    const r = await fetch('/api/courses')
    const d = await r.json()
    if (d.success) setCourses(d.data)
  }

  async function fetchMyUnits() {
    const r = await fetch('/api/units/enrolled')
    const d = await r.json()
    if (d.success) setMyUnits(d.data)
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  {label:'Enrolled Units',value:myUnits.length,icon:'📚',color:'#1a237e'},
                  {label:'Total Credits',value:totalCredits,icon:'⭐',color:'#6a1b9a'},
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
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {myUnits.map(u => (
                    <div key={u.id} className="nexus-card p-5" style={{borderLeft:'4px solid #2e7d32'}}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold" style={{color:'#1a237e'}}>{u.code}</span>
                            <span className="badge badge-purple text-xs">{u.credits} cr</span>
                          </div>
                          <p className="font-semibold text-sm">{u.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{u.lecturer?.full_name || 'Lecturer TBA'}</p>
                        </div>
                        <button onClick={() => dropUnit(u.id, u.code)} disabled={dropping===u.id}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
                          style={{background:'#fce4ec',color:'#c62828'}}>
                          {dropping===u.id ? '...' : 'Drop'}
                        </button>
                      </div>
                      {u.timetable && u.timetable.length > 0 && (
                        <div className="space-y-1.5">
                          {u.timetable.sort((a,b) => dayOrder.indexOf(a.day_of_week)-dayOrder.indexOf(b.day_of_week)).map((t, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 rounded-lg text-xs" style={{background:'#fafbff',border:'1px solid #e8eaf6'}}>
                              <span className="font-bold w-10 flex-shrink-0" style={{color:'#1a237e'}}>{t.day_of_week.slice(0,3)}</span>
                              <span className="text-gray-500">{t.start_time.slice(0,5)}–{t.end_time.slice(0,5)}</span>
                              <span className="flex-1 truncate text-gray-600">{t.venue?.name||t.venue?.room_number||'Venue TBA'}{t.venue?.building?`, ${t.venue.building.name}`:''}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        <a href="/student/materials" className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{background:'#e8eaf6',color:'#1a237e'}}>📁 Materials</a>
                        <a href="/student/forums" className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{background:'#f3e5f5',color:'#6a1b9a'}}>💬 Forum</a>
                        <a href="/student/timetable" className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{background:'#e8f5e9',color:'#2e7d32'}}>📅 Timetable</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── BROWSE & REGISTER ── */}
          {view === 'browse' && (
            <div>
              <div className="nexus-card p-3 md:p-4 mb-5 flex items-center gap-3 flex-wrap">
                <input className="nexus-input flex-1 text-sm min-w-40" placeholder="Search by code or name..."
                  value={search} onChange={e => setSearch(e.target.value)} />
                <select className="nexus-input text-sm" style={{width:'auto'}} value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))}>
                  <option value={0}>All Years</option>
                  {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {filtered.filter(u => u.enrolled||enrolledIds.has(u.id)).length} enrolled · {filtered.filter(u => !u.enrolled&&!enrolledIds.has(u.id)).length} available
                </span>
              </div>

              {myUnits.length > 0 && (
                <div className="p-3 rounded-xl mb-4 text-sm" style={{background:'#e8f5e9',borderLeft:'4px solid #2e7d32'}}>
                  <strong className="text-green-800">✅ You have {myUnits.length} units ({totalCredits} credits).</strong>
                  <span className="text-green-700"> Enroll in more or drop units below.</span>
                </div>
              )}

              {loading ? (
                <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">⏳</div><p>Loading units...</p></div>
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
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 px-1">Year {yr}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {yUnits.map(u => {
                            const isEnrolled = enrolledIds.has(u.id) || !!u.enrolled
                            const isExp = expanded === u.id
                            return (
                              <div key={u.id} className="nexus-card overflow-hidden"
                                style={{borderLeft:`4px solid ${isEnrolled?'#2e7d32':'#c5cae9'}`}}>
                                <div className="p-4">
                                  <div className="flex items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                        <span className="font-bold text-sm" style={{color:'#1a237e'}}>{u.code}</span>
                                        <span className="badge badge-purple text-xs">{u.credits}cr</span>
                                        {u.is_required && <span className="badge badge-orange text-xs">Required</span>}
                                        {isEnrolled && <span className="badge badge-green text-xs">✓ Enrolled</span>}
                                      </div>
                                      <p className="text-sm font-medium text-gray-800 leading-snug">{u.name}</p>
                                      <p className="text-xs text-gray-400 mt-0.5">{u.lecturer?.full_name||'Lecturer TBA'}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 flex-shrink-0">
                                      {isEnrolled ? (
                                        <button onClick={() => dropUnit(u.id, u.code)} disabled={dropping===u.id}
                                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                          style={{background:'#fce4ec',color:'#c62828'}}>
                                          {dropping===u.id ? '...' : 'Drop'}
                                        </button>
                                      ) : (
                                        <button onClick={() => enroll(u.id, u.code)} disabled={enrolling===u.id}
                                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white"
                                          style={{background:'linear-gradient(135deg,#1a237e,#3949ab)'}}>
                                          {enrolling===u.id ? '...' : '+Enroll'}
                                        </button>
                                      )}
                                      <button onClick={() => setExpanded(isExp ? null : u.id)}
                                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                        style={{background:'#f5f5f5',color:'#666'}}>
                                        {isExp ? '▲' : 'Info'}
                                      </button>
                                    </div>
                                  </div>
                                  {isExp && (
                                    <div className="mt-3 space-y-2">
                                      {u.description && (
                                        <p className="text-xs text-gray-600 leading-relaxed p-2 rounded-lg" style={{background:'#f8f9ff'}}>{u.description}</p>
                                      )}
                                      {u.timetable && u.timetable.length > 0
                                        ? u.timetable.sort((a,b) => dayOrder.indexOf(a.day_of_week)-dayOrder.indexOf(b.day_of_week)).map((t, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg" style={{background:'#f0f2ff'}}>
                                              <span className="font-bold w-10 flex-shrink-0" style={{color:'#1a237e'}}>{t.day_of_week.slice(0,3)}</span>
                                              <span>{t.start_time.slice(0,5)}–{t.end_time.slice(0,5)}</span>
                                              <span className="flex-1 truncate">📍 {t.venue?.name||t.venue?.room_number||'TBA'}</span>
                                            </div>
                                          ))
                                        : <p className="text-xs text-gray-400 italic p-2">No timetable assigned yet.</p>
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
                  {/* Units with no year_of_study */}
                  {(() => {
                    const other = filtered.filter(u => !u.year_of_study)
                    if (!other.length) return null
                    return (
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 px-1">Other Units</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {other.map(u => {
                            const isEnrolled = enrolledIds.has(u.id)||!!u.enrolled
                            return (
                              <div key={u.id} className="nexus-card p-4" style={{borderLeft:`4px solid ${isEnrolled?'#2e7d32':'#e0e0ef'}`}}>
                                <div className="flex items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                      <span className="font-bold text-sm" style={{color:'#1a237e'}}>{u.code}</span>
                                      <span className="badge badge-purple text-xs">{u.credits}cr</span>
                                      {isEnrolled && <span className="badge badge-green text-xs">✓</span>}
                                    </div>
                                    <p className="text-sm font-medium text-gray-800">{u.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{u.lecturer?.full_name||'TBA'}</p>
                                  </div>
                                  {isEnrolled ? (
                                    <button onClick={() => dropUnit(u.id, u.code)}
                                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                                      style={{background:'#fce4ec',color:'#c62828'}}>Drop</button>
                                  ) : (
                                    <button onClick={() => enroll(u.id, u.code)} disabled={enrolling===u.id}
                                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white flex-shrink-0"
                                      style={{background:'linear-gradient(135deg,#1a237e,#3949ab)'}}>
                                      {enrolling===u.id ? '...' : '+Enroll'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
