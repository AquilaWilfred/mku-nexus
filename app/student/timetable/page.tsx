'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import { UserRole } from '@/types'
import toast from 'react-hot-toast'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const SLOTS = [
  { label:'07:00–10:00', start:'07:00', end:'10:00' },
  { label:'10:00–13:00', start:'10:00', end:'13:00' },
  { label:'13:00–16:00', start:'13:00', end:'16:00' },
  { label:'16:00–19:00', start:'16:00', end:'19:00' },
]
const typeColors: Record<string,{bg:string,border:string,text:string}> = {
  lecture:  { bg:'#eff6ff',  border:'#1a237e', text:'#1a237e' },
  lab:      { bg:'#faf5ff',  border:'#6a1b9a', text:'#6a1b9a' },
  tutorial: { bg:'#f0fdf4',  border:'#2e7d32', text:'#2e7d32' },
  exam:     { bg:'#fef2f2',  border:'#c62828', text:'#c62828' },
}

interface TimetableClass {
  unit: { code:string; name:string; lecturer:{ full_name:string; email?:string }; credits?:number }
  day_of_week:string; start_time:string; end_time:string; session_type:string
  timetable_id:string
  venue?:{ room_number:string; name:string; floor_number:number; is_accessible:boolean; building?:{ name:string; has_lift:boolean } }
}

interface Override {
  id:string; timetable_id:string; override_type:string; override_date?:string
  new_day_of_week?:string; new_start_time?:string; new_end_time?:string
  reason:string; is_cancelled:boolean; created_at:string
  new_venue?:{ room_number:string; name:string; floor_number:number; building?:{ name:string; has_lift:boolean } }
}

interface Poll {
  id:string; question:string; poll_type:string; is_active:boolean; expires_at?:string
  unit:{ code:string; name:string }
  options:{ id:string; option_text:string; votes_count:number }[]
  my_vote?:string|null
}

