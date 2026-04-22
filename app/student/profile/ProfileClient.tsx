'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

interface ProfileData {
  id: string
  full_name: string
  email: string
  student_id?: string
  staff_id?: string
  profile_image?: string
  phone?: string
  bio?: string
  disability_status?: string
  course_id?: string
  year_of_study?: number
  course?: {
    id: string
    code: string
    name: string
    description?: string
  }
  needsRegistration?: boolean
  created_at: string
}

interface ProfileClientProps {
  profile: ProfileData
}

export default function ProfileClient({ profile }: ProfileClientProps) {
  const { data: session } = useSession()
  const user = session?.user as any
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    phone: profile.phone || '',
    profile_image: profile.profile_image || '',
    bio: profile.bio || ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [generatingRegistration, setGeneratingRegistration] = useState(false)

  const handleSave = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Profile updated successfully')
        window.location.reload()
      } else {
        toast.error(data.error || 'Failed to update profile')
      }
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGenerateRegistration = async () => {
    if (!profile.course_id) {
      toast.error('Cannot generate registration number. Please contact your administrator.')
      return
    }

    setGeneratingRegistration(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateStudentId: true })
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Registration number generated: ' + data.data.student_id)
        window.location.reload()
      } else {
        toast.error(data.error || 'Failed to generate registration number')
      }
    } catch (error) {
      toast.error('Failed to generate registration number')
    } finally {
      setGeneratingRegistration(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
          My Profile 👤
        </h1>
        <p className="text-gray-500 mt-1">Manage your account information</p>
      </div>

      {profile?.needsRegistration && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-orange-600 text-xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-1">Registration Number Required</h3>
              <p className="text-orange-800 text-sm mb-3">
                You need to generate your registration number in the format COURSE_CODE/YEAR/UNIQUE_CODE to continue using the portal fully.
              </p>
              {profile?.course ? (
                <div className="text-sm text-orange-800 mb-3">
                  <p><strong>Your Course:</strong> {profile.course.code} - {profile.course.name}</p>
                  <p><strong>Year of Study:</strong> {profile.year_of_study || 1}</p>
                  <p className="text-xs mt-1">Example: {profile.course.code}/{profile.year_of_study || 1}/12345</p>
                </div>
              ) : (
                <p className="text-sm text-orange-800 mb-3">
                  Your course has not been assigned yet. Please contact your administrator.
                </p>
              )}
              {profile?.course_id && (
                <button
                  onClick={handleGenerateRegistration}
                  disabled={generatingRegistration}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-medium"
                >
                  {generatingRegistration ? 'Generating...' : 'Generate Registration Number'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="nexus-card p-8">
        {editing ? (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Profile Image URL</label>
              <input
                type="url"
                value={formData.profile_image}
                onChange={(e) => setFormData({ ...formData, profile_image: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={submitting}
                className="btn-primary disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              {profile?.profile_image ? (
                <img
                  src={profile.profile_image}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                  {profile?.full_name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{profile?.full_name}</h2>
                <p className="text-gray-600">{profile?.email}</p>
                <p className="text-sm text-gray-500">
                  Registration: {profile?.student_id ? (
                    <span className="font-mono text-green-600 font-semibold">{profile.student_id}</span>
                  ) : (
                    <span className="text-orange-600 font-semibold">Pending</span>
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">Phone:</span>
                    <p className="text-gray-900">{profile?.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Email:</span>
                    <p className="text-gray-900">{profile?.email}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account & Course Details</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">Role:</span>
                    <p className="text-gray-900">Student</p>
                  </div>
                  {profile?.course && (
                    <>
                      <div>
                        <span className="text-sm text-gray-500">Course:</span>
                        <p className="text-gray-900">{profile.course.code} - {profile.course.name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Year of Study:</span>
                        <p className="text-gray-900">{profile.year_of_study || 1}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="text-sm text-gray-500">Member since:</span>
                    <p className="text-gray-900">{new Date(profile?.created_at || '').toLocaleDateString()}</p>
                  </div>
                  {profile?.bio && (
                    <div>
                      <span className="text-sm text-gray-500">Bio:</span>
                      <p className="text-gray-900">{profile.bio}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t">
              <button
                onClick={() => setEditing(true)}
                className="btn-primary"
              >
                Edit Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}