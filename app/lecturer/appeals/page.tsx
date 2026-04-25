'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import toast from 'react-hot-toast'
import { UserRole } from '@/types'

export default function LecturerAppealsPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [appeals, setAppeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [replyModal, setReplyModal] = useState<any | null>(null)
  const [replyForm, setReplyForm] = useState({ status: '', lecturer_notes: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadAppeals() }, [])

  async function loadAppeals() {
    setLoading(true)
    try {
      const res = await fetch('/api/timetable-appeals')
      const data = await res.json()
      if (data.success) {
        setAppeals(data.data || [])
      } else {
        toast.error(data.error || 'Failed to load requests')
      }
    } catch {
      toast.error('Network error while loading requests')
    } finally {
      setLoading(false)
    }
  }

  async function handleReplySubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!replyModal) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/timetable-appeals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: replyModal.id,
          status: replyForm.status,
          lecturer_notes: replyForm.lecturer_notes
        })
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Reply sent successfully! ✅')
        setReplyModal(null)
        loadAppeals()
      } else {
        toast.error(data.error || 'Failed to update request')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const statusColors: Record<string, string> = {
    pending: '#e65100', under_review: '#1565c0', approved: '#2e7d32',
    rejected: '#c62828', escalated: '#6a1b9a',
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role={(user?.role || 'lecturer') as UserRole} userName={user?.name || ''} userEmail={user?.email || ''} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
            📥 Student Unit Requests
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage and reply to student appeals and requests for the specific units you are assigned to teach.
          </p>
        </div>

        <div className="nexus-card p-6 border-t-4" style={{ borderColor: '#6a1b9a' }}>
          {loading ? (
            <div className="text-center py-10 text-gray-400">⏳ Loading appeals...</div>
          ) : appeals.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📭</div>
              <p>No student requests found for your units.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appeals.map(appeal => (
                <div key={appeal.id} className="p-5 rounded-xl border transition-all hover:shadow-md" style={{ borderColor: '#e8eaf6', background: 'white' }}>
                  <div className="flex justify-between items-start mb-3 gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-bold text-sm px-2 py-0.5 rounded" style={{ background: '#f3e5f5', color: '#6a1b9a' }}>
                          {appeal.unit?.code}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold" style={{ background: `${statusColors[appeal.status] || '#999'}20`, color: statusColors[appeal.status] || '#999' }}>
                          {appeal.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400 mx-1">•</span>
                        <span className="text-xs text-gray-400">{new Date(appeal.created_at).toLocaleDateString('en-GB')}</span>
                      </div>
                      <h3 className="font-bold text-gray-800 text-sm capitalize">{appeal.appeal_type.replace('_', ' ')}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        👤 From: {appeal.submitter?.full_name} ({appeal.submitter?.student_id || appeal.submitter?.email})
                      </p>
                    </div>
                    <button onClick={() => { setReplyModal(appeal); setReplyForm({ status: appeal.status, lecturer_notes: appeal.lecturer_notes || '' }) }}
                      className="text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
                      style={{ background: '#6a1b9a', color: 'white' }}>
                      View & Reply
                    </button>
                  </div>
                  <div className="mt-3 p-3.5 rounded-lg text-sm text-gray-700 border" style={{ background: '#f8f9fa', borderColor: '#eee' }}>
                    <span className="font-semibold text-gray-500 text-xs block mb-1 uppercase tracking-wide">Request Details:</span>
                    {appeal.description}
                  </div>
                  {appeal.lecturer_notes && (
                    <div className="mt-3 p-3.5 rounded-lg text-sm border" style={{ background: '#fdfbfe', borderColor: '#e1bee7', color: '#4a0072' }}>
                      <span className="font-semibold text-xs block mb-1 uppercase tracking-wide" style={{ color: '#8e24aa' }}>Your Reply:</span>
                      {appeal.lecturer_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Reply Modal */}
      {replyModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
             <div className="p-6 pb-4 border-b" style={{ borderColor: '#f0f0f0' }}>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
                    Reply to Request
                  </h2>
                  <button onClick={() => setReplyModal(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">✕</button>
                </div>
             </div>
             
             <div className="p-6">
                <div className="mb-5 p-3 rounded-xl border text-sm text-gray-600" style={{ background: '#f8f9fa', borderColor: '#eee' }}>
                  <div className="mb-2"><strong className="text-gray-800">Student:</strong> {replyModal.submitter?.full_name}</div>
                  <div><strong className="text-gray-800">Request:</strong> {replyModal.description}</div>
                </div>

                <form onSubmit={handleReplySubmit} className="space-y-4">
                  <div>
                    <label className="nexus-label">Update Status *</label>
                    <select className="nexus-input text-sm" value={replyForm.status} onChange={e => setReplyForm(f => ({ ...f, status: e.target.value }))} required>
                      <option value="pending">Pending</option>
                      <option value="under_review">Under Review</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="escalated">Escalate to Schedule Manager</option>
                    </select>
                  </div>
                  <div>
                    <label className="nexus-label">Your Reply / Notes *</label>
                    <textarea className="nexus-input text-sm" rows={4} value={replyForm.lecturer_notes} onChange={e => setReplyForm(f => ({ ...f, lecturer_notes: e.target.value }))}
                      placeholder="Enter your response or decision to the student..." required />
                  </div>
                  <button type="submit" disabled={submitting}
                    className="w-full py-3 rounded-xl font-bold text-white shadow-md disabled:opacity-60 transition-all mt-2"
                    style={{ background: 'linear-gradient(135deg, #6a1b9a, #9c27b0)' }}>
                    {submitting ? 'Sending...' : '📤 Send Reply & Update'}
                  </button>
                </form>
             </div>
           </div>
         </div>
      )}
    </div>
  )
}