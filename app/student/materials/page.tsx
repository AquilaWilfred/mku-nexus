'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import { UserRole, MaterialType } from '@/types'
import DocumentPreview from '@/components/shared/DocumentPreview'

interface Material {
  id: string; title: string; type: MaterialType; file_url?: string; file_name?: string; file_size?: number; content_text?: string
  description?: string; download_count: number; created_at: string; is_published: boolean
  unit?: { code: string; name: string }; lecturer?: { full_name: string }
}

const typeIcons: Record<string, string> = { pdf: '📄', video: '🎥', image: '🖼️', text: '📝', link: '🔗', audio: '🎵' }
const typeBg: Record<string, string> = { pdf: '#fff3f3', video: '#f3e5f5', image: '#e8f5e9', text: '#e8eaf6', link: '#fff8e1', audio: '#fce4ec' }
const typeColor: Record<string, string> = { pdf: '#c62828', video: '#6a1b9a', image: '#2e7d32', text: '#1a237e', link: '#e65100', audio: '#880e4f' }

export default function StudentMaterials() {
  const { data: session } = useSession()
  const [materials, setMaterials] = useState<Material[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedUnit, setSelectedUnit] = useState<string>('all')
  const [units, setUnits] = useState<string[]>([])

  useEffect(() => { loadMaterials() }, [])

  async function loadMaterials() {
    try {
      const res = await fetch('/api/materials')
      const data = await res.json()
      if (data.success) {
        setMaterials(data.data)
        const unitList = [...new Set<string>(data.data.map((m: Material) => m.unit?.code).filter(Boolean))]
        setUnits(unitList)
      }
    } finally { setLoading(false) }
  }

  const filtered = materials.filter(m => {
    const matchesType = filter === 'all' || m.type === filter
    const matchesUnit = selectedUnit === 'all' || m.unit?.code === selectedUnit
    const matchesSearch = !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.unit?.name?.toLowerCase().includes(search.toLowerCase())
    return matchesType && matchesUnit && matchesSearch && m.is_published
  })

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role={(session?.user as unknown as { role: UserRole })?.role || 'student'} userName={session?.user?.name || ''} userEmail={session?.user?.email || ''} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
              📁 Learning Materials
            </h1>
            <p className="text-gray-500 mt-1">Access resources for your enrolled units only</p>
          </div>

          {/* Filters */}
          <div className="nexus-card p-4 mb-6 flex flex-wrap gap-3 items-center">
            <input
              placeholder="Search materials..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="nexus-input text-sm py-2"
              style={{ maxWidth: '260px' }}
            />
            <select className="nexus-input text-sm py-2" style={{ maxWidth: '180px' }} value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}>
              <option value="all">All Units</option>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <div className="flex gap-2">
              {['all', 'pdf', 'video', 'image', 'text', 'link', 'audio'].map(t => (
                <button key={t} onClick={() => setFilter(t)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize"
                  style={{
                    background: filter === t ? '#1a237e' : '#f0f2ff',
                    color: filter === t ? 'white' : '#1a237e'
                  }}>
                  {t === 'all' ? '📚 All' : `${typeIcons[t]} ${t}`}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-3 animate-pulse">📚</div>
              <p>Loading materials...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-3">📭</div>
              <p className="font-medium">No materials found</p>
              <p className="text-sm mt-1">Materials will appear here once uploaded by your lecturers</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map(mat => (
                <div key={mat.id} className="nexus-card p-5 hover:shadow-lg transition-all" style={{ borderTop: `4px solid ${typeColor[mat.type]}` }}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: typeBg[mat.type] }}>
                      {typeIcons[mat.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm leading-tight">{mat.title}</div>
                      <div className="text-xs mt-1" style={{ color: typeColor[mat.type] }}>{mat.unit?.code} — {mat.unit?.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">By {mat.lecturer?.full_name}</div>
                    </div>
                  </div>

                  {mat.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{mat.description}</p>
                  )}

                  {mat.type === 'text' && mat.content_text && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg mb-3 max-h-24 overflow-y-auto">
                      {mat.content_text.slice(0, 200)}{mat.content_text.length > 200 ? '...' : ''}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2 pt-3 border-t" style={{ borderColor: '#f0f0f8' }}>
                    <div className="text-xs text-gray-400">
                      {new Date(mat.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {mat.download_count > 0 && ` · ${mat.download_count} views`}
                    </div>
                    {mat.file_url && (mat.type === 'pdf' || mat.type === 'image' || (mat.file_name && (mat.file_name.endsWith('.doc') || mat.file_name.endsWith('.docx') || mat.file_name.endsWith('.xls') || mat.file_name.endsWith('.xlsx')))) ? (
                      <DocumentPreview fileUrl={mat.file_url} fileName={mat.file_name || mat.title} fileSize={mat.file_size} />
                    ) : mat.file_url ? (
                      <a href={mat.file_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: typeBg[mat.type], color: typeColor[mat.type] }}>
                        {mat.type === 'video' ? '▶ Watch' : mat.type === 'audio' ? '🎵 Listen' : mat.type === 'link' ? '🔗 Open' : '📥 Open'}
                      </a>
                    ) : mat.type === 'text' ? (
                      <span className="text-xs text-gray-400">Read above</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
