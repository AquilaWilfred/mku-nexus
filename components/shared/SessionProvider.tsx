'use client'
import { SessionProvider as NextAuthSessionProvider, useSession } from 'next-auth/react'
import ForcePasswordChange from './ForcePasswordChange'

function PasswordGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const mustChange = (session?.user as any)?.must_change_password
  const role = (session?.user as any)?.role || 'student'

  if (status === 'loading') return <>{children}</>

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
