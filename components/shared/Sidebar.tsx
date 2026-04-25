'use client'
import { useState, useEffect, useRef } from 'react'
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

// Helper function for relative time formatting
function getRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`
  return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
}

interface SidebarProps { role: string; userName: string; userEmail: string }

export default function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const navItems = navConfig[role] || navConfig.student
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [notifCount, setNotifCount] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const [isOpen, setIsOpen] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [missingBio, setMissingBio] = useState(false)
  const [isWiggling, setIsWiggling] = useState(false)
  const knownNotifs = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetchProfileImage()
    fetchNotificationsData()
    const interval = setInterval(fetchNotificationsData, 30000)
    
    // Listen for custom event from the Notifications page
    window.addEventListener('notificationsUpdated', fetchNotificationsData)

    // Request browser notification permissions
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      clearInterval(interval)
      window.removeEventListener('notificationsUpdated', fetchNotificationsData)
    }
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

  // Auto-close notification dropdown when the user scrolls anywhere on the page
  useEffect(() => {
    if (showNotifDropdown) {
      const handleScroll = () => setShowNotifDropdown(false)
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setShowNotifDropdown(false)
      }
      window.addEventListener('scroll', handleScroll, { capture: true })
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        window.removeEventListener('scroll', handleScroll, { capture: true })
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [showNotifDropdown])

  async function fetchProfileImage() {
    try {
      const res = await fetch('/api/profile')
      const data = await res.json()
      if (data.success && data.data) {
        if (data.data.profile_image) {
          setProfileImage(data.data.profile_image)
        }
        setMissingBio(!data.data.bio || data.data.bio.trim() === '')
      }
    } catch (_) {}
  }

  async function fetchNotificationsData() {
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      if (data.success) {
        const newNotifs = data.data || []
        setNotifications(newNotifs)
        const unread = newNotifs.filter((n: any) => !n.is_read).length
        setNotifCount(unread)

        // Trigger wiggle animation if there are new unread notifications (ignoring the initial load)
        const hasNewUnread = knownNotifs.current.size > 0 && newNotifs.some((n: any) => !n.is_read && !knownNotifs.current.has(n.id))
        if (hasNewUnread) {
          setIsWiggling(true)
          setTimeout(() => setIsWiggling(false), 2000) // Wiggle for 2 seconds
        }

        // Check for NEW urgent notifications
        if (knownNotifs.current.size > 0) {
          const freshUrgent = newNotifs.filter((n: any) => 
            !n.is_read && n.type === 'urgent' && !knownNotifs.current.has(n.id)
          )
          
          freshUrgent.forEach((n: any) => {
            const soundPref = localStorage.getItem('nexus_sound_enabled')
            if (soundPref !== 'false') {
              // Play a subtle pop sound (catch ignores strict browser autoplay block errors)
              new Audio('https://actions.google.com/sounds/v1/ui/bubble_pop.ogg').play().catch(() => {})
            }
            
            // Show browser notification
            const pushPref = localStorage.getItem('nexus_push_enabled')
            if (pushPref !== 'false' && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(`🚨 Urgent: ${n.title}`, { body: n.message })
            }
          })
        }
        
        knownNotifs.current = new Set(newNotifs.map((n: any) => n.id))
      }
    } catch (_) {}
  }

  const sidebarBaseClass = `fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden bg-slate-950/95 backdrop-blur-xl text-white border-r border-white/10 transition-all duration-300 ease-in-out ${collapsed ? 'md:w-20' : 'md:w-64'} bg-gradient-to-b from-slate-950 to-slate-900`
  const sidebarVisibilityClass = isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
  const itemBaseClass = `nav-item flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors duration-200 ${collapsed ? 'justify-center' : ''}`

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          50% { transform: rotate(15deg); }
          75% { transform: rotate(-15deg); }
        }
        .animate-wiggle {
          animation: wiggle 0.4s ease-in-out infinite;
        }
        @keyframes slideFadeIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-dropdown {
          animation: slideFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: top right;
        }
      `}} />
      {/* Floating Header Notification Bell & Dropdown */}
      <div className="fixed top-4 right-4 md:top-6 md:right-8 z-50">
        <div className="relative group">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-2.5 bg-white rounded-full shadow-md text-slate-700 hover:bg-slate-50 transition-colors border border-slate-200"
            aria-label="View notifications"
          >
            <span className={`text-xl leading-none block inline-block ${isWiggling ? 'animate-wiggle' : ''}`}>🔔</span>
            {notifCount > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full shadow-sm">
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </button>
          
          {/* Custom Tooltip */}
          <div className="absolute top-full right-0 mt-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
            Notifications
          </div>

          {showNotifDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifDropdown(false)} />
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden text-slate-800 z-50 animate-dropdown">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-sm" style={{ color: '#1a237e' }}>Recent Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">No notifications yet.</div>
                  ) : (
                    (() => {
                      const topNotifs = notifications.slice(0, 6);
                      const todayNotifs = topNotifs.filter(n => new Date(n.created_at).toDateString() === new Date().toDateString());
                      const earlierNotifs = topNotifs.filter(n => new Date(n.created_at).toDateString() !== new Date().toDateString());

                      const renderNotif = (n: any) => (
                        <Link key={n.id} href={n.link || `/${role}/notifications`} onClick={() => setShowNotifDropdown(false)} className={`block p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                          <div className="flex justify-between items-start mb-1 gap-2">
                            <h4 className={`text-xs ${!n.is_read ? 'font-bold text-blue-900' : 'font-semibold text-slate-700'}`}>{n.title}</h4>
                            {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1 flex-shrink-0"></span>}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 leading-snug">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-2 block">{getRelativeTime(n.created_at)}</span>
                        </Link>
                      );

                      return (
                        <>
                          {todayNotifs.length > 0 && (
                            <>
                              <div className="px-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-100 z-10">Today</div>
                              {todayNotifs.map(renderNotif)}
                            </>
                          )}
                          {earlierNotifs.length > 0 && (
                            <>
                              <div className="px-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-100 z-10">Earlier</div>
                              {earlierNotifs.map(renderNotif)}
                            </>
                          )}
                        </>
                      );
                    })()
                  )}
                </div>
                <div className="p-3 border-t border-slate-100 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                  <Link href={`/${role}/notifications`} onClick={() => setShowNotifDropdown(false)} className="text-xs font-bold text-blue-600 block">
                    View All Notifications →
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

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
            S
          </div>
          <div className={`flex-1 min-w-0 ${collapsed ? 'hidden' : 'block'}`}>
            <div className="text-white font-bold text-base truncate" style={{ fontFamily: 'Playfair Display, serif' }}>MKU Summit</div>
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
          <div className="relative flex-shrink-0">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover"
                style={{ border: '2px solid rgba(255,255,255,0.5)' }}
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            {missingBio && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-slate-900 rounded-full"></span>
            )}
          </div>
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
                {!collapsed && <span className="truncate text-sm flex-1">{item.label}</span>}
                {!collapsed && item.label === 'Notifications' && notifCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">
                    {notifCount > 99 ? '99+' : notifCount}
                  </span>
                )}
                {!collapsed && item.label === 'My Profile' && missingBio && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">
                    Setup
                  </span>
                )}
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
