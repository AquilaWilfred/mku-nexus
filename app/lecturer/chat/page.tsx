import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/shared/Sidebar'
import ChatBot from '@/components/shared/ChatBot'
import { UserRole } from '@/types'

export default async function LecturerChat() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/lecturer/login')
  const role = (session.user as unknown as { role: UserRole }).role
  if (role !== 'lecturer') redirect(`/${role}/dashboard`)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role="lecturer" userName={session.user.name || ''} userEmail={session.user.email || ''} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 h-full flex flex-col">
          <div className="mb-6">
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#6a1b9a' }}>
              🤖 NEXUS AI Assistant
            </h1>
            <p className="text-gray-500 mt-1">Your intelligent teaching assistant with real-time campus data</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { icon: '📅', tip: 'Ask "What do I teach today?" for your schedule' },
              { icon: '♿', tip: 'Ask about accessibility of specific venues' },
              { icon: '📢', tip: 'Ask "Any events today?" for campus updates' },
              { icon: '📊', tip: 'Ask about your units and enrolled students' },
            ].map(t => (
              <div key={t.tip} className="nexus-card p-4">
                <div className="text-2xl mb-2">{t.icon}</div>
                <p className="text-xs text-gray-600 leading-relaxed">{t.tip}</p>
              </div>
            ))}
          </div>
          <div className="flex-1" style={{ minHeight: '500px' }}>
            <ChatBot userRole="lecturer" userName={session.user.name || 'Lecturer'} floating={false} />
          </div>
        </div>
      </main>
    </div>
  )
}
