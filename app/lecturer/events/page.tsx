'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import { UserRole, EventType } from '@/types'
import toast from 'react-hot-toast'
import DocumentPreview from '@/components/shared/DocumentPreview'

interface Event {
  id: string; title: string; description: string; event_type: EventType
  is_urgent: boolean; target_role: string; is_published: boolean
  start_datetime?: string; created_at: string
  file_url?: string; file_name?: string; file_size?: number; file_type?: string
  unit?: { code: string; name: string }
}

const eventTypes: { value: EventType; label: string; icon: string }[] = [
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

export default function LecturerEvents() {
  const { data: session } = useSession()
  const [events, setEvents] = useState<Event[]>([])
  const [units, setUnits] = useState<{ id: string; code: string; name: string }[]>([])
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [attachedFile, setAttachedFile] = useState<{ url: string; name: string; size: number; type: string } | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    title: '', description: '', event_type: 'general' as EventType,
    is_urgent: false, target_role: 'all', unit_id: '', start_datetime: '', venue_id: '',
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [evRes, unRes] = await Promise.all([fetch('/api/events'), fetch('/api/lecturer/units')])
    const [ev, un] = await Promise.all([evRes.json(), unRes.json()])
    if (ev.success) setEvents(ev.data)
    if (un.success) setUnits(un.data)
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
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/events/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) { setAttachedFile({ url: data.file_url, name: data.file_name, size: data.file_size, type: data.file_type }); toast.success('File attached!') }
      else { toast.error(data.error || 'Upload failed') }
    } catch { toast.error('Upload error') }
    finally { setUploadingFile(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.description) { toast.error('Please fill in title and description'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, file_url: attachedFile?.url || null, file_name: attachedFile?.name || null, file_size: attachedFile?.size || null, file_type: attachedFile?.type || null }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Event posted successfully! 📢 Students will be notified.')
        setShowForm(false); setAttachedFile(null)
        setForm({ title: '', description: '', event_type: 'general', is_urgent: false, target_role: 'all', unit_id: '', start_datetime: '', venue_id: '' })
        loadData()
      } else { toast.error(data.error || 'Failed to post event') }
    } finally { setSubmitting(false) }
  }

  async function deleteEvent(id: string) {
    if (!confirm('Delete this event?')) return
    await fetch(`/api/events?id=${id}`, { method: 'DELETE' })
    toast.success('Event removed')
    loadData()
  }

  const role = (session?.user as unknown as { role: UserRole })?.role || 'lecturer'

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role={role} userName={session?.user?.name || ''} userEmail={session?.user?.email || ''} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
                📢 Events & Announcements
              </h1>
              <p className="text-gray-500 mt-1">Post real-time updates to notify students and staff</p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="text-white font-semibold px-5 py-2.5 rounded-xl"
              style={{ background: showForm ? '#e0e0e0' : 'linear-gradient(135deg, #6a1b9a, #9c27b0)', color: showForm ? '#333' : 'white' }}>
              {showForm ? '✕ Cancel' : '+ Post New Event'}
            </button>
          </div>

          {/* Post Form */}
          {showForm && (
            <div className="nexus-card p-6 mb-6 animate-fade-in" style={{ borderTop: '4px solid #6a1b9a' }}>
              <h2 className="text-lg font-bold mb-5" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
                New Event / Announcement
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="nexus-label">Event Type *</label>
                    <select className="nexus-input" value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value as EventType }))}>
                      {eventTypes.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="nexus-label">Visible To</label>
                    <select className="nexus-input" value={form.target_role} onChange={e => setForm(f => ({ ...f, target_role: e.target.value }))}>
                      <option value="all">👥 All (Students + Lecturers)</option>
                      <option value="student">🎓 Students Only</option>
                      <option value="lecturer">👨‍🏫 Lecturers Only</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="nexus-label">Title *</label>
                    <input className="nexus-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder={form.event_type === 'venue_change' ? 'e.g., CS302 Venue Change — Monday 14th' : form.event_type === 'cancellation' ? 'e.g., CS101 Lecture Cancelled — Thursday' : 'Event title...'}
                      required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="nexus-label">Description *</label>
                    <textarea className="nexus-input" rows={4} value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Provide all relevant details — time, venue, what students need to know..."
                      required />
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
                    <input type="datetime-local" className="nexus-input" value={form.start_datetime}
                      onChange={e => setForm(f => ({ ...f, start_datetime: e.target.value }))} />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#fff8f0' }}>
                  <input type="checkbox" id="urgent" checked={form.is_urgent}
                    onChange={e => setForm(f => ({ ...f, is_urgent: e.target.checked }))}
                    className="w-4 h-4 rounded" />
                  <label htmlFor="urgent" className="font-medium text-sm" style={{ color: '#e65100' }}>
                    🚨 Mark as URGENT — students will see a priority alert banner
                  </label>
                </div>

                {/* Document Attachment */}
                <div>
                  <label className="nexus-label">📎 Attach Document (optional)</label>
                  <div
                    className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer"
                    style={{ borderColor: attachedFile ? '#6a1b9a' : '#ce93d8', background: attachedFile ? '#f3e5f5' : '#fdf4ff' }}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f) }}>
                    <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
                    {uploadingFile ? (
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <span className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        Uploading...
                      </div>
                    ) : attachedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-xl">✅</span>
                        <div className="text-left">
                          <p className="font-semibold text-sm" style={{ color: '#6a1b9a' }}>{attachedFile.name}</p>
                          <p className="text-xs text-gray-400">{(attachedFile.size / 1024).toFixed(1)} KB · Click to replace</p>
                        </div>
                        <button type="button" onClick={e => { e.stopPropagation(); setAttachedFile(null) }}
                          className="text-red-400 text-xl ml-2" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl mb-1">📎</p>
                        <p className="text-sm font-medium text-gray-600">Drag & drop or click to attach</p>
                        <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, or images · Max 10MB</p>
                      </>
                    )}
                  </div>
                  {attachedFile && !uploadingFile && (
                    <DocumentPreview fileUrl={attachedFile.url} fileName={attachedFile.name} fileType={attachedFile.type} fileSize={attachedFile.size} />
                  )}
                </div>

                <button type="submit" disabled={submitting || uploadingFile} className="text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #6a1b9a, #9c27b0)' }}>
                  {submitting ? '⏳ Posting...' : '📢 Post Event Now'}
                </button>
              </form>
            </div>
          )}

          {/* Events list */}
          <div className="nexus-card p-6">
            <h2 className="text-lg font-bold mb-5" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
              Recent Events ({events.length})
            </h2>
            {events.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-5xl mb-3">📭</div>
                <p>No recent events available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map(ev => {
                  const cfg = eventTypes.find(t => t.value === ev.event_type)
                  return (
                    <div key={ev.id} className="flex items-start gap-4 p-5 rounded-xl border" style={{ borderColor: '#e0e0ef' }}>
                      <span className="text-2xl">{cfg?.icon || '📢'}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-sm">{ev.title}</span>
                          {ev.is_urgent && <span className="badge badge-red text-xs">🚨 Urgent</span>}
                          <span className="badge badge-gray text-xs capitalize">{ev.event_type.replace('_', ' ')}</span>
                          {ev.unit && <span className="badge badge-navy text-xs">{ev.unit.code}</span>}
                          <span className={`badge text-xs ${ev.is_published ? 'badge-green' : 'badge-orange'}`}>
                            {ev.is_published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{ev.description}</p>
                        {ev.start_datetime && (
                          <p className="text-xs text-gray-400 mt-1">📅 {new Date(ev.start_datetime).toLocaleString('en-KE')}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          Posted {new Date(ev.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {ev.file_url && ev.file_name && (
                          <div onClick={e => e.stopPropagation()}>
                            <DocumentPreview fileUrl={ev.file_url} fileName={ev.file_name} fileType={ev.file_type} fileSize={ev.file_size} />
                          </div>
                        )}
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteEvent(ev.id) }} className="btn-danger text-xs">Delete</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.7)' }}>
          <div className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'white' }}>
            <div className="flex items-start justify-between px-6 py-4 border-b" style={{ borderColor: '#e5e7eb' }}>
              <div>
                <h2 className="text-xl font-semibold" style={{ color: '#4b0082' }}>{selectedEvent.title}</h2>
                <p className="text-sm text-gray-500">{selectedEvent.event_type.replace(/_/g, ' ').toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-2xl text-gray-500 hover:text-gray-700">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                {selectedEvent.is_urgent && <span className="badge badge-red">🚨 Urgent</span>}
                <span className="badge badge-gray">{selectedEvent.target_role}</span>
                {selectedEvent.unit && <span className="badge badge-navy">{selectedEvent.unit.code}</span>}
                <span className="badge badge-green">{selectedEvent.is_published ? 'Published' : 'Draft'}</span>
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
    </div>
  )
}
