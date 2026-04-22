'use client'
import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import DocumentPreview from '@/components/shared/DocumentPreview'

const eventTypes = [
  { value: 'general', label: 'General Announcement', icon: '📢' },
  { value: 'class', label: 'Class Notice', icon: '📚' },
  { value: 'exam', label: 'Exam / Test', icon: '📝' },
  { value: 'venue_change', label: 'Venue Change', icon: '🔄' },
  { value: 'cancellation', label: 'Class Cancellation', icon: '❌' },
  { value: 'entertainment', label: 'Entertainment Event', icon: '🎉' },
  { value: 'sports', label: 'Sports Event', icon: '⚽' },
  { value: 'university', label: 'University Notice', icon: '🏛️' },
  { value: 'emergency', label: 'Emergency', icon: '🚨' },
]

interface Event {
  id: string; title: string; description: string; event_type: string
  is_urgent: boolean; target_role: string; is_published: boolean
  start_datetime?: string; created_at: string
  file_url?: string; file_name?: string; file_size?: number; file_type?: string
  creator?: { full_name: string; role: string }
  unit?: { code: string; name: string }
  venue?: { room_number: string; name?: string; building?: { name: string } }
}

interface Props {
  events: Event[]
  units: { id: string; code: string; name: string }[]
  venues: { id: string; room_number: string; name?: string; building?: { name: string } }[]
}

