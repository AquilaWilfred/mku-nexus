import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import Sidebar from '@/components/shared/Sidebar'
import ChatBot from '@/components/shared/ChatBot'
import { UserRole } from '@/types'

export default async function LecturerDashboard() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/lecturer/login')
  const role = (session.user as unknown as { role: UserRole }).role
  if (role !== 'lecturer') redirect(`/${role}/dashboard`)

  const userId = (session.user as unknown as { id: string }).id
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  const [
    { data: myUnits },
    { data: myEvents },
    { data: appeals },
    { data: materials },
    { data: notifications },
  ] = await Promise.all([
    supabaseAdmin.from('units').select('*, timetable(*, venue:venues(*, building:buildings(*)))').eq('lecturer_id', userId).eq('is_active', true),
    supabaseAdmin.from('events').select('*').eq('created_by', userId).order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('disability_appeals').select('*, student:users!disability_appeals_student_id_fkey(full_name, student_id), unit:units(code, name)').eq('status', 'pending').limit(5),
    supabaseAdmin.from('materials').select('*').eq('lecturer_id', userId).order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('notifications').select('*').eq('user_id', userId).eq('is_read', false).limit(5),
  ])

  // Today's classes
  const todayClasses = (myUnits || []).flatMap(unit => 
    ((unit as unknown as { timetable: { day_of_week: string; start_time: string; end_time: string; session_type: string; venue: { room_number: string; name: string; building: { name: string } } }[] }).timetable || [])
      .filter(t => t.day_of_week === today)
      .map(t => ({ ...t, unit }))
  ).sort((a, b) => a.start_time.localeCompare(b.start_time))

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role="lecturer" userName={session.user.name || ''} userEmail={session.user.email || ''} />

      <main className="flex-1 overflow-y-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
            Welcome, {session.user.name?.split(' ')[0]}! 👨‍🏫
          </h1>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'My Units', value: myUnits?.length || 0, icon: '📚', color: '#6a1b9a' },
            { label: "Today's Classes", value: todayClasses.length, icon: '📅', color: '#1a237e' },
            { label: 'Materials Uploaded', value: materials?.length || 0, icon: '📁', color: '#2e7d32' },
            { label: 'Pending Appeals', value: appeals?.length || 0, icon: '♿', color: '#e65100' },
          ].map(s => (
            <div key={s.label} className="nexus-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">{s.label}</p>
                  <p className="text-2xl font-bold mt-1" style={{ fontFamily: 'Playfair Display, serif', color: s.color }}>{s.value}</p>
                </div>
                <span className="text-2xl">{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Teaching */}
            <div className="nexus-card p-6">
              <h2 className="text-lg font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
                📅 Teaching Today — {today}
              </h2>
              {todayClasses.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <p>No classes scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayClasses.map((cls, i) => {
                    const c = cls as unknown as { start_time: string; end_time: string; session_type: string; venue: { room_number: string; name: string; building: { name: string } }; unit: { code: string; name: string } }
                    return (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-xl border" style={{ borderColor: '#e0e0ef' }}>
                        <div className="text-center min-w-16">
                          <div className="font-bold text-sm" style={{ color: '#6a1b9a' }}>{c.start_time?.slice(0,5)}</div>
                          <div className="text-xs text-gray-400">{c.end_time?.slice(0,5)}</div>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{c.unit?.code} — {c.unit?.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">📍 {c.venue?.name || c.venue?.room_number}, {c.venue?.building?.name}</div>
                        </div>
                        <span className="badge badge-purple text-xs capitalize">{c.session_type}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* My Units */}
            <div className="nexus-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
                  📚 My Units
                </h2>
                <a href="/lecturer/materials" className="btn-primary text-sm py-2">+ Upload Material</a>
              </div>
              {!myUnits?.length ? (
                <p className="text-gray-400 text-sm">No units assigned yet. Contact admin.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myUnits?.map(unit => {
                    const u = unit as unknown as { id: string; code: string; name: string; credits: number; timetable: unknown[] }
                    return (
                      <div key={u.id} className="p-4 rounded-xl border" style={{ borderColor: '#e0e0ef' }}>
                        <div className="font-semibold text-sm" style={{ color: '#6a1b9a' }}>{u.code}</div>
                        <div className="text-sm text-gray-700 mt-0.5">{u.name}</div>
                        <div className="flex gap-2 mt-2">
                          <span className="badge badge-purple text-xs">{u.credits} credits</span>
                          <span className="badge badge-gray text-xs">{u.timetable?.length || 0} sessions/week</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Pending Appeals */}
            {appeals && appeals.length > 0 && (
              <div className="nexus-card p-6" style={{ borderLeft: '4px solid #e65100' }}>
                <h2 className="text-lg font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#e65100' }}>
                  ♿ Pending Accessibility Appeals
                </h2>
                <div className="space-y-3">
                  {appeals.map(appeal => {
                    const a = appeal as unknown as { id: string; disability_type: string; description: string; student: { full_name: string; student_id: string }; unit: { code: string; name: string } }
                    return (
                      <div key={a.id} className="p-4 rounded-xl" style={{ background: '#fff8f0', border: '1px solid #ffe0b2' }}>
                        <div className="font-medium text-sm">{a.student?.full_name} ({a.student?.student_id})</div>
                        <div className="text-xs text-gray-600 mt-1">{a.disability_type}</div>
                        {a.unit && <div className="text-xs text-gray-400 mt-0.5">Unit: {a.unit.code} - {a.unit.name}</div>}
                        <a href="/lecturer/appeals" className="text-xs mt-2 inline-block" style={{ color: '#e65100' }}>Review →</a>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Chat + Quick Post */}
          <div className="space-y-4">
            <div className="nexus-card p-4">
              <h3 className="font-semibold text-sm mb-3" style={{ color: '#6a1b9a' }}>Quick Announcement</h3>
              <a href="/lecturer/events" className="btn-primary w-full text-center py-2.5 block text-sm">
                📢 Post New Event/Notice
              </a>
              <a href="/lecturer/materials" className="btn-secondary w-full text-center py-2.5 block text-sm mt-2">
                📤 Upload Learning Material
              </a>
            </div>
            <div style={{ height: '480px' }}>
              <ChatBot userRole="lecturer" userName={session.user.name || 'Lecturer'} floating={false} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
