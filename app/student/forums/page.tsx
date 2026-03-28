'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import { UserRole } from '@/types'
import toast from 'react-hot-toast'

interface Forum {
  id: string; title: string; description?: string; forum_type: string; created_at: string
  unit?: { id: string; code: string; name: string }
  creator?: { full_name: string; role: string }
  posts?: [{ count: number }]
}
interface Post {
  id: string; content: string; created_at: string
  author?: { full_name: string; role: string }
  replies?: { id: string; content: string; created_at: string; author?: { full_name: string; role: string } }[]
}

const forumTypeIcons: Record<string, string> = {
  discussion: '💬', assignment: '📝', quiz: '🎯', announcement: '📢', general: '📌'
}

export default function StudentForums() {
  const { data: session } = useSession()
  const [forums, setForums] = useState<Forum[]>([])
  const [selectedForum, setSelectedForum] = useState<Forum | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [newPost, setNewPost] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(false)
  const [postsLoading, setPostsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const role = (session?.user as any)?.role || 'student'

  useEffect(() => { loadForums() }, [])
  useEffect(() => {
    if (selectedForum) loadPosts(selectedForum.id)
  }, [selectedForum])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [posts])

  async function loadForums() {
    const res = await fetch('/api/forums')
    const data = await res.json()
    if (data.success) setForums(data.data)
  }

  async function loadPosts(forumId: string) {
    setPostsLoading(true)
    const res = await fetch(`/api/forums/${forumId}/posts`)
    const data = await res.json()
    if (data.success) setPosts(data.data)
    setPostsLoading(false)
  }

  async function submitPost(e: React.FormEvent) {
    e.preventDefault()
    if (!newPost.trim() || !selectedForum) return
    setLoading(true)
    try {
      const res = await fetch(`/api/forums/${selectedForum.id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPost }),
      })
      const data = await res.json()
      if (data.success) { setNewPost(''); loadPosts(selectedForum.id) }
      else toast.error(data.error || 'Failed to post')
    } finally { setLoading(false) }
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
    else toast.error(data.error || 'Failed to reply')
  }

  const roleColors: Record<string, string> = { lecturer: '#6a1b9a', admin: '#2e7d32', student: '#1a237e' }

  if (selectedForum) {
    return (
      <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
        <Sidebar role={role as UserRole} userName={session?.user?.name || ''} userEmail={session?.user?.email || ''} />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Forum header */}
          <div className="p-4 md:p-6 border-b bg-white flex items-center gap-3 flex-shrink-0">
            <button onClick={() => setSelectedForum(null)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0">← Back</button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl">{forumTypeIcons[selectedForum.forum_type] || '💬'}</span>
                <h1 className="font-bold text-base md:text-lg truncate" style={{ color: '#1a237e' }}>{selectedForum.title}</h1>
                <span className="badge badge-navy text-xs flex-shrink-0">{selectedForum.unit?.code}</span>
              </div>
              {selectedForum.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{selectedForum.description}</p>}
            </div>
          </div>

          {/* Posts */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {postsLoading ? (
              <div className="text-center py-10 text-gray-400">Loading posts...</div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">💬</div>
                <p className="font-medium">No posts yet — be the first!</p>
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
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                        style={{ background: roleColors[post.author?.role || 'student'] + '20', color: roleColors[post.author?.role || 'student'] }}>
                        {post.author?.role}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(post.created_at).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed break-words">{post.content}</p>
                    <button onClick={() => setReplyTo(replyTo === post.id ? null : post.id)}
                      className="text-xs text-blue-600 mt-2 hover:underline">
                      💬 Reply ({post.replies?.length || 0})
                    </button>
                  </div>
                </div>

                {/* Replies */}
                {post.replies && post.replies.length > 0 && (
                  <div className="mt-3 ml-11 space-y-3">
                    {post.replies.map(reply => (
                      <div key={reply.id} className="flex items-start gap-2 p-3 rounded-xl" style={{ background: '#f8f9ff' }}>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: roleColors[reply.author?.role || 'student'] }}>
                          {reply.author?.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="font-semibold text-xs">{reply.author?.full_name}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(reply.created_at).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 break-words">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply input */}
                {replyTo === post.id && (
                  <div className="mt-3 ml-11 flex gap-2">
                    <input
                      className="nexus-input flex-1 text-sm"
                      placeholder="Write a reply..."
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(post.id) } }}
                    />
                    <button onClick={() => submitReply(post.id)}
                      className="px-3 py-2 rounded-xl text-white text-sm font-semibold flex-shrink-0"
                      style={{ background: '#1a237e' }}>
                      Send
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* New post input */}
          <form onSubmit={submitPost} className="p-4 border-t bg-white flex gap-3 flex-shrink-0">
            <input
              className="nexus-input flex-1 text-sm"
              placeholder="Write a post or question..."
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
            />
            <button type="submit" disabled={loading || !newPost.trim()}
              className="px-4 py-2 rounded-xl text-white font-semibold disabled:opacity-50 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1a237e, #3949ab)' }}>
              {loading ? '...' : 'Post'}
            </button>
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
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
              💬 Discussion Forums
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Forums for your enrolled units</p>
          </div>

          {forums.length === 0 ? (
            <div className="nexus-card p-12 md:p-16 text-center text-gray-400">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-lg font-semibold mb-2">No Forums Yet</h3>
              <p className="text-sm">Your lecturers will create discussion forums here. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {forums.map(forum => (
                <button key={forum.id} onClick={() => setSelectedForum(forum)}
                  className="nexus-card nexus-card-interactive p-5 text-left w-full">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{forumTypeIcons[forum.forum_type] || '💬'}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm leading-tight truncate" style={{ color: '#1a237e' }}>{forum.title}</h3>
                      {forum.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{forum.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="badge badge-navy text-xs">{forum.unit?.code} — {forum.unit?.name}</span>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>💬 {(forum.posts as any)?.[0]?.count || 0} posts</span>
                      <span className="capitalize">{forum.forum_type}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">By {forum.creator?.full_name} · {new Date(forum.created_at).toLocaleDateString('en-KE')}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
