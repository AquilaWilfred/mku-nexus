'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/schedule-manager/dashboard', icon: '📊' },
  { label: 'Timetable Appeals', href: '/schedule-manager/appeals', icon: '📋' },
  { label: 'Manage Timetable', href: '/schedule-manager/timetable', icon: '📅' },
  { label: 'Notifications', href: '/schedule-manager/notifications', icon: '🔔' },
]

interface SMSidebarProps {
  userName: string
  userEmail: string
}

export default function SMSidebar({ userName, userEmail }: SMSidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)')
    const handleResize = (event: MediaQueryListEvent) => {
      setIsOpen(event.matches)
      if (!event.matches) setCollapsed(false)
    }
    setIsOpen(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleResize)
    return () => mediaQuery.removeEventListener('change', handleResize)
  }, [])

  const sidebarBaseClass = `fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden bg-slate-950/95 backdrop-blur-xl text-white border-r border-white/10 transition-all duration-300 ease-in-out ${collapsed ? 'md:w-20' : 'md:w-64'} bg-gradient-to-b from-slate-950 to-slate-900`
  const sidebarVisibilityClass = isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'

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
            <div className="text-xs text-slate-300 truncate">Schedule Manager Portal</div>
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

        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className={`min-w-0 ${collapsed ? 'hidden' : 'block'}`}>
              <div className="text-white font-medium text-sm truncate">{userName}</div>
              <div className="text-xs text-slate-300 truncate">{userEmail}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors duration-200 ${collapsed ? 'justify-center' : ''} ${pathname === item.href ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
              >
                <span className="text-lg">{item.icon}</span>
                {!collapsed && <span className="truncate text-sm">{item.label}</span>}
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => signOut({ callbackUrl: '/schedule-manager/login' })}
            className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors duration-200 w-full text-left text-red-300 hover:bg-red-500/10 hover:text-red-100 ${collapsed ? 'justify-center' : ''}`}
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
