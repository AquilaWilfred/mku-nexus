'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function ProfileModal({ isOpen, onClose }: Props) {
  const { data: session, update } = useSession()
  const user = session?.user as any
  const [profile, setProfile] = useState({ full_name: '', phone: '', bio: '', profile_image: '' })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      loadProfile()
    }
  }, [isOpen])

  async function loadProfile() {
    setLoading(true)
    try {
      const res = await fetch('/api/profile')
      const data = await res.json()
      if (data.success) {
        setProfile({
          full_name: data.data.full_name || '',
          phone: data.data.phone || '',
          bio: data.data.bio || '',
          profile_image: data.data.profile_image || '',
        })
      }
    } catch {}
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Profile updated! ✅')
        await update() // Refresh the session to pick up new name/image
        onClose()
      } else {
        toast.error(data.error || 'Failed to update')
      }
    } catch {
      toast.error('Connection error')
    }
    setSaving(false)
  }

  // Handle photo upload — convert to base64 data URL
  // In production you'd upload to Supabase Storage; here we store as base64
  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Photo must be under 2MB')
      return
    }
    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        setProfile(p => ({ ...p, profile_image: dataUrl }))
        setUploading(false)
        toast.success('Photo ready — click Save to apply')
      }
      reader.readAsDataURL(file)
    } catch {
      toast.error('Failed to process photo')
      setUploading(false)
    }
  }

  if (!isOpen) return null

  const roleColors: Record<string, string> = {
    student: '#1a237e', lecturer: '#6a1b9a', admin: '#2e7d32', schedule_manager: '#0d47a1',
  }
  const color = roleColors[user?.role] || '#1a237e'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 pb-4" style={{ background: `linear-gradient(135deg, ${color}15, ${color}25)`, borderBottom: `3px solid ${color}` }}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color }}>
                👤 Edit Profile
              </h2>
              <p className="text-gray-500 text-sm mt-0.5">Update your information & profile photo</p>
            </div>
            <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-700">×</button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading profile...</div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              {/* Profile Photo */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {profile.profile_image ? (
                    <img src={profile.profile_image} alt="Profile"
                      className="w-24 h-24 rounded-full object-cover shadow-lg"
                      style={{ border: `3px solid ${color}` }} />
                  ) : (
                    <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
                      {(profile.full_name || user?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md text-sm"
                    style={{ background: color }}>
                    {uploading ? '⏳' : '📷'}
                  </button>
                </div>
                <p className="text-xs text-gray-400">Click the camera icon to change photo (max 2MB)</p>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </div>

              {/* Full Name */}
              <div>
                <label className="nexus-label">Full Name</label>
                <input type="text" value={profile.full_name}
                  onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                  className="nexus-input" placeholder="Your full name" required />
              </div>

              {/* Phone */}
              <div>
                <label className="nexus-label">Phone Number</label>
                <input type="tel" value={profile.phone}
                  onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                  className="nexus-input" placeholder="+254 7xx xxx xxx" />
              </div>

              {/* Bio */}
              <div>
                <label className="nexus-label">Bio / About Me</label>
                <textarea value={profile.bio}
                  onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                  className="nexus-input" rows={3}
                  placeholder="A short description about yourself..." />
              </div>

              {/* Read-only info */}
              <div className="p-3 rounded-xl text-xs text-gray-500" style={{ background: '#f8f9ff' }}>
                📧 <strong>Email:</strong> {user?.email} (cannot be changed)<br />
                🎭 <strong>Role:</strong> {user?.role} (set by admin)
              </div>

              <button type="submit" disabled={saving || uploading}
                className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
                {saving ? 'Saving...' : '💾 Save Profile'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