export default function AdminEventsClient({ events: initialEvents, units, venues }: Props) {
  const [events, setEvents] = useState(initialEvents)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [attachedFile, setAttachedFile] = useState<{ url: string; name: string; size: number; type: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    title: '', description: '', event_type: 'general',
    is_urgent: false, target_role: 'all', unit_id: '', venue_id: '',
    start_datetime: '', is_published: true,
  })

  async function loadEvents() {
    const res = await fetch('/api/events?limit=100')
    const data = await res.json()
    if (data.success) setEvents(data.data)
  }

  async function handleFileUpload(file: File) {
    const allowed = ['application/pdf','application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg','image/png','image/webp']
    if (!allowed.includes(file.type)) { toast.error('Only PDF, Word, Excel or images allowed'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return }
    setUploadingFile(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/events/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        setAttachedFile({ url: data.file_url, name: data.file_name, size: data.file_size, type: data.file_type })
        toast.success('File attached!')
      } else { toast.error(data.error || 'Upload failed') }
    } catch { toast.error('Upload error') }
    finally { setUploadingFile(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.description) { toast.error('Fill in title and description'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, file_url: attachedFile?.url || null, file_name: attachedFile?.name || null, file_size: attachedFile?.size || null, file_type: attachedFile?.type || null }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Event posted! 📢')
        setShowForm(false); setAttachedFile(null)
        setForm({ title: '', description: '', event_type: 'general', is_urgent: false, target_role: 'all', unit_id: '', venue_id: '', start_datetime: '', is_published: true })
        loadEvents()
      } else { toast.error(data.error || 'Failed') }
    } finally { setSubmitting(false) }
  }

  async function deleteEvent(id: string) {
    if (!confirm('Delete this event?')) return
    await fetch(`/api/events?id=${id}`, { method: 'DELETE' })
    toast.success('Deleted'); loadEvents()
  }

  const filtered = filterType ? events.filter(e => e.event_type === filterType) : events

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#2e7d32' }}>📢 Events & Announcements</h1>
            <p className="text-gray-500 mt-1">Post and manage university-wide events and notices</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setAttachedFile(null) }}
            className="text-white font-semibold px-5 py-2.5 rounded-xl"
            style={{ background: showForm ? '#e0e0e0' : 'linear-gradient(135deg, #2e7d32, #43a047)', color: showForm ? '#333' : 'white' }}>
            {showForm ? '✕ Cancel' : '+ Post Event'}
          </button>
        </div>

        {showForm && (
          <div className="nexus-card p-6 mb-6" style={{ borderTop: '4px solid #2e7d32' }}>
            <h2 className="text-lg font-bold mb-5" style={{ fontFamily: 'Playfair Display, serif', color: '#2e7d32' }}>New Event / Announcement</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="nexus-label">Event Type *</label>
                  <select className="nexus-input" value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
                    {eventTypes.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="nexus-label">Visible To</label>
                  <select className="nexus-input" value={form.target_role} onChange={e => setForm(f => ({ ...f, target_role: e.target.value }))}>
                    <option value="all">👥 All Users</option>
                    <option value="student">🎓 Students Only</option>
                    <option value="lecturer">👨‍🏫 Lecturers Only</option>
                    <option value="admin">🛡️ Admin Only</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="nexus-label">Title *</label>
                  <input className="nexus-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title..." required />
                </div>
                <div className="md:col-span-2">
                  <label className="nexus-label">Description *</label>
                  <textarea className="nexus-input" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Full event details..." required />
                </div>
                <div>
                  <label className="nexus-label">Related Unit (optional)</label>
                  <select className="nexus-input" value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}>
                    <option value="">-- None --</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.code} — {u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="nexus-label">Date & Time (optional)</label>
                  <input type="datetime-local" className="nexus-input" value={form.start_datetime} onChange={e => setForm(f => ({ ...f, start_datetime: e.target.value }))} />
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#fff8f0' }}>
                  <input type="checkbox" id="urgent" checked={form.is_urgent} onChange={e => setForm(f => ({ ...f, is_urgent: e.target.checked }))} className="w-4 h-4" />
                  <label htmlFor="urgent" className="font-medium text-sm" style={{ color: '#e65100' }}>🚨 Mark as URGENT</label>
                </div>

                {/* Document Attachment */}
                <div className="md:col-span-2">
                  <label className="nexus-label">📎 Attach Document (optional)</label>
                  <div
                    className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer"
                    style={{ borderColor: attachedFile ? '#2e7d32' : '#c5cae9', background: attachedFile ? '#f1f8e9' : '#f8f9ff' }}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f) }}>
                    <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
                    {uploadingFile ? (
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        Uploading...
                      </div>
                    ) : attachedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-xl">✅</span>
                        <div className="text-left">
                          <p className="font-semibold text-sm" style={{ color: '#2e7d32' }}>{attachedFile.name}</p>
                          <p className="text-xs text-gray-400">{(attachedFile.size / 1024).toFixed(1)} KB · Click to replace</p>
                        </div>
                        <button type="button" onClick={e => { e.stopPropagation(); setAttachedFile(null) }}
                          className="text-red-400 hover:text-red-600 text-xl ml-2" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl mb-1">📎</p>
                        <p className="text-sm font-medium text-gray-600">Drag & drop or click to attach</p>
                        <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, or images · Max 10MB</p>
                      </>
                    )}
                  </div>
                  {/* Preview attached file before posting */}
                  {attachedFile && !uploadingFile && (
                    <DocumentPreview fileUrl={attachedFile.url} fileName={attachedFile.name} fileType={attachedFile.type} fileSize={attachedFile.size} />
                  )}
                </div>
              </div>
              <button type="submit" disabled={submitting || uploadingFile}
                className="text-white font-semibold px-6 py-2.5 rounded-xl disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #2e7d32, #43a047)' }}>
                {submitting ? '⏳ Posting...' : '📢 Post Event'}
              </button>
            </form>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setFilterType('')} className={`px-3 py-1 rounded-lg text-xs font-semibold border ${!filterType ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-200'}`}>All ({events.length})</button>
          {eventTypes.map(t => {
            const count = events.filter(e => e.event_type === t.value).length
            if (!count) return null
            return <button key={t.value} onClick={() => setFilterType(t.value)} className={`px-3 py-1 rounded-lg text-xs font-semibold border ${filterType === t.value ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-200'}`}>{t.icon} {t.label} ({count})</button>
          })}
        </div>

        <div className="nexus-card p-6">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400"><div className="text-5xl mb-3">📭</div><p>No events yet.</p></div>
          ) : (
            <div className="space-y-4">
              {filtered.map(ev => {
                const cfg = eventTypes.find(t => t.value === ev.event_type)
                return (
                  <div key={ev.id} className="p-5 rounded-xl border cursor-pointer hover:shadow-lg transition-shadow" style={{ borderColor: '#e0e0ef' }} onClick={() => setSelectedEvent(ev)}>
                    <div className="flex items-start gap-4">
                      <span className="text-2xl flex-shrink-0">{cfg?.icon || '📢'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-sm">{ev.title}</span>
                          {ev.is_urgent && <span className="badge badge-red text-xs">🚨 Urgent</span>}
                          <span className="badge badge-gray text-xs capitalize">{ev.event_type.replace(/_/g, ' ')}</span>
                          {ev.unit && <span className="badge badge-navy text-xs">{ev.unit.code}</span>}
                          <span className="badge badge-gray text-xs">→ {ev.target_role}</span>
                          {ev.creator && <span className="text-xs text-gray-400">by {ev.creator.full_name}</span>}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{ev.description}</p>
                        {ev.start_datetime && <p className="text-xs text-gray-400 mt-1">📅 {new Date(ev.start_datetime).toLocaleDateString('en-KE')}</p>}
                        {ev.venue && <p className="text-xs text-gray-400">📍 {ev.venue.name || ev.venue.room_number}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">Posted {new Date(ev.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        {ev.file_url && ev.file_name && (
                          <div onClick={e => e.stopPropagation()}>
                            <DocumentPreview fileUrl={ev.file_url} fileName={ev.file_name} fileType={ev.file_type} fileSize={ev.file_size} />
                          </div>
                        )}
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteEvent(ev.id) }} className="btn-danger text-xs px-3 py-1.5 flex-shrink-0">Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.72)' }}>
          <div className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl bg-white">
            <div className="flex items-start justify-between px-6 py-4 border-b" style={{ borderColor: '#e5e7eb' }}>
              <div>
                <h2 className="text-xl font-semibold" style={{ color: '#2e7d32' }}>{selectedEvent.title}</h2>
                <p className="text-sm text-gray-500">{selectedEvent.event_type.replace(/_/g, ' ').toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-2xl text-gray-500 hover:text-gray-700">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                {selectedEvent.is_urgent && <span className="badge badge-red">🚨 Urgent</span>}
                <span className="badge badge-gray">{selectedEvent.target_role}</span>
                {selectedEvent.unit && <span className="badge badge-navy">{selectedEvent.unit.code}</span>}
                {selectedEvent.venue && <span className="badge badge-gray">📍 {selectedEvent.venue.name || selectedEvent.venue.room_number}</span>}
              </div>
              {selectedEvent.start_datetime && (
                <p className="text-sm text-gray-600">📅 {new Date(selectedEvent.start_datetime).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              )}
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{selectedEvent.description}</p>
              {selectedEvent.file_url && selectedEvent.file_name && (
                <div onClick={e => e.stopPropagation()}>
                  <DocumentPreview fileUrl={selectedEvent.file_url} fileName={selectedEvent.file_name} fileType={selectedEvent.file_type} fileSize={selectedEvent.file_size} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
