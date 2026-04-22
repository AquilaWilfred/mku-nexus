'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

interface NavItem { label: string; href: string; icon: string }

const navConfig: Record<string, NavItem[]> = {
  student: [
    { label: 'Dashboard', href: '/student/dashboard', icon: '🏠' },
    { label: 'My Profile', href: '/student/profile', icon: '👤' },
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
    { label: 'My Profile', href: '/lecturer/profile', icon: '👤' },
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
    { label: 'My Profile', href: '/admin/profile', icon: '👤' },
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
    { label: 'My Profile', href: '/schedule-manager/profile', icon: '👤' },
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
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [notifCount, setNotifCount] = useState(0)
  const [isOpen, setIsOpen] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    fetchProfileImage()
    fetchNotifCount()
    const interval = setInterval(fetchNotifCount, 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(min-width: 768px)')
    const handleResize = (event: MediaQueryListEvent) => {
      setIsOpen(event.matches)
      if (!event.matches) {
        setCollapsed(false)
      }
    }
    setIsOpen(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleResize)
    return () => mediaQuery.removeEventListener('change', handleResize)
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

  const sidebarBaseClass = `fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden bg-slate-950/95 backdrop-blur-xl text-white border-r border-white/10 transition-all duration-300 ease-in-out ${collapsed ? 'md:w-20' : 'md:w-64'} bg-gradient-to-b from-slate-950 to-slate-900`
  const sidebarVisibilityClass = isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
  const itemBaseClass = `nav-item flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors duration-200 ${collapsed ? 'justify-center' : ''}`

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="fixed top-4 left-4 z-50 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white text-slate-900 shadow-lg shadow-slate-900/10 md:hidden"
        aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
      >
        {isOpen ? '✕' : '☰'}
      </button>

      <div
        className={`fixed inset-0 z-40 bg-black/40 md:hidden ${isOpen ? 'block' : 'hidden'}`}
        onClick={() => setIsOpen(false)}
      />

      <div className={`${sidebarBaseClass} ${sidebarVisibilityClass}`} style={{ minHeight: '100vh' }}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-lg font-bold text-white">
            N
          </div>
          <div className={`flex-1 min-w-0 ${collapsed ? 'hidden' : 'block'}`}>
            <div className="text-white font-bold text-base truncate" style={{ fontFamily: 'Playfair Display, serif' }}>MKU NEXUS</div>
            <div className="text-xs text-slate-300 truncate">{roleLabels[role] || role} Portal</div>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="hidden rounded-full bg-white/10 p-2 text-slate-200 hover:bg-white/15 md:inline-flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <Link
          href={`/${role}/profile`}
          className={`px-4 py-4 border-b text-left hover:bg-white/10 transition-colors ${collapsed ? 'justify-center' : ''} flex items-center gap-3`}
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}
        >
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              style={{ border: '2px solid rgba(255,255,255,0.5)' }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-white font-medium text-sm truncate">{userName}</div>
              <div className="text-xs text-slate-300 truncate">{userEmail}</div>
            </div>
          )}
        </Link>

        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${itemBaseClass} ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
              >
                <span className="text-lg">{item.icon}</span>
                {!collapsed && <span className="truncate text-sm">{item.label}</span>}
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => signOut({ callbackUrl: role === 'schedule_manager' ? '/schedule-manager/login' : `/${role}/login` })}
            className={`${itemBaseClass} w-full text-left text-red-300 hover:bg-red-500/10 hover:text-red-100 ${collapsed ? 'justify-center' : ''}`}
          >
            <span className="text-lg">🚪</span>
            {!collapsed && <span className="text-sm">Sign Out</span>}
          </button>
        </div>
      </div>
      <div className={`hidden md:block flex-shrink-0 ${collapsed ? 'w-20' : 'w-64'}`} aria-hidden="true" />
    </>
  )
}
