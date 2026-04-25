import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { chatWithNexusAI, getChatHistory } from '@/lib/ai'
import { UserRole } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const userId = (session.user as unknown as { id: string }).id
    const role = (session.user as unknown as { role: UserRole }).role

    // Get recent chat history for context
    const history = await getChatHistory(userId, 20)
    const messages = history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const response = await chatWithNexusAI(userId, role, messages, message)

    return NextResponse.json({ message: response, success: true })
  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as unknown as { id: string }).id
    const history = await getChatHistory(userId, 50)

    return NextResponse.json({ data: history, success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
