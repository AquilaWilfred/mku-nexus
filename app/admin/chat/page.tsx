import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/shared/Sidebar'
import ChatBot from '@/components/shared/ChatBot'
import { UserRole } from '@/types'

export default async function AdminChat() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/admin/login')
  const role = (session.user as unknown as { role: UserRole }).role
  if (role !== 'admin') redirect(`/${role}/dashboard`)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9ff' }}>
      <Sidebar role="admin" userName={session.user.name || ''} userEmail={session.user.email || ''} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 h-full flex flex-col">
          <div className="mb-6">
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#2e7d32' }}>
              🤖 NEXUS AI — Admin Mode
            </h1>
            <p className="text-gray-500 mt-1">Full system access — ask anything about users, events, appeals, and analytics</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { icon: '📊', tip: 'Ask "Give me a system overview" for stats' },
              { icon: '♿', tip: 'Ask "Summarize pending appeals"' },
              { icon: '🏛️', tip: 'Ask about building accessibility' },
              { icon: '🧠', tip: 'Ask about the current AI training data' },
            ].map(t => (
              <div key={t.tip} className="nexus-card p-4" style={{ borderTop: '3px solid #2e7d32' }}>
                <div className="text-2xl mb-2">{t.icon}</div>
                <p className="text-xs text-gray-600 leading-relaxed">{t.tip}</p>
              </div>
            ))}
          </div>
          <div className="flex-1" style={{ minHeight: '500px' }}>
            <ChatBot userRole="admin" userName={session.user.name || 'Admin'} floating={false} />
          </div>
        </div>
      </main>
    </div>
  )
}
