import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import Sidebar from '@/components/shared/Sidebar'
import { UserRole } from '@/types'
import AdminHelpClient from '@/components/admin/AdminHelpClient'

export default async function AdminHelpPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/admin/login')
  const role = (session.user as any).role as UserRole
  if (role !== 'admin') redirect(`/${role}/dashboard`)

  const { data: requests } = await supabaseAdmin
    .from('help_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role="admin" userName={session.user.name || ''} userEmail={session.user.email || ''} />
      <AdminHelpClient requests={requests || []} />
    </div>
  )
}
