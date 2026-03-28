'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/shared/Sidebar'
import { UserRole } from '@/types'
import toast from 'react-hot-toast'

interface UserRecord {
  id: string
  email: string
  full_name: string
  role: UserRole
  student_id?: string
  staff_id?: string
  is_active: boolean
  is_disabled: boolean
  disability_type?: string
  created_at: string
}

export default function AdminUsers() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [filter, setFilter] = useState<'all' | UserRole>('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', role: 'student' as UserRole,
    student_id: '', staff_id: '', phone: '', is_disabled: false, disability_type: '',
  })

  useEffect(() => { loadUsers() }, [filter, search])

  async function loadUsers() {
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('role', filter)
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/users?${params}`)
    const data = await res.json()
    if (data.success) setUsers(data.data)
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`${form.role.charAt(0).toUpperCase() + form.role.slice(1)} created successfully!`)
        setShowForm(false)
        setForm({ email: '', password: '', full_name: '', role: 'student', student_id: '', staff_id: '', phone: '', is_disabled: false, disability_type: '' })
        loadUsers()
      } else {
        toast.error(data.error || 'Failed to create user')
      }
    } catch {
      toast.error('Connection error')
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(userId: string, currentStatus: boolean) {
    const newStatus = !currentStatus
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, is_active: newStatus }),
    })
    // Also notify the user of their status change
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title: newStatus ? '✅ Account Reactivated' : '🔒 Account Deactivated',
          message: newStatus
            ? 'Your MKU NEXUS account has been reactivated. You now have full access.'
            : 'Your MKU NEXUS account has been deactivated by an administrator. You may log in and request reactivation.',
          type: newStatus ? 'success' : 'warning',
          link: null,
          action_type: 'activation',
        }),
      })
    } catch (_) {}
    toast.success(`User ${newStatus ? 'activated' : 'deactivated'} & notified`)
    loadUsers()
  }

  const roleColors: Record<string, string> = { student: 'badge-navy', lecturer: 'badge-purple', admin: 'badge-green', schedule_manager: 'badge-navy' }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar
        role={(session?.user as unknown as { role: UserRole })?.role || 'admin'}
        userName={session?.user?.name || ''}
        userEmail={session?.user?.email || ''}
      />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
                👥 User Management
              </h1>
              <p className="text-gray-500 mt-1">Create and manage students, lecturers, and administrators</p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary">
              {showForm ? '✕ Cancel' : '+ Create User'}
            </button>
          </div>

          {/* Create User Form */}
          {showForm && (
            <div className="nexus-card p-6 mb-6 animate-fade-in">
              <h2 className="text-lg font-bold mb-5" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
                Create New User
              </h2>
              <form onSubmit={createUser}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="nexus-label">Role *</label>
                    <select className="nexus-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}>
                      <option value="student">Student</option>
                      <option value="lecturer">Lecturer</option>
                      <option value="admin">Administrator</option>
                      <option value="schedule_manager">Schedule Manager</option>
                    </select>
                  </div>
                  <div>
                    <label className="nexus-label">Full Name *</label>
                    <input className="nexus-input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="nexus-label">Email *</label>
                    <input type="email" className="nexus-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="nexus-label">Password *</label>
                    <input type="password" className="nexus-input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
                  </div>
                  {form.role === 'student' && (
                    <div>
                      <label className="nexus-label">Student ID</label>
                      <input className="nexus-input" value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} placeholder="e.g., MKU/2024/001" />
                    </div>
                  )}
                  {(form.role === 'lecturer' || form.role === 'admin' || form.role === 'schedule_manager') && (
                    <div>
                      <label className="nexus-label">Staff ID</label>
                      <input className="nexus-input" value={form.staff_id} onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))} placeholder="e.g., STAFF/001" />
                    </div>
                  )}
                  <div>
                    <label className="nexus-label">Phone</label>
                    <input className="nexus-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>

                {/* Disability Section */}
                <div className="border rounded-xl p-4 mb-4" style={{ borderColor: '#e0e0ef', background: '#f8f9ff' }}>
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input type="checkbox" checked={form.is_disabled}
                      onChange={e => setForm(f => ({ ...f, is_disabled: e.target.checked }))}
                      className="w-4 h-4" />
                    <span className="font-semibold text-sm" style={{ color: '#1a237e' }}>♿ Has Disability/Accessibility Need</span>
                  </label>
                  {form.is_disabled && (
                    <div>
                      <label className="nexus-label">Disability Type / Accessibility Need</label>
                      <input className="nexus-input" value={form.disability_type}
                        onChange={e => setForm(f => ({ ...f, disability_type: e.target.value }))}
                        placeholder="e.g., Mobility impairment, visual impairment, hearing impairment..." />
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? 'Creating...' : '✅ Create User'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <div className="flex gap-2">
              {(['all', 'student', 'lecturer', 'admin', 'schedule_manager'] as const).map(r => (
                <button key={r} onClick={() => setFilter(r)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${filter === r ? 'text-white' : 'text-gray-600 bg-white border'}`}
                  style={filter === r ? { background: '#1a237e', border: 'none' } : { borderColor: '#e0e0ef' }}>
                  {r === 'all' ? 'All Users' : `${r}s`}
                </button>
              ))}
            </div>
            <input
              className="nexus-input ml-auto"
              style={{ maxWidth: '280px' }}
              placeholder="🔍 Search by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Users Table */}
          <div className="nexus-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="nexus-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>ID</th>
                    <th>Accessibility</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-400">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ background: user.role === 'student' ? '#1a237e' : user.role === 'lecturer' ? '#6a1b9a' : '#2e7d32' }}>
                              {user.full_name.charAt(0)}
                            </div>
                            <span className="font-medium">{user.full_name}</span>
                          </div>
                        </td>
                        <td className="text-gray-600">{user.email}</td>
                        <td><span className={`badge ${roleColors[user.role]} capitalize`}>{user.role}</span></td>
                        <td className="text-gray-500 text-xs">{user.student_id || user.staff_id || '—'}</td>
                        <td>
                          {user.is_disabled ? (
                            <span className="accessible-badge accessible-no">♿ {user.disability_type || 'Yes'}</span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${user.is_active ? 'badge-green' : 'badge-red'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-gray-500 text-xs">
                          {new Date(user.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td>
                          <button onClick={() => toggleActive(user.id, user.is_active)}
                            className={`text-xs px-3 py-1 rounded-lg font-medium ${user.is_active ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50'}`}>
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
