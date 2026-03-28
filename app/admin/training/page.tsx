'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import { UserRole } from '@/types'
import toast from 'react-hot-toast'

interface TrainingSession {
  id: string; semester: string; year: number; title: string; description: string
  is_active: boolean; created_at: string
  creator?: { full_name: string }
  training_data: { total_units?: number; total_timetable_entries?: number; generated_at?: string; source?: string; file_name?: string; extracted_text?: string }
}

export default function AdminTraining() {
  const { data: session } = useSession()
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [syncing, setSyncing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [semester, setSemester] = useState('Semester 1')
  const [year, setYear] = useState(new Date().getFullYear())
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const role = (session?.user as any)?.role as UserRole
  // Security: redirect non-admins immediately on client
  if (typeof window !== 'undefined' && role && role !== 'admin') {
    window.location.replace(`/${role}/dashboard`)
  }

  useEffect(() => { loadSessions() }, [])

  async function loadSessions() {
    const res = await fetch('/api/admin/training')
    const data = await res.json()
    if (data.success) setSessions(data.data)
  }

  async function syncTimetable() {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/training', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semester, year }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || 'AI synced with timetable!')
        loadSessions()
      } else toast.error(data.error || 'Sync failed')
    } finally { setSyncing(false) }
  }

  async function handleFileUpload(file: File) {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('semester', semester)
      fd.append('year', String(year))
      fd.append('title', file.name.replace(/\.[^/.]+$/, ''))

      const res = await fetch('/api/admin/training/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || 'AI trained from file!')
        if (data.extracted_preview) {
          console.log('Extracted preview:', data.extracted_preview)
        }
        setShowUpload(false)
        loadSessions()
      } else toast.error(data.error || 'Upload failed')
    } finally { setUploading(false) }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role={role as UserRole} userName={session?.user?.name || ''} userEmail={session?.user?.email || ''} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#2e7d32' }}>
              🧠 AI Training Centre
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Train the AI assistant with timetables, documents, and custom knowledge</p>
          </div>

          {/* Semester selector */}
          <div className="nexus-card p-5 mb-6">
            <h2 className="font-bold mb-4" style={{ color: '#2e7d32' }}>📅 Target Semester</h2>
            <div className="flex gap-3 flex-wrap">
              <select className="nexus-input" style={{ width: 'auto' }} value={semester} onChange={e => setSemester(e.target.value)}>
                <option>Semester 1</option><option>Semester 2</option>
                <option>Trimester 1</option><option>Trimester 2</option><option>Trimester 3</option>
              </select>
              <input type="number" className="nexus-input" style={{ width: '100px' }} value={year} onChange={e => setYear(parseInt(e.target.value))} />
            </div>
          </div>

          {/* Two main action cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Auto-sync */}
            <div className="nexus-card p-6" style={{ borderTop: '4px solid #2e7d32' }}>
              <div className="text-3xl mb-3">🔄</div>
              <h3 className="font-bold text-lg mb-2" style={{ color: '#2e7d32' }}>Auto-Sync from Timetable</h3>
              <p className="text-sm text-gray-500 mb-4">Automatically pull all units, lecturers, venues, and schedules from the database into AI knowledge.</p>
              <button onClick={syncTimetable} disabled={syncing}
                className="w-full text-white font-semibold py-3 rounded-xl disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #2e7d32, #43a047)' }}>
                {syncing ? '⏳ Syncing...' : '🔄 Sync Now'}
              </button>
            </div>

            {/* File upload */}
            <div className="nexus-card p-6" style={{ borderTop: '4px solid #6a1b9a' }}>
              <div className="text-3xl mb-3">📄</div>
              <h3 className="font-bold text-lg mb-2" style={{ color: '#6a1b9a' }}>Train from Document</h3>
              <p className="text-sm text-gray-500 mb-4">Upload a PDF, CSV, or text file and the AI will learn from its content — timetables, policies, course outlines, etc.</p>
              <button onClick={() => setShowUpload(!showUpload)}
                className="w-full font-semibold py-3 rounded-xl"
                style={{ background: showUpload ? '#e0e0e0' : 'linear-gradient(135deg, #6a1b9a, #9c27b0)', color: showUpload ? '#333' : 'white' }}>
                {showUpload ? '✕ Cancel' : '📤 Upload Document'}
              </button>
            </div>
          </div>

          {/* Upload area */}
          {showUpload && (
            <div className="nexus-card p-6 mb-6 animate-fade-in" style={{ borderTop: '4px solid #6a1b9a' }}>
              <h3 className="font-bold mb-4" style={{ color: '#6a1b9a' }}>Upload Training Document</h3>
              <div
                className="border-2 border-dashed rounded-xl p-8 md:p-12 text-center cursor-pointer transition-all"
                style={{ borderColor: dragOver ? '#6a1b9a' : '#c5b8d8', background: dragOver ? '#f9f5ff' : '#faf5ff' }}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}>
                <div className="text-5xl mb-4">{uploading ? '⏳' : '📄'}</div>
                {uploading ? (
                  <p className="font-semibold text-purple-700">Processing document and training AI...</p>
                ) : (
                  <>
                    <p className="font-semibold text-gray-700 mb-1">Drag & drop or click to browse</p>
                    <p className="text-sm text-gray-500">Supports: PDF, CSV, TXT, JSON, MD</p>
                    <p className="text-xs text-gray-400 mt-2">The AI will extract text and learn from the content</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.csv,.txt,.json,.md,.tsv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
              </div>
              <div className="mt-4 p-4 rounded-xl" style={{ background: '#f0fff4' }}>
                <p className="text-xs text-green-800">
                  <strong>💡 What works best:</strong> CSV timetables, PDF course outlines, text-based policy documents, unit syllabuses. 
                  Scanned PDFs without OCR may not extract well — use text-based PDFs or CSVs for best results.
                </p>
              </div>
            </div>
          )}

          {/* Training history */}
          <div className="nexus-card p-6">
            <h2 className="font-bold text-lg mb-5" style={{ fontFamily: 'Playfair Display, serif', color: '#2e7d32' }}>
              Training History ({sessions.length})
            </h2>
            {sessions.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-3">🧠</div>
                <p>No training sessions yet. Sync or upload a document above to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map(s => (
                  <div key={s.id} className="p-5 rounded-xl border" style={{ borderColor: s.is_active ? '#43a047' : '#e0e0ef', borderWidth: s.is_active ? 2 : 1 }}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold truncate">{s.title}</span>
                          {s.is_active && <span className="badge badge-green text-xs">✅ Active</span>}
                          <span className="badge badge-gray text-xs">{s.semester} {s.year}</span>
                          {s.training_data?.source === 'file_upload' && (
                            <span className="badge badge-purple text-xs">📄 File Upload</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{s.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                          {s.training_data?.total_units && <span>📚 {s.training_data.total_units} units</span>}
                          {s.training_data?.total_timetable_entries && <span>📅 {s.training_data.total_timetable_entries} entries</span>}
                          {s.training_data?.file_name && <span>📄 {s.training_data.file_name}</span>}
                          <span>By {s.creator?.full_name || 'System'} · {new Date(s.created_at).toLocaleDateString('en-KE')}</span>
                        </div>
                        {s.training_data?.extracted_text && (
                          <details className="mt-2">
                            <summary className="text-xs text-purple-600 cursor-pointer">View extracted text preview</summary>
                            <p className="text-xs text-gray-500 mt-1 p-2 rounded bg-gray-50 max-h-24 overflow-y-auto">
                              {s.training_data.extracted_text.slice(0, 500)}...
                            </p>
                          </details>
                        )}
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
