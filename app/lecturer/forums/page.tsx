'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import { UserRole } from '@/types'
import toast from 'react-hot-toast'

interface Forum {
  id: string; title: string; description?: string; forum_type: string; created_at: string; is_active: boolean
  unit?: { id: string; code: string; name: string }
  creator?: { full_name: string; role: string }
  posts?: [{ count: number }]
}
interface Post {
  id: string; content: string; created_at: string
  author?: { full_name: string; role: string }
  replies?: { id: string; content: string; created_at: string; author?: { full_name: string; role: string } }[]
}

const FORUM_TYPES = [
  { value: 'discussion', label: 'General Discussion', icon: '💬' },
  { value: 'assignment', label: 'Assignment Help', icon: '📝' },
  { value: 'quiz', label: 'Quiz / CAT Prep', icon: '🎯' },
  { value: 'announcement', label: 'Announcement', icon: '📢' },
  { value: 'general', label: 'General', icon: '📌' },
]
const roleColors: Record<string, string> = { lecturer: '#6a1b9a', admin: '#2e7d32', student: '#1a237e' }

export default function LecturerForums() {
  const { data: session } = useSession()
  const [forums, setForums] = useState<Forum[]>([])
  const [units, setUnits] = useState<{ id: string; code: string; name: string }[]>([])
  const [selectedForum, setSelectedForum] = useState<Forum | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newPost, setNewPost] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [form, setForm] = useState({ title: '', description: '', unit_id: '', forum_type: 'discussion' })
  const bottomRef = useRef<HTMLDivElement>(null)
  const role = (session?.user as any)?.role || 'lecturer'

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (selectedForum) loadPosts(selectedForum.id) }, [selectedForum])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [posts])

  async function loadData() {
    const [fRes, uRes] = await Promise.all([fetch('/api/forums'), fetch('/api/lecturer/units')])
    const [f, u] = await Promise.all([fRes.json(), uRes.json()])
    if (f.success) setForums(f.data)
    if (u.success) setUnits(u.data)
  }

  async function loadPosts(forumId: string) {
    const res = await fetch(`/api/forums/${forumId}/posts`)
    const data = await res.json()
    if (data.success) setPosts(data.data)
  }

  async function createForum(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.unit_id) { toast.error('Title and unit are required'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/forums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Forum created! Students have been notified 📣')
        setShowForm(false)
        setForm({ title: '', description: '', unit_id: '', forum_type: 'discussion' })
        loadData()
      } else toast.error(data.error || 'Failed to create forum')
    } finally { setSubmitting(false) }
  }

  async function submitPost(e: React.FormEvent) {
    e.preventDefault()
    if (!newPost.trim() || !selectedForum) return
    const res = await fetch(`/api/forums/${selectedForum.id}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newPost }),
    })
    const data = await res.json()
    if (data.success) { setNewPost(''); loadPosts(selectedForum.id) }
    else toast.error(data.error || 'Failed to post')
  }

  async function submitReply(postId: string) {
    if (!replyText.trim() || !selectedForum) return
    const res = await fetch(`/api/forums/${selectedForum.id}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: replyText, parent_id: postId }),
    })
    const data = await res.json()
    if (data.success) { setReplyText(''); setReplyTo(null); loadPosts(selectedForum.id) }
  }

  if (selectedForum) {
    return (
      <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
        <Sidebar role={role as UserRole} userName={session?.user?.name || ''} userEmail={session?.user?.email || ''} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 md:p-6 border-b bg-white flex items-center gap-3 flex-shrink-0">
            <button onClick={() => setSelectedForum(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">← Back</button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold truncate" style={{ color: '#6a1b9a' }}>{selectedForum.title}</h1>
                <span className="badge badge-purple text-xs">{selectedForum.unit?.code}</span>
                <span className="text-xs text-gray-400">{posts.length} posts</span>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">💬</div>
                <p>No posts yet. Start the discussion!</p>
              </div>
            ) : posts.map(post => (
              <div key={post.id} className="nexus-card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: roleColors[post.author?.role || 'student'] }}>
                    {post.author?.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm">{post.author?.full_name}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full capitalize"
                        style={{ background: roleColors[post.author?.role || 'student'] + '20', color: roleColors[post.author?.role || 'student'] }}>
                        {post.author?.role}
                      </span>
                      <span className="text-xs text-gray-400">{new Date(post.created_at).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed break-words">{post.content}</p>
                    <button onClick={() => setReplyTo(replyTo === post.id ? null : post.id)} className="text-xs text-purple-600 mt-2 hover:underline">
                      💬 Reply ({post.replies?.length || 0})
                    </button>
                  </div>
                </div>
                {post.replies && post.replies.length > 0 && (
                  <div className="mt-3 ml-11 space-y-2">
                    {post.replies.map(reply => (
                      <div key={reply.id} className="flex items-start gap-2 p-3 rounded-xl" style={{ background: '#faf5ff' }}>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: roleColors[reply.author?.role || 'student'] }}>
                          {reply.author?.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-xs">{reply.author?.full_name}</span>
                          <span className="text-xs text-gray-400 ml-2">{new Date(reply.created_at).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          <p className="text-xs text-gray-700 mt-0.5 break-words">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {replyTo === post.id && (
                  <div className="mt-3 ml-11 flex gap-2">
                    <input className="nexus-input flex-1 text-sm" placeholder="Reply to this post..."
                      value={replyText} onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitReply(post.id) } }} />
                    <button onClick={() => submitReply(post.id)} className="px-3 py-2 rounded-xl text-white text-sm font-semibold"
                      style={{ background: '#6a1b9a' }}>Send</button>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={submitPost} className="p-4 border-t bg-white flex gap-3 flex-shrink-0">
            <input className="nexus-input flex-1 text-sm" placeholder="Post to this forum..." value={newPost} onChange={e => setNewPost(e.target.value)} />
            <button type="submit" disabled={!newPost.trim()} className="px-4 py-2 rounded-xl text-white font-semibold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6a1b9a, #9c27b0)' }}>Post</button>
          </form>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role={role as UserRole} userName={session?.user?.name || ''} userEmail={session?.user?.email || ''} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8">
          <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
                💬 Discussion Forums
              </h1>
              <p className="text-gray-500 mt-1 text-sm">Create forums for your units — students auto-join based on enrollment</p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="text-white font-semibold px-4 py-2.5 rounded-xl flex-shrink-0"
              style={{ background: showForm ? '#e0e0e0' : 'linear-gradient(135deg, #6a1b9a, #9c27b0)', color: showForm ? '#333' : 'white' }}>
              {showForm ? '✕ Cancel' : '+ Create Forum'}
            </button>
          </div>

          {showForm && (
            <div className="nexus-card p-6 mb-6" style={{ borderTop: '4px solid #6a1b9a' }}>
              <h2 className="font-bold text-lg mb-5" style={{ color: '#6a1b9a' }}>New Forum</h2>
              <form onSubmit={createForum} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="nexus-label">Forum Type *</label>
                    <select className="nexus-input" value={form.forum_type} onChange={e => setForm(f => ({ ...f, forum_type: e.target.value }))}>
                      {FORUM_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="nexus-label">Unit *</label>
                    <select className="nexus-input" value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))} required>
                      <option value="">-- Select Unit --</option>
                      {units.map(u => <option key={u.id} value={u.id}>{u.code} — {u.name}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="nexus-label">Forum Title *</label>
                    <input className="nexus-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g., Week 3 Assignment Discussion" required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="nexus-label">Description (optional)</label>
                    <textarea className="nexus-input" rows={2} value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Brief description of what this forum is for..." />
                  </div>
                </div>
                <button type="submit" disabled={submitting} className="text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6a1b9a, #9c27b0)' }}>
                  {submitting ? '⏳ Creating...' : '💬 Create Forum'}
                </button>
              </form>
            </div>
          )}

          {forums.length === 0 ? (
            <div className="nexus-card p-12 text-center text-gray-400">
              <div className="text-4xl mb-3">💬</div>
              <p>No forums yet. Create one above to start discussions with your students!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {forums.map(forum => (
                <button key={forum.id} onClick={() => setSelectedForum(forum)}
                  className="nexus-card nexus-card-interactive p-5 text-left w-full">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{FORUM_TYPES.find(t => t.value === forum.forum_type)?.icon || '💬'}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm truncate" style={{ color: '#6a1b9a' }}>{forum.title}</h3>
                      {forum.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{forum.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="badge badge-purple text-xs">{forum.unit?.code}</span>
                    <span className="text-xs text-gray-400">💬 {(forum.posts as any)?.[0]?.count || 0} posts</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
