import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as unknown as { role: string }).role
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const [
      { count: totalStudents },
      { count: totalLecturers },
      { count: totalUnits },
      { count: totalEvents },
      { count: pendingAppeals },
      { count: pendingTimetableAppeals },
      { count: pendingActivations },
      { count: deactivatedUsers },
      { data: recentEvents },
      { data: recentAppeals },
      { data: enrollmentData },
      { data: recentLogins },
      { data: recentUsers },
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'lecturer'),
      supabaseAdmin.from('units').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('events').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('disability_appeals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('timetable_appeals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('activation_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_active', false),
      supabaseAdmin.from('events').select('*, creator:users!events_created_by_fkey(full_name)').order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('disability_appeals').select('*, student:users!disability_appeals_student_id_fkey(full_name, student_id)').eq('status', 'pending').limit(5),
      supabaseAdmin.from('enrollments').select('enrolled_at').order('enrolled_at', { ascending: true }),
      supabaseAdmin.from('login_sessions').select('*, user:users!login_sessions_user_id_fkey(full_name, role)').order('logged_in_at', { ascending: false }).limit(10),
      supabaseAdmin.from('users').select('id, full_name, email, role, created_at, is_active').order('created_at', { ascending: false }).limit(5),
    ])

    const monthlyEnrollments: Record<string, number> = {}
    enrollmentData?.forEach(e => {
      const month = new Date(e.enrolled_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      monthlyEnrollments[month] = (monthlyEnrollments[month] || 0) + 1
    })
    const enrollmentTrends = Object.entries(monthlyEnrollments).slice(-6).map(([month, count]) => ({ month, count }))

    return NextResponse.json({
      data: {
        total_students: totalStudents || 0,
        total_lecturers: totalLecturers || 0,
        total_units: totalUnits || 0,
        total_events: totalEvents || 0,
        pending_appeals: pendingAppeals || 0,
        pending_timetable_appeals: pendingTimetableAppeals || 0,
        pending_activations: pendingActivations || 0,
        deactivated_users: deactivatedUsers || 0,
        recent_events: recentEvents || [],
        recent_appeals: recentAppeals || [],
        enrollment_trends: enrollmentTrends,
        recent_logins: recentLogins || [],
        recent_users: recentUsers || [],
      },
      success: true,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