export default function StudentTimetable() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [allClasses, setAllClasses] = useState<TimetableClass[]>([])
  const [overrides, setOverrides] = useState<{[timetableId:string]: Override[]}>({})
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<TimetableClass | null>(null)
  const [votingPoll, setVotingPoll] = useState<Poll | null>(null)
  const [selectedOption, setSelectedOption] = useState('')
  const [votingLoading, setVotingLoading] = useState(false)
  const [bgRefreshing, setBgRefreshing] = useState(false)
  const refreshTimerRef = useRef<NodeJS.Timeout>()
  const today = new Date().toLocaleDateString('en-US', { weekday:'long' })

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setBgRefreshing(true)
    try {
      const [enrollRes, pollsRes] = await Promise.all([
        fetch('/api/units/enrolled'),
        fetch('/api/polls'),
      ])
      const [enrollData, pollsData] = await Promise.all([enrollRes.json(), pollsRes.json()])

      if (enrollData.success) {
        const classes: TimetableClass[] = []
        for (const u of (enrollData.data || [])) {
          for (const t of (u.timetable || [])) {
            classes.push({ ...t, unit: { code:u.code, name:u.name, lecturer:u.lecturer, credits:u.credits }, timetable_id: t.id })
          }
        }
        // Silent update: replace state without any flash
        setAllClasses(classes)
        const ids = [...new Set(classes.map(c => c.timetable_id))]
        const overrideResults = await Promise.all(ids.map(id =>
          fetch(`/api/timetable/override?timetable_id=${id}`).then(r => r.json())
        ))
        const newOverrides: {[k:string]: Override[]} = {}
        ids.forEach((id, i) => { if (overrideResults[i].success) newOverrides[id] = overrideResults[i].data || [] })
        setOverrides(newOverrides)
      }

      if (pollsData.success) setPolls(pollsData.data || [])
    } catch {}
    finally {
      if (!silent) setLoading(false)
      else setBgRefreshing(false)
    }
  }, [])

  // Initial load + background refresh every 60s
  useEffect(() => {
    fetchData(false)
    refreshTimerRef.current = setInterval(() => fetchData(true), 60000)
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current) }
  }, [fetchData])

  function getClassOverride(cls: TimetableClass): Override | null {
    const ovs = overrides[cls.timetable_id] || []
    return ovs[0] || null
  }

  function getClassPoll(cls: TimetableClass): Poll | null {
    return polls.find(p => p.unit.code === cls.unit.code && p.is_active) || null
  }

  async function handleVote(pollId: string, optionId: string) {
    setVotingLoading(true)
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_id: optionId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Vote submitted! ✅')
        setPolls(prev => prev.map(p => p.id === pollId ? { ...p, my_vote: optionId } : p))
        setVotingPoll(null)
        setSelectedOption('')
      } else {
        toast.error(data.error || 'Failed to vote')
      }
    } catch { toast.error('Connection error') }
    finally { setVotingLoading(false) }
  }

  const ClassModal = ({ cls }: { cls: TimetableClass }) => {
    const ov = getClassOverride(cls)
    const isTemp = ov?.override_type === 'temporary'
    const isCancelled = ov?.is_cancelled
    const isPerm = ov?.override_type === 'permanent'
    const venue = isPerm && ov?.new_venue ? ov.new_venue : cls.venue
    const poll = getClassPoll(cls)
    const colors = typeColors[cls.session_type] || typeColors.lecture

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-4" style={{ background: `linear-gradient(135deg, ${colors.border}18, ${colors.border}08)`, borderBottom: `3px solid ${colors.border}` }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: colors.border, color: 'white' }}>
                    {cls.session_type.toUpperCase()}
                  </span>
                  {isCancelled && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#c62828', color: 'white' }}>❌ CANCELLED</span>}
                  {isTemp && !isCancelled && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#f9a825', color: 'white' }}>⚡ MOVED</span>}
                  {isPerm && !isCancelled && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#6a1b9a', color: 'white' }}>🔄 ALTERED</span>}
                </div>
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: colors.border }}>{cls.unit.code}</h2>
                <p className="text-gray-700 text-sm font-medium mt-0.5">{cls.unit.name}</p>
              </div>
              <button onClick={() => setSelectedClass(null)} className="text-2xl text-gray-400 hover:text-gray-700 leading-none">×</button>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            {[
              { icon:'⏰', label:'Time', value:`${cls.start_time.slice(0,5)} – ${cls.end_time.slice(0,5)}` },
              { icon:'📅', label:'Day', value:cls.day_of_week },
              { icon:'📍', label:'Venue', value: isCancelled ? '—' : `${venue?.name || venue?.room_number || 'TBA'}${venue?.building ? `, ${venue.building.name}` : ''}` },
              { icon:'🏢', label:'Floor', value: isCancelled ? '—' : `Floor ${venue?.floor_number ?? 0}${venue?.building?.has_lift === false && (venue?.floor_number || 0) > 0 ? ' ⚠️ No lift' : ''}` },
              { icon:'👩‍🏫', label:'Lecturer', value:cls.unit.lecturer?.full_name || 'TBA' },
              { icon:'🎓', label:'Credits', value:`${cls.unit.credits || 3} credit${(cls.unit.credits||3)!==1?'s':''}` },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-3">
                <span className="text-lg w-6 flex-shrink-0">{row.icon}</span>
                <div>
                  <div className="text-xs text-gray-400 font-medium">{row.label}</div>
                  <div className="text-sm text-gray-800 font-medium">{row.value}</div>
                </div>
              </div>
            ))}

            {/* Override notice */}
            {isCancelled && (
              <div className="p-3 rounded-xl text-sm" style={{ background: '#fce4ec', color: '#c62828' }}>
                <strong>❌ Cancelled{ov?.override_date ? ` on ${ov.override_date}` : ''}:</strong> {ov?.reason}
              </div>
            )}
            {isTemp && !isCancelled && (
              <div className="p-3 rounded-xl text-sm" style={{ background: '#fffde7', color: '#f57f17' }}>
                <strong>⚡ Temporarily moved{ov?.override_date ? ` on ${ov.override_date}` : ''}:</strong> {ov?.reason}
                {ov?.new_venue && <div className="mt-1">New venue: <strong>{ov.new_venue.name || ov.new_venue.room_number}</strong></div>}
              </div>
            )}
            {isPerm && !isCancelled && ov?.new_venue && (
              <div className="p-3 rounded-xl text-sm" style={{ background: '#ede7f6', color: '#6a1b9a' }}>
                <strong>🔄 Permanently moved</strong> to {ov.new_venue.name || ov.new_venue.room_number}. {ov.reason}
              </div>
            )}

            {/* Active poll for this unit */}
            {poll && (
              <div className="p-4 rounded-2xl border-2" style={{ borderColor: '#1a237e', background: '#eff6ff' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📊</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#1a237e' }}>ACTIVE POLL</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-3">{poll.question}</p>
                {poll.my_vote ? (
                  <div className="text-xs text-green-600 font-semibold flex items-center gap-1">✅ You have voted</div>
                ) : (
                  <button onClick={() => { setVotingPoll(poll); setSelectedClass(null) }}
                    className="w-full py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #1a237e, #3b82f6)' }}>
                    Vote Now →
                  </button>
                )}
                {poll.expires_at && (
                  <div className="text-xs text-gray-400 mt-2">Expires: {new Date(poll.expires_at).toLocaleDateString('en-KE')}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const PollModal = ({ poll }: { poll: Poll }) => {
    const totalVotes = poll.options.reduce((s, o) => s + o.votes_count, 0)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="p-6 pb-4" style={{ background: 'linear-gradient(135deg, #eff6ff, #e0e7ff)', borderBottom: '3px solid #1a237e' }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-bold px-2 py-0.5 rounded-full text-white inline-block mb-2" style={{ background: '#1a237e' }}>
                  📊 POLL — {poll.unit.code}
                </div>
                <h2 className="text-lg font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>{poll.question}</h2>
              </div>
              <button onClick={() => { setVotingPoll(null); setSelectedOption('') }} className="text-2xl text-gray-400 hover:text-gray-700">×</button>
            </div>
          </div>

          <div className="p-6">
            {poll.my_vote ? (
              <div>
                <p className="text-sm text-green-600 font-semibold mb-4 flex items-center gap-2">✅ You have already voted</p>
                <div className="space-y-3">
                  {poll.options.map(opt => {
                    const pct = totalVotes > 0 ? Math.round((opt.votes_count / totalVotes) * 100) : 0
                    return (
                      <div key={opt.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className={`font-medium ${opt.id === poll.my_vote ? 'text-blue-700' : 'text-gray-700'}`}>
                            {opt.id === poll.my_vote ? '✓ ' : ''}{opt.option_text}
                          </span>
                          <span className="text-gray-500 text-xs">{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#e5e7eb' }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: opt.id === poll.my_vote ? '#1a237e' : '#93c5fd' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-4">{totalVotes} total response{totalVotes !== 1 ? 's' : ''}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">Select your answer and submit. You can only vote once.</p>
                <div className="space-y-2.5 mb-6">
                  {poll.options.map(opt => (
                    <button key={opt.id} onClick={() => setSelectedOption(opt.id)}
                      className="w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium"
                      style={{
                        borderColor: selectedOption === opt.id ? '#1a237e' : '#e5e7eb',
                        background: selectedOption === opt.id ? '#eff6ff' : 'white',
                        color: selectedOption === opt.id ? '#1a237e' : '#374151',
                      }}>
                      <span className="mr-2">{selectedOption === opt.id ? '●' : '○'}</span>
                      {opt.option_text}
                    </button>
                  ))}
                </div>
                <button onClick={() => selectedOption && handleVote(poll.id, selectedOption)}
                  disabled={!selectedOption || votingLoading}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #1a237e, #3b82f6)' }}>
                  {votingLoading ? 'Submitting...' : '✅ Submit Vote'}
                </button>
                {poll.expires_at && (
                  <p className="text-xs text-gray-400 mt-3 text-center">Poll closes: {new Date(poll.expires_at).toLocaleString('en-KE')}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div className="flex h-screen" style={{ background:'#f8f9ff' }}>
      <Sidebar role="student" userName={user?.name||''} userEmail={user?.email||''} />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading timetable...</p>
        </div>
      </main>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background:'#f8f9ff' }}>
      <Sidebar role={(user?.role||'student') as UserRole} userName={user?.name||''} userEmail={user?.email||''} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily:'Playfair Display, serif', color:'#1a237e' }}>
                📅 My Weekly Timetable
              </h1>
              <p className="text-gray-400 text-xs mt-1 flex flex-wrap items-center gap-2">
                {allClasses.length} sessions · Today is <strong className="text-gray-600">{today}</strong>
                {polls.filter(p => !p.my_vote && p.is_active).length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs animate-pulse" style={{ background:'#dbeafe', color:'#1e40af', border:'1px solid #93c5fd' }}>
                    📊 {polls.filter(p => !p.my_vote && p.is_active).length} poll{polls.filter(p => !p.my_vote && p.is_active).length!==1?'s':''} awaiting your vote
                  </span>
                )}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a href="/timetable/export" target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  📄 View system XML timetable
                </a>
                <a href="/api/timetable/export?download=true" download
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                  ⬇️ Download XML
                </a>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mb-5">
            {[
              { color:'#f9a825', bg:'#fffde7', text:'⚡ Temporarily moved' },
              { color:'#6a1b9a', bg:'#ede7f6', text:'🔄 Permanently altered' },
              { color:'#e53935', bg:'#fce4ec', text:'❌ Cancelled' },
              { color:'#1a237e', bg:'#dbeafe', text:'📊 Has poll — click to vote' },
            ].map(l => (
              <div key={l.text} className="text-xs px-3 py-1.5 rounded-full font-medium"
                style={{ background: l.bg, color: l.color, border: `1px solid ${l.color}40` }}>
                {l.text}
              </div>
            ))}
            <div className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ background:'#f8f9ff', color:'#6b7280', border:'1px dashed #d1d5db' }}>
              💡 Click any class for details
            </div>
          </div>

          {allClasses.length === 0 ? (
            <div className="nexus-card p-12 text-center text-gray-400">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-lg font-semibold mb-2">No Classes Yet</h3>
              <p className="text-sm mb-4">Enroll in units to see your timetable.</p>
              <a href="/student/units" className="btn-primary">Browse Units →</a>
            </div>
          ) : (
            <>
              {/* Slot-based grid */}
              <div className="nexus-card p-4 md:p-5 mb-6 overflow-x-auto">
                <div style={{ minWidth:'860px' }}>
                  {/* Day headers */}
                  <div className="grid mb-2" style={{ gridTemplateColumns:'110px repeat(7,1fr)', gap:'6px' }}>
                    <div />
                    {DAYS.map(d => (
                      <div key={d} className="text-center py-2 rounded-xl text-xs font-bold"
                        style={{ background: d===today ? '#1a237e' : '#f0f2ff', color: d===today ? 'white' : '#1a237e' }}>
                        {d===today && <div className="text-white/60 text-xs mb-0.5">TODAY</div>}
                        {d.slice(0,3).toUpperCase()}
                      </div>
                    ))}
                  </div>
                  {/* Slots */}
                  {SLOTS.map(slot => (
                    <div key={slot.label} className="grid mb-2" style={{ gridTemplateColumns:'110px repeat(7,1fr)', gap:'6px' }}>
                      <div className="flex items-center justify-end pr-3 text-xs text-gray-400 font-medium" style={{ color:'#1a237e80' }}>
                        {slot.label}
                      </div>
                      {DAYS.map(day => {
                        const cls = allClasses.find(c => c.day_of_week === day && c.start_time.slice(0,5) === slot.start)
                        if (!cls) return <div key={day} className="rounded-xl h-20" style={{ background:'#f8f9ff', border:'1px dashed #e5e7eb' }} />
                        const ov = getClassOverride(cls)
                        const isCancelled = ov?.is_cancelled
                        const isTemp = ov?.override_type === 'temporary'
                        const isPerm = ov?.override_type === 'permanent'
                        const hasPoll = !!getClassPoll(cls)
                        const pollVoted = hasPoll && !!getClassPoll(cls)?.my_vote
                        const colors = typeColors[cls.session_type] || typeColors.lecture
                        const bg = isCancelled ? '#fce4ec' : isTemp ? '#fffde7' : colors.bg
                        const borderColor = isCancelled ? '#ef4444' : isTemp ? '#f59e0b' : isPerm ? '#7c3aed' : colors.border

                        return (
                          <button key={day} onClick={() => setSelectedClass(cls)}
                            className="rounded-xl p-2 text-left transition-all hover:shadow-md hover:scale-105 active:scale-95 h-20 relative overflow-hidden"
                            style={{ background: bg, border: `2px solid ${borderColor}`, cursor:'pointer' }}>
                            {hasPoll && (
                              <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs"
                                style={{ background: pollVoted ? '#22c55e' : '#1a237e' }}>
                                {pollVoted ? '✓' : '!'}
                              </div>
                            )}
                            <div className="font-bold text-xs truncate" style={{ color: borderColor }}>{cls.unit.code}</div>
                            <div className="text-gray-600 text-xs truncate leading-tight mt-0.5">{cls.unit.name}</div>
                            <div className="text-gray-400 text-xs mt-1">
                              {isCancelled ? '❌' : isTemp ? '⚡' : isPerm ? '🔄' : ''}
                              {cls.venue?.room_number || 'TBA'}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Day cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {DAYS.map(day => {
                  const dayClasses = allClasses.filter(c => c.day_of_week === day)
                    .sort((a,b) => a.start_time.localeCompare(b.start_time))
                  return (
                    <div key={day} className="nexus-card p-5"
                      style={{ borderTop:`4px solid ${day===today?'#1a237e':'#e0e0ef'}` }}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold" style={{ fontFamily:'Playfair Display, serif', color:day===today?'#1a237e':'#555' }}>
                          {day}
                        </h3>
                        {day===today && <span className="badge badge-navy text-xs">Today</span>}
                        {!dayClasses.length && <span className="text-xs text-gray-400">Free 🌿</span>}
                      </div>
                      <div className="space-y-2.5">
                        {dayClasses.map((cls, i) => {
                          const ov = getClassOverride(cls)
                          const isCancelled = ov?.is_cancelled
                          const isTemp = ov?.override_type === 'temporary'
                          const isPerm = ov?.override_type === 'permanent'
                          const venue = isPerm && ov?.new_venue ? ov.new_venue : cls.venue
                          const hasPoll = !!getClassPoll(cls)
                          const pollVoted = hasPoll && !!getClassPoll(cls)?.my_vote
                          const colors = typeColors[cls.session_type] || typeColors.lecture

                          return (
                            <button key={i} onClick={() => setSelectedClass(cls)}
                              className="w-full text-left p-3 rounded-xl transition-all hover:shadow-md active:scale-98"
                              style={{
                                background: isCancelled?'#fce4ec':isTemp?'#fffde7':'#f8f9ff',
                                borderLeft:`3px solid ${isCancelled?'#e53935':isTemp?'#f9a825':colors.border}`,
                                cursor:'pointer',
                              }}>
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs" style={{ color:isCancelled?'#c62828':colors.border }}>{cls.unit.code}</span>
                                <div className="flex items-center gap-1">
                                  {hasPoll && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: pollVoted?'#dcfce7':'#dbeafe', color: pollVoted?'#16a34a':'#1e40af' }}>{pollVoted?'✅':'📊'}</span>}
                                  <span className="text-xs text-gray-400 capitalize">{cls.session_type}</span>
                                </div>
                              </div>
                              <div className="text-sm text-gray-700 mt-0.5 truncate">{cls.unit.name}</div>
                              <div className="text-xs text-gray-400 mt-1">⏰ {cls.start_time.slice(0,5)}–{cls.end_time.slice(0,5)} &nbsp;·&nbsp; 📍 {venue?.name||venue?.room_number||'TBA'}</div>
                              {isCancelled && <div className="text-xs mt-1 font-semibold" style={{ color:'#c62828' }}>❌ Cancelled: {ov?.reason?.slice(0,40)}</div>}
                              {isTemp && !isCancelled && <div className="text-xs mt-1" style={{ color:'#f57f17' }}>⚡ Moved: {ov?.reason?.slice(0,40)}</div>}
                              {isPerm && !isCancelled && <div className="text-xs mt-1" style={{ color:'#6a1b9a' }}>🔄 Venue altered</div>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modals */}
      {selectedClass && <ClassModal cls={selectedClass} />}
      {votingPoll && <PollModal poll={votingPoll} />}
    </div>
  )
}
