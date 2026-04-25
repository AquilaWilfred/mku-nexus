'use client'
import { SessionProvider as NextAuthSessionProvider, useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import ForcePasswordChange from './ForcePasswordChange'

function PasswordGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const mustChange = (session?.user as any)?.must_change_password
  const role = (session?.user as any)?.role || 'student'

  // Prevent hydration mismatch by only showing content after client-side mount
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Show a seamless, ultra-fast global loader while credentials are confirmed
  // This completely stops the "tacky" UI flickering and layout shifts!
  if (!mounted || status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center animate-pulse">
          <div className="text-4xl mb-3">⏳</div>
          <div className="text-sm font-bold text-slate-400 tracking-widest uppercase">Authenticating...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {mustChange && <ForcePasswordChange userRole={role} />}
      {children}
    </>
  )
}

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <PasswordGuard>{children}</PasswordGuard>
    </NextAuthSessionProvider>
  )
}
