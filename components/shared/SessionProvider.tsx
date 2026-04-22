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

  if (!mounted || status === 'loading') return <>{children}</>

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
