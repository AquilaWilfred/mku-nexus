'use client'
import { useState, useEffect, useCallback } from 'react'
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

interface TimetableEntry {
  id:string; unit_id:string; day_of_week:string; start_time:string; end_time:string; session_type:string
  unit:{ id:string; code:string; name:string }
  venue?:{ id:string; room_number:string; name:string; building?:{ name:string } }
}

interface Poll {
  id:string; question:string; is_active:boolean; expires_at?:string; poll_type:string
  unit:{ code:string; name:string }
  options:{ id:string; option_text:string; votes_count:number }[]
}

export default function LecturerTimetable() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [venues, setVenues] = useState<any[]>([])
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<TimetableEntry | null>(null)
  const [mode, setMode] = useState<'view'|'override'|'poll'>('view')
  const [overrideForm, setOverrideForm] = useState({ override_type:'temporary', override_date:'', new_venue_id:'', reason:'', is_cancelled:false })
  const [pollForm, setPollForm] = useState({ question:'', poll_type:'vote', expires_at:'', options:['',''] })
  const [submitting, setSubmitting] = useState(false)
  const [showPollResults, setShowPollResults] = useState<Poll | null>(null)
  const today = new Date().toLocaleDateString('en-US', { weekday:'long' })
  const [showFullTimetable, setShowFullTimetable] = useState(false)

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [ttRes, venRes, pollRes] = await Promise.all([
        fetch(showFullTimetable ? '/api/timetable?full=true' : '/api/timetable'),
        fetch('/api/timetable/venues'),
        fetch('/api/polls'),
      ])
      const [ttData, venData, pollData] = await Promise.all([ttRes.json(), venRes.json(), pollRes.json()])
      if (ttData.success) setEntries(ttData.data || [])
      if (venData.success) setVenues(venData.data || [])
      if (pollData.success) setPolls(pollData.data || [])
    } catch {}
    finally { if (!silent) setLoading(false) }
  }, [showFullTimetable])

  useEffect(() => { fetchData() }, [fetchData, showFullTimetable])
  useEffect(() => {
    const t = setInterval(() => fetchData(true), 45000)
    return () => clearInterval(t)
  }, [fetchData])

  async function handleOverrideSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/timetable/override', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timetable_id: selected.id, ...overrideForm }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Change saved & students notified! 📢')
        setSelected(null); setMode('view')
        setOverrideForm({ override_type:'temporary', override_date:'', new_venue_id:'', reason:'', is_cancelled:false })
      } else toast.error(data.error || 'Failed')
    } catch { toast.error('Connection error') }
    finally { setSubmitting(false) }
  }

  async function handlePollSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    const validOptions = pollForm.options.filter(o => o.trim())
    if (validOptions.length < 2) { toast.error('At least 2 options required'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/polls', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unit_id: selected.unit_id, question: pollForm.question, options: validOptions, poll_type: pollForm.poll_type, expires_at: pollForm.expires_at || null }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Poll created & students notified! 📊')
        setSelected(null); setMode('view')
        setPollForm({ question:'', poll_type:'vote', expires_at:'', options:['',''] })
        fetchData()
      } else toast.error(data.error || 'Failed')
    } catch { toast.error('Connection error') }
    finally { setSubmitting(false) }
  }

  async function closePoll(pollId: string) {
    try {
      await fetch(`/api/polls/${pollId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      })
      toast.success('Poll closed')
      fetchData()
    } catch { toast.error('Failed') }
  }

  if (loading) return (
    <div className="flex h-screen" style={{ background:'#fdf4ff' }}>
      <Sidebar role="lecturer" userName={user?.name||''} userEmail={user?.email||''} />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-700 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading timetable...</p>
        </div>
      </main>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background:'#fdf4ff' }}>
      <Sidebar role={(user?.role||'lecturer') as UserRole} userName={user?.name||''} userEmail={user?.email||''} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8">
          <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily:'Playfair Display, serif', color:'#4a0072' }}>
                📅 {showFullTimetable ? 'Full University Timetable' : 'My Teaching Schedule'}
              </h1>
              <p className="text-gray-400 text-xs mt-1">
                {entries.length} sessions {showFullTimetable ? '(all lecturers)' : '(your units only)'} · Click a class to manage
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a href="/timetable/export" target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  📄 View system XML timetable
                </a>
                <a href="/api/timetable/export?download=true" download
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800">
                  ⬇️ Download XML
                </a>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={() => setShowFullTimetable(false)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                style={{ background: !showFullTimetable ? '#4a0072' : 'white', color: !showFullTimetable ? 'white' : '#4a0072', border: '1.5px solid #4a0072' }}>
                📅 My Schedule
              </button>
              <button onClick={() => setShowFullTimetable(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                style={{ background: showFullTimetable ? '#4a0072' : 'white', color: showFullTimetable ? 'white' : '#4a0072', border: '1.5px solid #4a0072' }}>
                🌐 Full Timetable
              </button>
            </div>
          </div>

          {/* Active polls banner */}
          {polls.filter(p => p.is_active).length > 0 && (
            <div className="mb-5 p-4 rounded-2xl" style={{ background:'linear-gradient(135deg, #eff6ff, #dbeafe)', border:'2px solid #1a237e20' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📊</span>
                <span className="font-semibold text-sm" style={{ color:'#1a237e' }}>Active Polls ({polls.filter(p=>p.is_active).length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {polls.filter(p => p.is_active).map(p => {
                  const total = p.options.reduce((s,o)=>s+o.votes_count,0)
                  return (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow-sm text-sm">
                      <span className="font-medium text-gray-800">[{p.unit.code}] {p.question.slice(0,30)}{p.question.length>30?'...':''}</span>
                      <span className="text-gray-400 text-xs">{total} vote{total!==1?'s':''}</span>
                      <button onClick={() => setShowPollResults(p)} className="text-xs text-blue-700 hover:underline">Results</button>
                      <button onClick={() => closePoll(p.id)} className="text-xs text-red-600 hover:underline">Close</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Slot grid */}
          {entries.length === 0 ? (
            <div className="nexus-card p-12 text-center text-gray-400">
              <div className="text-5xl mb-4">📭</div>
              <p className="font-semibold">No timetable entries found.</p>
              <p className="text-sm mt-2">Register units via My Units page first.</p>
            </div>
          ) : (
            <div className="nexus-card p-4 md:p-5 overflow-x-auto">
              <div style={{ minWidth:'860px' }}>
                <div className="grid mb-2" style={{ gridTemplateColumns:'110px repeat(7,1fr)', gap:'6px' }}>
                  <div />
                  {DAYS.map(d => (
                    <div key={d} className="text-center py-2 rounded-xl text-xs font-bold"
                      style={{ background: d===today?'#4a0072':'#f3e5f5', color: d===today?'white':'#4a0072' }}>
                      {d===today && <div className="text-white/60 text-xs mb-0.5">TODAY</div>}
                      {d.slice(0,3).toUpperCase()}
                    </div>
                  ))}
                </div>
                {SLOTS.map(slot => (
                  <div key={slot.label} className="grid mb-2" style={{ gridTemplateColumns:'110px repeat(7,1fr)', gap:'6px' }}>
                    <div className="flex items-center justify-end pr-3 text-xs font-medium" style={{ color:'#6a1b9a80' }}>{slot.label}</div>
                    {DAYS.map(day => {
                      const entry = entries.find(e => e.day_of_week===day && e.start_time.slice(0,5)===slot.start)
                      const entryPoll = entry ? polls.find(p => p.unit?.code === entry.unit?.code && p.is_active) : null
                      if (!entry) return <div key={day} className="rounded-xl h-20" style={{ background:'#fdf4ff', border:'1px dashed #e9d5ff' }} />
                      const hasOverride = (entry as any).has_active_override
                      const overrideCancelled = (entry as any).latest_override?.is_cancelled
                      return (
                        <button key={day} onClick={() => { setSelected(entry); setMode('view') }}
                          className="rounded-xl p-2 text-left h-20 transition-all hover:shadow-md hover:scale-105 active:scale-95 relative overflow-hidden"
                          style={{ background: overrideCancelled ? '#ffebee' : 'white', border: `2px solid ${overrideCancelled ? '#c62828' : hasOverride ? '#e65100' : '#9333ea'}`, cursor:'pointer' }}>
                          {entryPoll && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">📊</div>
                          )}
                          {hasOverride && !entryPoll && (
                            <div className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${overrideCancelled ? 'bg-red-600' : 'bg-orange-500'}`}>
                              {overrideCancelled ? '✕' : '📍'}
                            </div>
                          )}
                          <div className="font-bold text-xs truncate" style={{ color: overrideCancelled ? '#c62828' : '#4a0072' }}>{entry.unit.code}</div>
                          <div className="text-gray-600 text-xs truncate mt-0.5">{entry.unit.name}</div>
                          <div className="text-gray-400 text-xs mt-1">
                            {hasOverride && (entry as any).latest_override?.new_venue_name
                              ? `→ ${(entry as any).latest_override.new_venue_name.split(',')[0]}`
                              : entry.venue?.room_number || 'TBA'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Class detail / override / poll modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 pb-4" style={{ background:'linear-gradient(135deg, #f3e5f5, #ede7f6)', borderBottom:'3px solid #6a1b9a' }}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold" style={{ fontFamily:'Playfair Display, serif', color:'#4a0072' }}>{selected.unit.code}</h2>
                  <p className="text-gray-600 text-sm">{selected.unit.name}</p>
                  <p className="text-gray-400 text-xs mt-1">{selected.day_of_week} · {selected.start_time.slice(0,5)}–{selected.end_time.slice(0,5)} · {selected.venue?.room_number}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-2xl text-gray-400 hover:text-gray-700">×</button>
              </div>
              {/* Tab buttons */}
              <div className="flex gap-2 mt-4">
                {[
                  { key:'view', label:'📋 Details' },
                  { key:'override', label:'📍 Change Venue' },
                  { key:'poll', label:'📊 Create Poll' },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setMode(tab.key as any)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: mode===tab.key ? '#6a1b9a' : 'white', color: mode===tab.key ? 'white' : '#6a1b9a', border:'1.5px solid #6a1b9a' }}>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {mode === 'view' && (
                <div className="space-y-4">
                  {[
                    { icon:'📅', label:'Day', value:selected.day_of_week },
                    { icon:'⏰', label:'Time', value:`${selected.start_time.slice(0,5)} – ${selected.end_time.slice(0,5)}` },
                    { icon:'📍', label:'Venue', value:`${selected.venue?.name||selected.venue?.room_number||'TBA'}${selected.venue?.building?`, ${selected.venue.building.name}`:''}` },
                    { icon:'🎯', label:'Session Type', value:selected.session_type },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background:'#f3e5f5' }}>
                      <span className="text-lg">{row.icon}</span>
                      <div>
                        <div className="text-xs text-gray-400">{row.label}</div>
                        <div className="text-sm font-semibold text-gray-800">{row.value}</div>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 text-center mt-2">Switch to tabs above to change venue or create a poll for this unit.</p>
                </div>
              )}

              {mode === 'override' && (
                <form onSubmit={handleOverrideSubmit} className="space-y-4">
                  <div>
                    <label className="nexus-label">Change Type</label>
                    <select value={overrideForm.override_type} onChange={e => setOverrideForm(f => ({ ...f, override_type: e.target.value }))}
                      className="nexus-input">
                      <option value="temporary">⚡ Temporary (one session)</option>
                      <option value="permanent">🔄 Permanent change</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style={{ background:'#fce4ec' }}
                    onClick={() => setOverrideForm(f => ({ ...f, is_cancelled: !f.is_cancelled }))}>
                    <input type="checkbox" checked={overrideForm.is_cancelled} readOnly className="w-4 h-4 accent-red-600" />
                    <span className="text-sm font-medium text-red-700">❌ Cancel this class instead of moving it</span>
                  </div>
                  {overrideForm.override_type === 'temporary' && (
                    <div>
                      <label className="nexus-label">Date of Change *</label>
                      <input type="date" value={overrideForm.override_date} onChange={e => setOverrideForm(f => ({ ...f, override_date: e.target.value }))}
                        className="nexus-input" required />
                    </div>
                  )}
                  {!overrideForm.is_cancelled && (
                    <div>
                      <label className="nexus-label">New Venue</label>
                      <select value={overrideForm.new_venue_id} onChange={e => setOverrideForm(f => ({ ...f, new_venue_id: e.target.value }))}
                        className="nexus-input">
                        <option value="">— Keep current venue —</option>
                        {venues.map((v:any) => (
                          <option key={v.id} value={v.id}>{v.room_number} — {v.name} ({v.building?.name})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="nexus-label">Reason *</label>
                    <textarea value={overrideForm.reason} onChange={e => setOverrideForm(f => ({ ...f, reason: e.target.value }))}
                      className="nexus-input" rows={3} placeholder="e.g. Room maintenance, special event..." required />
                  </div>
                  <div className="p-3 rounded-xl text-xs" style={{ background:'#e0f2fe', color:'#0369a1' }}>
                    💡 Students enrolled in this unit will receive an instant notification and the AI assistant will be updated automatically.
                  </div>
                  <button type="submit" disabled={submitting}
                    className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60"
                    style={{ background:'linear-gradient(135deg, #4a0072, #9333ea)' }}>
                    {submitting ? 'Saving...' : '📢 Save & Notify Students'}
                  </button>
                </form>
              )}

              {mode === 'poll' && (
                <form onSubmit={handlePollSubmit} className="space-y-4">
                  <div>
                    <label className="nexus-label">Poll Type</label>
                    <select value={pollForm.poll_type} onChange={e => setPollForm(f => ({ ...f, poll_type: e.target.value }))}
                      className="nexus-input">
                      <option value="vote">🗳️ Vote / Opinion poll</option>
                      <option value="research">🔬 Research question</option>
                      <option value="feedback">💬 Feedback</option>
                      <option value="quiz">📝 Quiz question</option>
                    </select>
                  </div>
                  <div>
                    <label className="nexus-label">Question *</label>
                    <textarea value={pollForm.question} onChange={e => setPollForm(f => ({ ...f, question: e.target.value }))}
                      className="nexus-input" rows={2} placeholder="What would you like to ask students?" required />
                  </div>
                  <div>
                    <label className="nexus-label">Options (min 2)</label>
                    <div className="space-y-2">
                      {pollForm.options.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <input value={opt} onChange={e => {
                              const o = [...pollForm.options]; o[i] = e.target.value
                              setPollForm(f => ({ ...f, options: o }))
                            }}
                            placeholder={`Option ${i+1}`} className="nexus-input flex-1" />
                          {pollForm.options.length > 2 && (
                            <button type="button" onClick={() => setPollForm(f => ({ ...f, options: f.options.filter((_,j)=>j!==i) }))}
                              className="text-red-500 hover:text-red-700 text-lg px-2">×</button>
                          )}
                        </div>
                      ))}
                    </div>
                    {pollForm.options.length < 6 && (
                      <button type="button" onClick={() => setPollForm(f => ({ ...f, options: [...f.options, ''] }))}
                        className="text-sm text-purple-700 hover:underline mt-2">+ Add option</button>
                    )}
                  </div>
                  <div>
                    <label className="nexus-label">Expires At (optional)</label>
                    <input type="datetime-local" value={pollForm.expires_at} onChange={e => setPollForm(f => ({ ...f, expires_at: e.target.value }))}
                      className="nexus-input" />
                  </div>
                  <div className="p-3 rounded-xl text-xs" style={{ background:'#e0f2fe', color:'#0369a1' }}>
                    💡 Students see this poll on their timetable for this unit. Results are sent to you. Students can only vote once.
                  </div>
                  <button type="submit" disabled={submitting}
                    className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60"
                    style={{ background:'linear-gradient(135deg, #1a237e, #3b82f6)' }}>
                    {submitting ? 'Creating...' : '📊 Create Poll & Notify Students'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Poll results modal */}
      {showPollResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold" style={{ fontFamily:'Playfair Display, serif', color:'#1a237e' }}>Poll Results</h2>
                <p className="text-gray-500 text-sm">{showPollResults.question}</p>
              </div>
              <button onClick={() => setShowPollResults(null)} className="text-2xl text-gray-400 hover:text-gray-700">×</button>
            </div>
            {(() => {
              const total = showPollResults.options.reduce((s,o)=>s+o.votes_count,0)
              const sorted = [...showPollResults.options].sort((a,b)=>b.votes_count-a.votes_count)
              return (
                <div className="space-y-3">
                  {sorted.map((opt,i) => {
                    const pct = total > 0 ? Math.round((opt.votes_count/total)*100) : 0
                    return (
                      <div key={opt.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-800">{i===0?'🥇':i===1?'🥈':i===2?'🥉':'   '} {opt.option_text}</span>
                          <span className="text-gray-500">{opt.votes_count} ({pct}%)</span>
                        </div>
                        <div className="h-3 rounded-full overflow-hidden" style={{ background:'#e5e7eb' }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width:`${pct}%`, background: i===0?'#1a237e':i===1?'#3b82f6':'#93c5fd' }} />
                        </div>
                      </div>
                    )
                  })}
                  <p className="text-xs text-gray-400 text-center pt-2">{total} total response{total!==1?'s':''}</p>
                  <button onClick={() => closePoll(showPollResults.id)}
                    className="w-full py-2 rounded-xl text-sm font-semibold text-white mt-2"
                    style={{ background:'#c62828' }}>Close Poll</button>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
