'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function StudentProfile() {
  const { data: session, update, status } = useSession()
  const router = useRouter()
  const user = session?.user as any
  
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    bio: '',
    profile_image: '',
    student_id: '',
    intake_year: '',
    registration_id: '',
    courseCode: '',
    courseName: ''
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!session) {
      router.push('/student/login')
      return
    }
    if (status === 'authenticated' && user?.role && user.role !== 'student') {
      router.push(`/${user.role}/dashboard`)
      return
    }
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

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
          student_id: data.data.student_id || '',
          intake_year: data.data.intake_year || '',
          registration_id: data.data.registration_id || '',
          courseCode: data.data.courseCode || '',
          courseName: data.data.courseName || ''
        })
      }
    } catch (error) {
      toast.error('Failed to load profile')
    }
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    
    // Validation
    if (!profile.intake_year) {
      toast.error('Intake year is required')
      return
    }
    if (!profile.registration_id) {
      toast.error('Registration ID is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: profile.phone,
          bio: profile.bio,
          profile_image: profile.profile_image,
          intake_year: profile.intake_year ? parseInt(profile.intake_year) : null,
          registration_id: profile.registration_id
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Profile updated successfully! ✅')
        await update()
      } else {
        toast.error(data.error || 'Failed to update')
      }
    } catch (error) {
      toast.error('Connection error')
    }
    setSaving(false)
  }

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
        toast.success('Photo updated')
      }
      reader.readAsDataURL(file)
    } catch {
      toast.error('Failed to process photo')
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="w-full max-w-5xl lg:w-4/5 mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
          >
            ← Back
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
            My Profile
          </h1>
          <p className="text-gray-600 mt-2">Update your personal and registration information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <form onSubmit={handleSave} className="p-6 md:p-8 space-y-8">
            
            {/* Profile Photo Section */}
            <div className="flex flex-col items-center gap-4 pb-8 border-b">
              <div className="relative">
                {profile.profile_image ? (
                  <img 
                    src={profile.profile_image} 
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover shadow-lg border-4 border-blue-500"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-bold text-white shadow-lg bg-gradient-to-br from-blue-500 to-purple-600 border-4 border-blue-400">
                    {(profile.full_name || user?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <button 
                  type="button" 
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-xl bg-white border-2 border-blue-500 hover:bg-blue-50 transition"
                  disabled={uploading}
                >
                  {uploading ? '⏳' : '📷'}
                </button>
              </div>
              <p className="text-sm text-gray-500">Click camera icon to change photo (max 2MB)</p>
              <input 
                ref={fileRef} 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoChange} 
                className="hidden" 
              />
            </div>

            {/* Personal Information */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                👤 Personal Information
              </h2>
              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={profile.full_name}
                    disabled
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Name is set by administration and cannot be changed</p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                  <input 
                    type="tel" 
                    value={profile.phone}
                    onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="+254 7xx xxx xxx"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bio / About Me</label>
                  <textarea 
                    value={profile.bio}
                    onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    rows={4}
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>
            </div>

            {/* Registration Information */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                🎓 Registration Information
              </h2>
              <div className="space-y-4">
                {/* Student ID */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Student ID</label>
                  <input 
                    type="text" 
                    value={profile.student_id}
                    disabled
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Assigned by administration</p>
                </div>

                {/* Course */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Course</label>
                  <input 
                    type="text" 
                    value={profile.courseName}
                    disabled
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Assigned by administration</p>
                </div>

                {/* Intake Year */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Intake Year *</label>
                  <input 
                    type="number" 
                    value={profile.intake_year}
                    onChange={e => setProfile(p => ({ ...p, intake_year: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="e.g., 2022"
                    min={2000}
                    max={new Date().getFullYear()}
                    required
                  />
                </div>

                {/* Registration ID */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Registration ID (Unique Number) *</label>
                  <input 
                    type="text" 
                    value={profile.registration_id}
                    onChange={e => setProfile(p => ({ ...p, registration_id: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="e.g., 31309"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">This is the unique identifier part of your registration number</p>
                </div>

                {/* Generated Registration Number */}
                {profile.courseCode && profile.intake_year && profile.registration_id && (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300">
                    <p className="text-xs text-gray-700 mb-2 font-semibold">Your Registration Number:</p>
                    <p className="text-2xl font-bold text-blue-900 font-mono">
                      {profile.courseCode}/{profile.intake_year}/{profile.registration_id}
                    </p>
                    {profile.courseName && (
                      <p className="text-sm text-gray-600 mt-2">
                        📚 <strong>{profile.courseName}</strong>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Account Information */}
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-3">Account Information</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> {user?.email} (cannot be changed)</p>
                <p><strong>Role:</strong> Student</p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex gap-3 pt-4">
              <button 
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 rounded-lg border-2 border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={saving || uploading}
                className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 font-semibold text-white hover:shadow-lg transition disabled:opacity-60"
              >
                {saving ? '💾 Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
