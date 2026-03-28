import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import Sidebar from '@/components/shared/Sidebar'
import AdminDashboardClient from '@/components/admin/AdminDashboardClient'
import { UserRole } from '@/types'

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/admin/login')
  const role = (session.user as unknown as { role: UserRole }).role
  if (role !== 'admin') redirect(`/${role}/dashboard`)

  // Fetch all stats
  const [
    { count: totalStudents },
    { count: totalLecturers },
    { count: totalUnits },
    { count: totalEvents },
    { count: pendingAppeals },
    { data: recentEvents },
    { data: recentAppeals },
    { data: enrollmentData },
    { data: recentUsers },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'lecturer'),
    supabaseAdmin.from('units').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('events').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('disability_appeals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('events').select('*, creator:users!events_created_by_fkey(full_name)').order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('disability_appeals').select('*, student:users!disability_appeals_student_id_fkey(full_name, student_id)').eq('status', 'pending').limit(5),
    supabaseAdmin.from('enrollments').select('enrolled_at').order('enrolled_at', { ascending: true }),
    supabaseAdmin.from('users').select('id, full_name, email, role, created_at').order('created_at', { ascending: false }).limit(5),
  ])

  // Build monthly enrollment trends
  const monthlyData: Record<string, number> = {}
  enrollmentData?.forEach((e: { enrolled_at: string }) => {
    const month = new Date(e.enrolled_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    monthlyData[month] = (monthlyData[month] || 0) + 1
  })
  const enrollmentTrends = Object.entries(monthlyData).slice(-6).map(([month, count]) => ({ month, count }))

  const stats = {
    total_students: totalStudents || 0,
    total_lecturers: totalLecturers || 0,
    total_units: totalUnits || 0,
    total_events: totalEvents || 0,
    pending_appeals: pendingAppeals || 0,
    recent_events: recentEvents || [],
    recent_appeals: recentAppeals || [],
    enrollment_trends: enrollmentTrends,
    recent_users: recentUsers || [],
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role="admin" userName={session.user.name || ''} userEmail={session.user.email || ''} />
      <AdminDashboardClient
        stats={stats}
        userName={session.user.name || 'Admin'}
      />
    </div>
  )
}
