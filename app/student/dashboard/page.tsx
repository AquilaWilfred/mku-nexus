import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import Sidebar from '@/components/shared/Sidebar'
import DeactivatedBanner from '@/components/shared/DeactivatedBanner'
import ChatBot from '@/components/shared/ChatBot'
import { UserRole } from '@/types'

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/student/login')
  const role = (session.user as unknown as { role: UserRole }).role
  if (role !== 'student') redirect(`/${role}/dashboard`)

  const userId = (session.user as unknown as { id: string }).id

  // Fetch enrolled units with timetable
  const { data: enrollments } = await supabaseAdmin
    .from('enrollments')
    .select('*, unit:units(*, lecturer:users!units_lecturer_id_fkey(full_name), timetable(*, venue:venues(*, building:buildings(*))))')
    .eq('student_id', userId)
    .eq('status', 'active')

  // Fetch recent events
  const { data: events } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch notifications
  const { data: notifications } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(5)

  // Today's classes
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todayClasses = enrollments?.flatMap(e => {
    const unit = e.unit as unknown as { code: string; name: string; timetable: { day_of_week: string; start_time: string; end_time: string; session_type: string; venue: { room_number: string; name: string; floor_number: number; building: { name: string; has_lift: boolean } } }[]; lecturer: { full_name: string } }
    return (unit?.timetable || [])
      .filter(t => t.day_of_week === today)
      .map(t => ({ ...t, unit }))
  }) || []

  todayClasses.sort((a, b) => a.start_time.localeCompare(b.start_time))

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role="student" userName={session.user.name || ''} userEmail={session.user.email || ''} />

      <main className="flex-1 overflow-y-auto">
        <DeactivatedBanner />
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
                  Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {session.user.name?.split(' ')[0]}! 👋
                </h1>
                <p className="text-gray-500 mt-1">
                  {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              {notifications && notifications.length > 0 && (
                <div className="relative">
                  <div className="badge badge-orange text-sm px-4 py-2">
                    🔔 {notifications.length} new notification{notifications.length > 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Today's Classes */}
              <div className="nexus-card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
                    📅 Today's Classes — {today}
                  </h2>
                  <span className="badge badge-navy">{todayClasses.length} class{todayClasses.length !== 1 ? 'es' : ''}</span>
                </div>

                {todayClasses.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-3">🌟</div>
                    <p className="font-medium">No classes today!</p>
                    <p className="text-sm mt-1">Enjoy your free day or use it to study</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayClasses.map((cls, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 rounded-12 border transition-colors hover:bg-gray-50"
                        style={{ borderColor: '#e0e0ef', borderRadius: '12px' }}>
                        <div className="text-center min-w-16">
                          <div className="text-sm font-bold" style={{ color: '#1a237e' }}>
                            {cls.start_time?.slice(0, 5)}
                          </div>
                          <div className="text-xs text-gray-400">{cls.end_time?.slice(0, 5)}</div>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{cls.unit?.code} — {cls.unit?.name}</div>
                          <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-3">
                            <span>👩‍🏫 {cls.unit?.lecturer?.full_name}</span>
                            <span>📍 {cls.venue?.name || cls.venue?.room_number}, {cls.venue?.building?.name}</span>
                            <span className={`accessible-badge ${cls.venue?.building?.has_lift ? 'accessible-yes' : 'accessible-no'}`}>
                              {cls.venue?.building?.has_lift ? '♿ Lift ✓' : '♿ No Lift'}
                            </span>
                          </div>
                        </div>
                        <div className="badge badge-navy text-xs capitalize">{cls.session_type}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Enrolled Units */}
              <div className="nexus-card p-6">
                <h2 className="text-lg font-bold mb-5" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
                  📚 My Units ({enrollments?.length || 0})
                </h2>
                {!enrollments?.length ? (
                  <div className="text-center py-6 text-gray-400">
                    <p>No units enrolled yet. Contact admin to register.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {enrollments?.map(e => {
                      const unit = e.unit as unknown as { id: string; code: string; name: string; credits: number; lecturer: { full_name: string }; timetable: unknown[] }
                      return (
                        <div key={e.id} className="p-4 rounded-xl border" style={{ borderColor: '#e0e0ef' }}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold text-sm" style={{ color: '#1a237e' }}>{unit?.code}</div>
                              <div className="text-xs text-gray-600 mt-0.5">{unit?.name}</div>
                              <div className="text-xs text-gray-400 mt-1">👩‍🏫 {unit?.lecturer?.full_name}</div>
                            </div>
                            <span className="badge badge-purple text-xs">{unit?.credits} cr</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Recent Events */}
              <div className="nexus-card p-6">
                <h2 className="text-lg font-bold mb-5" style={{ fontFamily: 'Playfair Display, serif', color: '#1a237e' }}>
                  📢 Recent Announcements
                </h2>
                {!events?.length ? (
                  <p className="text-gray-400 text-sm">No announcements yet</p>
                ) : (
                  <div className="space-y-3">
                    {events?.map(ev => (
                      <div key={ev.id}
                        className={`p-4 rounded-xl border-l-4 bg-gray-50 event-${ev.event_type}`}
                        style={{ borderRadius: '12px' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-sm flex items-center gap-2">
                              {ev.is_urgent && <span className="text-red-500">🚨</span>}
                              {ev.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{ev.description}</div>
                          </div>
                          <span className="badge badge-gray text-xs capitalize flex-shrink-0">{ev.event_type.replace('_', ' ')}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          {new Date(ev.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Column */}
            <div className="lg:col-span-1">
              <div style={{ height: '600px' }}>
                <ChatBot userRole="student" userName={session.user.name || 'Student'} floating={false} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
