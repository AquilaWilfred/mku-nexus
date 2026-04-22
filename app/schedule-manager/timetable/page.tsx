'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import SMSidebar from '@/components/shared/SMSidebar'
import DocumentPreview from '@/components/shared/DocumentPreview'
import toast from 'react-hot-toast'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const SLOTS = [
  { label:'07:00–10:00', start:'07:00', end:'10:00' },
  { label:'10:00–13:00', start:'10:00', end:'13:00' },
  { label:'13:00–16:00', start:'13:00', end:'16:00' },
  { label:'16:00–19:00', start:'16:00', end:'19:00' },
]

export default function SMTimetable() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [entries, setEntries] = useState<any[]>([])
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({ venue_id: '', day_of_week: '', start_time: '', end_time: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [originalDocumentUrl, setOriginalDocumentUrl] = useState<string>('')
  const [originalDocumentMeta, setOriginalDocumentMeta] = useState<{ name: string; type: string; size: number } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadPreview, setUploadPreview] = useState<string>('')
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  useEffect(() => {
    async function load() {
      const [ttRes, venRes] = await Promise.all([
        fetch('/api/timetable?full=true'),
        fetch('/api/timetable/venues'),
      ])
      const [ttData, venData] = await Promise.all([ttRes.json(), venRes.json()])
      if (ttData.success) setEntries(ttData.data || [])
      if (venData.success) setVenues(venData.data || [])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    return () => {
      if (originalDocumentUrl && originalDocumentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(originalDocumentUrl)
      }
    }
  }, [originalDocumentUrl])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    try {
      const updates: any = {}
      if (editForm.venue_id) updates.venue_id = editForm.venue_id
      if (editForm.day_of_week) updates.day_of_week = editForm.day_of_week
      if (editForm.start_time) updates.start_time = editForm.start_time
      if (editForm.end_time) updates.end_time = editForm.end_time

      const res = await fetch(`/api/timetable?id=${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Timetable updated! ✅')
        setSelected(null)
        // Reload
        const r = await fetch('/api/timetable?full=true')
        const d = await r.json()
        if (d.success) setEntries(d.data || [])
      } else toast.error(data.error || 'Failed')
    } catch { toast.error('Connection error') }
    setSubmitting(false)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadFile) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)

      const res = await fetch('/api/timetable/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Timetable uploaded and processed! ✅')
        setUploadFile(null)
        setUploadPreview(data.preview || '')
        if (data.fileUrl) {
          setOriginalDocumentUrl(data.fileUrl)
        }
        // Reload entries
        const r = await fetch('/api/timetable?full=true')
        const d = await r.json()
        if (d.success) setEntries(d.data || [])
      } else {
        setUploadPreview('')
        toast.error(data.error || 'Upload failed')
      }
    } catch {
      setUploadPreview('')
      toast.error('Connection error')
    }
    setUploading(false)
  }

  if (loading) return (
    <div className="flex h-screen" style={{ background: '#f0f4ff' }}>
      <SMSidebar userName={user?.name || ''} userEmail={user?.email || ''} />
      <main className="flex-1 flex items-center justify-center text-gray-400">Loading timetable...</main>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0f4ff' }}>
      <SMSidebar userName={user?.name || ''} userEmail={user?.email || ''} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0d47a1' }}>
            📅 Manage Timetable
          </h1>
          <p className="text-gray-500 text-sm mt-1">{entries.length} entries · Click any cell to edit</p>
        </div>

        {/* Upload Section */}
        <div className="nexus-card p-6 mb-6">
          <h2 className="text-lg font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#0d47a1' }}>
            📤 Upload Timetable Document
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload PDF, XML, or Excel files to automatically update the timetable. AI will extract and process the content.
          </p>
          <form onSubmit={handleUpload} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select File</label>
              <input
                type="file"
                accept=".pdf,.xml,.xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  if (!file) {
                    setUploadFile(null)
                    setOriginalDocumentMeta(null)
                    setOriginalDocumentUrl('')
                    return
                  }
                  if (originalDocumentUrl && originalDocumentUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(originalDocumentUrl)
                  }
                  setUploadFile(file)
                  setOriginalDocumentUrl(URL.createObjectURL(file))
                  setOriginalDocumentMeta({ name: file.name, type: file.type, size: file.size })
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Processing...' : 'Upload & Process'}
            </button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a href="/timetable/export" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              📄 View XML Exam Timetable
            </a>
            <a href="/api/timetable/export?download=true" download
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              ⬇️ Download XML
            </a>
          </div>
        </div>

        {uploadPreview ? (
          <div className="nexus-card p-6 mb-6">
            <h3 className="text-base font-bold mb-3" style={{ fontFamily: 'Playfair Display, serif', color: '#0d47a1' }}>
              📄 Preview: first page content
            </h3>
            <div className="max-h-80 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm whitespace-pre-wrap text-slate-700">
              {uploadPreview}
            </div>
          </div>
        ) : null}

        {originalDocumentUrl && originalDocumentMeta ? (
          <div className="nexus-card p-6 mb-6">
            <h3 className="text-base font-bold mb-3" style={{ fontFamily: 'Playfair Display, serif', color: '#0d47a1' }}>
              🖼️ Original document preview
            </h3>
            <DocumentPreview
              fileUrl={originalDocumentUrl}
              fileName={originalDocumentMeta.name}
              fileType={originalDocumentMeta.type}
              fileSize={originalDocumentMeta.size}
            />
          </div>
        ) : null}

        <div className="nexus-card p-4 overflow-x-auto">
          <div style={{ minWidth: '860px' }}>
            <div className="grid mb-2" style={{ gridTemplateColumns: '110px repeat(7,1fr)', gap: '6px' }}>
              <div />
              {DAYS.map(d => (
                <div key={d} className="text-center py-2 rounded-xl text-xs font-bold"
                  style={{ background: d === today ? '#0d47a1' : '#e3f2fd', color: d === today ? 'white' : '#0d47a1' }}>
                  {d === today && <div className="text-white/60 text-xs mb-0.5">TODAY</div>}
                  {d.slice(0, 3).toUpperCase()}
                </div>
              ))}
            </div>
            {SLOTS.map(slot => (
              <div key={slot.label} className="grid mb-2" style={{ gridTemplateColumns: '110px repeat(7,1fr)', gap: '6px' }}>
                <div className="flex items-center justify-end pr-3 text-xs font-medium" style={{ color: '#0d47a180' }}>{slot.label}</div>
                {DAYS.map(day => {
                  const entry = entries.find(e => e.day_of_week === day && e.start_time?.slice(0, 5) === slot.start)
                  const hasOverride = entry?.has_active_override
                  if (!entry) return <div key={day} className="rounded-xl h-20" style={{ background: '#f0f4ff', border: '1px dashed #bbdefb' }} />
                  return (
                    <button key={day} onClick={() => {
                      setSelected(entry)
                      setEditForm({ venue_id: entry.venue_id || '', day_of_week: entry.day_of_week, start_time: entry.start_time?.slice(0, 5), end_time: entry.end_time?.slice(0, 5), reason: '' })
                    }}
                      className="rounded-xl p-2 text-left h-20 hover:shadow-md hover:scale-105 transition-all relative"
                      style={{ background: hasOverride ? '#fff8e1' : 'white', border: `2px solid ${hasOverride ? '#e65100' : '#0d47a1'}` }}>
                      {hasOverride && <div className="absolute top-1 right-1 text-xs">📍</div>}
                      <div className="font-bold text-xs truncate" style={{ color: '#0d47a1' }}>{entry.unit?.code}</div>
                      <div className="text-gray-500 text-xs truncate">{entry.unit?.name}</div>
                      <div className="text-gray-400 text-xs mt-1">{entry.venue?.room_number || 'TBA'}</div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </main>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0d47a1' }}>
                  ✏️ Edit Timetable Entry
                </h2>
                <p className="text-gray-500 text-sm">{selected.unit?.code} — {selected.unit?.name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-2xl text-gray-400">×</button>
            </div>

            {selected.venue_change_tag && (
              <div className="p-3 rounded-xl mb-4 text-xs font-medium" style={{ background: '#fff3e0', color: '#e65100' }}>
                🏷️ {selected.venue_change_tag}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="nexus-label">Venue</label>
                <select value={editForm.venue_id} onChange={e => setEditForm(f => ({ ...f, venue_id: e.target.value }))}
                  className="nexus-input">
                  <option value="">— Keep current: {selected.venue?.room_number} —</option>
                  {venues.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.room_number} — {v.name} ({v.building?.name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="nexus-label">Day</label>
                <select value={editForm.day_of_week} onChange={e => setEditForm(f => ({ ...f, day_of_week: e.target.value }))}
                  className="nexus-input">
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="nexus-label">Start Time</label>
                  <input type="time" value={editForm.start_time} onChange={e => setEditForm(f => ({ ...f, start_time: e.target.value }))}
                    className="nexus-input" />
                </div>
                <div>
                  <label className="nexus-label">End Time</label>
                  <input type="time" value={editForm.end_time} onChange={e => setEditForm(f => ({ ...f, end_time: e.target.value }))}
                    className="nexus-input" />
                </div>
              </div>

              <div className="p-3 rounded-xl text-xs" style={{ background: '#e3f2fd', color: '#1565c0' }}>
                💡 Changes here update the main timetable permanently. Affected students and lecturers are automatically notified.
              </div>

              <button type="submit" disabled={submitting}
                className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0d47a1, #0288d1)' }}>
                {submitting ? 'Saving...' : '💾 Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
