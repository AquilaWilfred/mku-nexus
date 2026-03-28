import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { UserRole } from '@/types'
import { redirect } from 'next/navigation'

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function requireAuth(role?: UserRole) {
  const session = await getSession()
  if (!session) {
    redirect('/student/login')
  }
  if (role && (session.user as unknown as { role: string }).role !== role) {
    redirect(`/${(session.user as unknown as { role: string }).role}/dashboard`)
  }
  return session
}

export async function requireRole(allowedRoles: UserRole[]) {
  const session = await getSession()
  const userRole = (session?.user as unknown as { role: UserRole })?.role
  if (!session || !allowedRoles.includes(userRole)) {
    redirect('/student/login')
  }
  return session
}

export function getRoleFromSession(session: { user?: unknown }) {
  return (session?.user as unknown as { role: UserRole })?.role
}

export function getIdFromSession(session: { user?: unknown }) {
  return (session?.user as unknown as { id: string })?.id
}
