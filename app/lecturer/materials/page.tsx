'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import { UserRole, MaterialType } from '@/types'
import toast from 'react-hot-toast'

interface Material {
  id: string; title: string; type: MaterialType; unit_id: string; is_published: boolean; created_at: string
  unit?: { code: string; name: string }; file_url?: string; file_name?: string; description?: string
}

interface Unit { id: string; code: string; name: string }

const typeIcons: Record<MaterialType, string> = { pdf: '📄', video: '🎥', image: '🖼️', text: '📝', link: '🔗', audio: '🎵' }
const typeColors: Record<MaterialType, string> = { pdf: 'badge-red', video: 'badge-purple', image: 'badge-green', text: 'badge-navy', link: 'badge-orange', audio: 'badge-gray' }

export default function LecturerMaterials() {
  const { data: session } = useSession()
  const [materials, setMaterials] = useState<Material[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState<{
    unit_id: string; title: string; description: string
    type: MaterialType; content_text: string; file_url: string
  }>({
    unit_id: '', title: '', description: '', type: 'pdf', content_text: '', file_url: '',
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [matsRes, unitsRes] = await Promise.all([
      fetch('/api/materials'),
      fetch('/api/lecturer/units'),
    ])
    const [mats, unts] = await Promise.all([matsRes.json(), unitsRes.json()])
    if (mats.success) setMaterials(mats.data)
    if (unts.success) setUnits(unts.data)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!form.unit_id) { toast.error('Please select a unit'); return }
    if (!form.title) { toast.error('Please enter a title'); return }
    setUploading(true)

    try {
      let fileUrl = form.file_url
      let fileName = ''

      // If there's a file, upload to Supabase Storage
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('unit_id', form.unit_id)
        const uploadRes = await fetch('/api/materials/upload', { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()
        if (!uploadData.success) { toast.error(uploadData.error || 'Upload failed'); return }
        fileUrl = uploadData.url
        fileName = file.name
      }

      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          file_url: fileUrl,
          file_name: fileName || undefined,
          file_size: file?.size,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Material uploaded successfully! 📚')
        setShowForm(false)
        setFile(null)
        setForm({ unit_id: '', title: '', description: '', type: 'pdf', content_text: '', file_url: '' })
        loadData()
      } else {
        toast.error(data.error || 'Failed to upload material')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar
        role={(session?.user as unknown as { role: UserRole })?.role || 'lecturer'}
        userName={session?.user?.name || ''}
        userEmail={session?.user?.email || ''}
      />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
                📤 Learning Materials
              </h1>
              <p className="text-gray-500 mt-1">Upload course content for your students</p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="text-white font-semibold px-5 py-2.5 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #6a1b9a, #9c27b0)' }}>
              {showForm ? '✕ Cancel' : '+ Upload Material'}
            </button>
          </div>

          {/* Upload Form */}
          {showForm && (
            <div className="nexus-card p-6 mb-6 animate-fade-in">
              <h2 className="text-lg font-bold mb-5" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
                Upload New Material
              </h2>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="nexus-label">Unit *</label>
                    <select className="nexus-input" value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))} required>
                      <option value="">-- Select Unit --</option>
                      {units.map(u => <option key={u.id} value={u.id}>{u.code} — {u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="nexus-label">Material Type *</label>
                    <select className="nexus-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as MaterialType }))}>
                      <option value="pdf">📄 PDF Document</option>
                      <option value="video">🎥 Video</option>
                      <option value="image">🖼️ Image</option>
                      <option value="text">📝 Text / Notes</option>
                      <option value="link">🔗 External Link</option>
                      <option value="audio">🎵 Audio</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="nexus-label">Title *</label>
                    <input className="nexus-input" value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g., Week 3 - Introduction to Data Structures" required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="nexus-label">Description</label>
                    <textarea className="nexus-input" rows={2} value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Brief description of this material..." />
                  </div>
                </div>

                {/* File or URL or Text based on type */}
                {form.type === 'text' ? (
                  <div>
                    <label className="nexus-label">Content *</label>
                    <textarea className="nexus-input" rows={8} value={form.content_text}
                      onChange={e => setForm(f => ({ ...f, content_text: e.target.value }))}
                      placeholder="Paste or type your notes/content here..." required />
                  </div>
                ) : form.type === 'link' ? (
                  <div>
                    <label className="nexus-label">URL *</label>
                    <input type="url" className="nexus-input" value={form.file_url}
                      onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))}
                      placeholder="https://..." required />
                  </div>
                ) : (
                  <div>
                    <label className="nexus-label">Upload File</label>
                    <div className={`upload-zone ${file ? 'drag-over' : ''}`}
                      onClick={() => document.getElementById('file-input')?.click()}>
                      <input id="file-input" type="file" hidden
                        accept={form.type === 'pdf' ? '.pdf' : form.type === 'video' ? 'video/*' : form.type === 'image' ? 'image/*' : form.type === 'audio' ? 'audio/*' : '*'}
                        onChange={e => setFile(e.target.files?.[0] || null)} />
                      {file ? (
                        <div>
                          <div className="text-2xl mb-2">{typeIcons[form.type]}</div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      ) : (
                        <div>
                          <div className="text-4xl mb-3">☁️</div>
                          <p className="font-medium text-sm text-gray-600">Click to upload or drag & drop</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {form.type === 'pdf' ? 'PDF files only' : form.type === 'video' ? 'MP4, MOV, AVI' : form.type === 'image' ? 'JPG, PNG, GIF, WebP' : 'Any file type'}
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Or paste a direct URL below:</p>
                    <input className="nexus-input mt-2 text-sm" value={form.file_url}
                      onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))}
                      placeholder="https://... (optional if uploading file)" />
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="submit" disabled={uploading} className="text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #6a1b9a, #9c27b0)' }}>
                    {uploading ? '⏳ Uploading...' : '✅ Upload Material'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Materials List */}
          <div className="nexus-card p-6">
            <h2 className="text-lg font-bold mb-5" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
              All Materials ({materials.length})
            </h2>
            {materials.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-5xl mb-3">📚</div>
                <p>No materials uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {materials.map(mat => (
                  <div key={mat.id} className="flex items-start justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#e0e0ef' }}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{typeIcons[mat.type]}</span>
                      <div>
                        <div className="font-semibold text-sm">{mat.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {mat.unit?.code} · {new Date(mat.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        {mat.description && <div className="text-xs text-gray-400 mt-1 line-clamp-1">{mat.description}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`badge ${typeColors[mat.type]} capitalize text-xs`}>{mat.type}</span>
                      {mat.file_url && (
                        <a href={mat.file_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs px-2 py-1 rounded-lg" style={{ color: '#6a1b9a', background: '#f3e5f5' }}>
                          View ↗
                        </a>
                      )}
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
