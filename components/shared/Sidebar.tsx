'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import ProfileModal from './ProfileModal'

interface NavItem { label: string; href: string; icon: string }

const navConfig: Record<string, NavItem[]> = {
  student: [
    { label: 'Dashboard', href: '/student/dashboard', icon: '🏠' },
    { label: 'My Timetable', href: '/student/timetable', icon: '📅' },
    { label: 'My Units', href: '/student/units', icon: '📚' },
    { label: 'Materials', href: '/student/materials', icon: '📁' },
    { label: 'Forums', href: '/student/forums', icon: '💬' },
    { label: 'Events', href: '/student/events', icon: '📢' },
    { label: 'AI Assistant', href: '/student/chat', icon: '🤖' },
    { label: 'Accessibility', href: '/student/appeals', icon: '♿' },
    { label: 'Timetable Appeal', href: '/student/timetable-appeal', icon: '📋' },
    { label: 'Notifications', href: '/student/notifications', icon: '🔔' },
  ],
  lecturer: [
    { label: 'Dashboard', href: '/lecturer/dashboard', icon: '🏠' },
    { label: 'My Units', href: '/lecturer/units', icon: '📖' },
    { label: 'Upload Materials', href: '/lecturer/materials', icon: '⬆️' },
    { label: 'Forums', href: '/lecturer/forums', icon: '💬' },
    { label: 'Post Events', href: '/lecturer/events', icon: '📢' },
    { label: 'My Timetable', href: '/lecturer/timetable', icon: '📅' },
    { label: 'Request Venue', href: '/lecturer/venues', icon: '🏛️' },
    { label: 'Timetable Appeal', href: '/lecturer/timetable-appeal', icon: '📋' },
    { label: 'Appeals', href: '/lecturer/appeals', icon: '♿' },
    { label: 'AI Assistant', href: '/lecturer/chat', icon: '🤖' },
    { label: 'Notifications', href: '/lecturer/notifications', icon: '🔔' },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
    { label: 'Users', href: '/admin/users', icon: '👥' },
    { label: 'Units & Timetable', href: '/admin/timetable', icon: '📅' },
    { label: 'Events', href: '/admin/events', icon: '📢' },
    { label: 'Buildings & Venues', href: '/admin/venues', icon: '🏛️' },
    { label: 'Accessibility Appeals', href: '/admin/appeals', icon: '♿' },
    { label: 'Timetable Appeals', href: '/admin/timetable-appeals', icon: '📋' },
    { label: 'Help Requests', href: '/admin/help', icon: '🛟' },
    { label: 'AI Training', href: '/admin/training', icon: '🧠' },
    { label: 'AI Assistant', href: '/admin/chat', icon: '🤖' },
    { label: 'Notifications', href: '/admin/notifications', icon: '🔔' },
  ],
  schedule_manager: [
    { label: 'Dashboard', href: '/schedule-manager/dashboard', icon: '📊' },
    { label: 'Timetable Appeals', href: '/schedule-manager/appeals', icon: '📋' },
    { label: 'Manage Timetable', href: '/schedule-manager/timetable', icon: '📅' },
    { label: 'Notifications', href: '/schedule-manager/notifications', icon: '🔔' },
  ],
}

const roleColors: Record<string, string> = {
  student: '#1a237e', lecturer: '#6a1b9a', admin: '#2e7d32', schedule_manager: '#0d47a1',
}
const roleLabels: Record<string, string> = {
  student: 'Student', lecturer: 'Lecturer', admin: 'Administrator', schedule_manager: 'Schedule Manager',
}

interface SidebarProps { role: string; userName: string; userEmail: string }

export default function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const navItems = navConfig[role] || navConfig.student
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  // Fetch profile image from API (NOT from session/JWT — it could be base64 and too large for cookie)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    fetchProfileImage()
    fetchNotifCount()
    // Refresh badge every 30 seconds
    const interval = setInterval(fetchNotifCount, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchProfileImage() {
    try {
      const res = await fetch('/api/profile')
      const data = await res.json()
      if (data.success && data.data?.profile_image) {
        setProfileImage(data.data.profile_image)
      }
    } catch (_) {}
  }

  async function fetchNotifCount() {
    try {
      const res = await fetch('/api/notifications/count')
      const data = await res.json()
      setNotifCount(data.count || 0)
    } catch (_) {}
  }

  const color = roleColors[role] || '#1a237e'

  const SidebarContent = () => (
    <aside className="nexus-sidebar w-64 flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>N</span>
          </div>
          <div className="min-w-0">
            <div className="text-white font-bold text-base truncate" style={{ fontFamily: 'Playfair Display, serif' }}>MKU NEXUS</div>
            <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>{roleLabels[role] || role} Portal</div>
          </div>
        </div>
      </div>

      {/* User Info — click to open Profile Modal */}
      <button
        className="px-4 py-3 border-b flex-shrink-0 text-left hover:bg-white/10 transition-colors w-full"
        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
        onClick={() => setProfileOpen(true)}
      >
        <div className="flex items-center gap-3">
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              style={{ border: '2px solid rgba(255,255,255,0.5)' }}
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-white font-medium text-sm truncate">{userName}</div>
            <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {userEmail} · <span className="opacity-80">Edit Profile ✏️</span>
            </div>
          </div>
        </div>
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`nav-item ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              <span className="truncate text-sm">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <button
          onClick={() => signOut({
            callbackUrl: role === 'schedule_manager'
              ? '/schedule-manager/login'
              : `/${role}/login`,
          })}
          className="nav-item w-full text-left"
          style={{ color: 'rgba(255,100,100,0.9)' }}
        >
          <span className="flex-shrink-0">🚪</span>
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-xl text-white shadow-lg"
        style={{ background: color }}
        onClick={() => setMobileOpen(true)}
      >
        ☰
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <div className="h-full w-64" onClick={e => e.stopPropagation()}>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop */}
      <div className="hidden md:block flex-shrink-0 h-full">
        <SidebarContent />
      </div>

      {/* Profile Modal — refreshes profile image on close */}
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => {
          setProfileOpen(false)
          fetchProfileImage()   // Refresh avatar after save
        }}
      />
    </>
  )
}
