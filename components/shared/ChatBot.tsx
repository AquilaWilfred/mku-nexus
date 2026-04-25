'use client'
import React, { useState, useEffect, useRef } from 'react'
import { UserRole } from '@/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatBotProps {
  userRole: UserRole
  userName: string
  floating?: boolean
}


// ============================================================
// Markdown renderer — converts AI response formatting to HTML
// Handles: **bold**, *italic*, `code`, numbered lists, bullets
// ============================================================
function renderMarkdown(text: string): React.ReactNode[] {
  let cleanText = text
  let sources: string[] = []

  // Extract RAG sources from hidden tag
  const sourceMatch = cleanText.match(/<!-- \[SOURCES:(.*?)\] -->/)
  if (sourceMatch) {
    try {
      sources = JSON.parse(sourceMatch[1])
      cleanText = cleanText.replace(sourceMatch[0], '')
    } catch (e) {}
  }

  // Clean out any refresh tags so they don't render as empty spaces
  cleanText = cleanText.replace(/<!-- \[SUMMIT_REFRESH_DATA\] -->/g, '')

  const lines = cleanText.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Empty line → spacer
    if (line.trim() === '') {
      elements.push(<div key={key++} className="h-2" />)
      continue
    }

    // Numbered list: "1. text" or "1) text"
    const numMatch = line.match(/^(\d+)[.)\s]\s*(.+)/)
    if (numMatch) {
      elements.push(
        <div key={key++} className="flex gap-2 mb-1">
          <span className="font-bold text-xs mt-0.5 flex-shrink-0 w-4 text-right" style={{ color: '#1a237e' }}>
            {numMatch[1]}.
          </span>
          <span className="text-sm leading-relaxed">{inlineFormat(numMatch[2])}</span>
        </div>
      )
      continue
    }

    // Bullet list: "- text" or "• text" or "* text" (only if NOT **bold**)
    const bulletMatch = line.match(/^[-•*]\s+(.+)/) 
    if (bulletMatch && !line.startsWith('**')) {
      elements.push(
        <div key={key++} className="flex gap-2 mb-1">
          <span className="text-xs mt-1 flex-shrink-0" style={{ color: '#6a1b9a' }}>▪</span>
          <span className="text-sm leading-relaxed">{inlineFormat(bulletMatch[1])}</span>
        </div>
      )
      continue
    }

    // Heading: line ending with ":" that is short and bold-like
    if (line.match(/^[A-Z][^.!?\n]{2,40}:$/) && !line.includes(' - ')) {
      elements.push(
        <p key={key++} className="font-bold text-sm mt-2 mb-1" style={{ color: '#1a237e' }}>
          {line}
        </p>
      )
      continue
    }

    // Regular paragraph with inline formatting
    elements.push(
      <p key={key++} className="text-sm leading-relaxed mb-1">
        {inlineFormat(line)}
      </p>
    )
  }

  // Render sources at the bottom of the message
  if (sources.length > 0) {
    elements.push(
      <div key={key++} className="mt-3 pt-2 border-t border-gray-200/60 flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Sources:</span>
        {sources.map((sourceTitle, idx) => (
          <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: '#e8eaf6', color: '#1a237e', border: '1px solid #c5cae9' }}>
            📄 {sourceTitle}
          </span>
        ))}
      </div>
    )
  }

  return elements
}

function inlineFormat(text: string): React.ReactNode {
  // Split on **bold**, *italic*, `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold" style={{ color: '#1a237e' }}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return <em key={i} className="italic">{part.slice(1, -1)}</em>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="px-1.5 py-0.5 rounded text-xs font-mono"
              style={{ background: '#e8eaf6', color: '#1a237e' }}>
              {part.slice(1, -1)}
            </code>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

export default function ChatBot({ userRole, userName, floating = false }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(!floating)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const roleGreetings: Record<string, string> = {
    student: `Hi ${userName}! 👋 I'm your Summit AI Assistant. I can help you with your class schedule, check if you have classes today, quiz you on your subjects, or answer questions about campus events and venues. What would you like to know?`,
    lecturer: `Hello ${userName}! 👋 I'm the Summit AI. I can help you with your teaching schedule, answer questions about campus events, or assist with any academic queries. How can I help you today?`,
    admin: `Welcome ${userName}! 🔐 I'm the Summit AI with full system access. I can provide insights on student data, system status, events, or any campus information. What do you need?`,
    schedule_manager: `Hello ${userName}! 📋 I'm the Summit AI. I can help you review timetable appeals, check schedules, and understand venue accessibility. What do you need?`,
  }

  useEffect(() => {
    loadChatHistory()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function loadChatHistory() {
    try {
      const res = await fetch('/api/chat')
      const data = await res.json()
      if (data.success && data.data?.length > 0) {
        const history = data.data.slice(-30).map((m: { id: string; role: 'user' | 'assistant'; content: string; created_at: string }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at),
        }))
        setMessages(history)
      } else {
        // Show greeting
        setMessages([{
          id: 'greeting',
          role: 'assistant',
          content: roleGreetings[userRole],
          timestamp: new Date(),
        }])
      }
      setHistoryLoaded(true)
    } catch {
      setMessages([{
        id: 'greeting',
        role: 'assistant',
        content: roleGreetings[userRole],
        timestamp: new Date(),
      }])
      setHistoryLoaded(true)
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function sendMessage() {
    if (!input.trim() || isLoading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      })
      const data = await res.json()

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'Sorry, I encountered an issue. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I\'m having connectivity issues. Please try again. 🔄',
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const quickPrompts: Record<string, string[]> = {
    student: ['Do I have class today?', 'What\'s my timetable?', 'Quiz me on my units', 'Any events today?'],
    lecturer: ['My teaching schedule', 'Any pending appeals?', 'Campus events today', 'Help me with course info'],
    admin: ['System overview', 'Pending appeals summary', 'Today\'s events', 'User statistics'],
    schedule_manager: ['Pending appeals', 'Timetable overview', 'Accessibility venues', 'Today schedule'],
  }

  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#e0e0ef' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #1a237e, #6a1b9a)' }}>
            AI
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ color: '#1a237e' }}>Summit AI Assistant</div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
              Online · Real-time data
            </div>
          </div>
        </div>
        {floating && (
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" style={{ background: '#fafbff' }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs mr-2 mt-1 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #1a237e, #6a1b9a)' }}>
                AI
              </div>
            )}
            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
              <div className="text-sm leading-relaxed">
                {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
              </div>
              <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                {msg.timestamp.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs mr-2 mt-1"
              style={{ background: 'linear-gradient(135deg, #1a237e, #6a1b9a)' }}>
              AI
            </div>
            <div className="chat-bubble-ai flex items-center gap-1.5 py-3">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {quickPrompts[userRole].map((p) => (
            <button
              key={p}
              onClick={() => { setInput(p); }}
              className="text-xs px-3 py-1.5 rounded-full border transition-colors"
              style={{ borderColor: '#c5cae9', color: '#1a237e', background: '#f0f2ff' }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t" style={{ borderColor: '#e0e0ef', background: 'white' }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask anything about your schedule, events, campus..."
            className="nexus-input text-sm py-2.5"
            style={{ fontSize: '0.85rem' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="btn-primary px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderRadius: '10px', minWidth: '48px' }}
          >
            ↗
          </button>
        </div>
      </div>
    </div>
  )

  if (floating) {
    return (
      <>
        {/* Floating button */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-white shadow-lg z-50 flex items-center justify-center text-xl transition-transform hover:scale-110"
            style={{ background: 'linear-gradient(135deg, #1a237e, #6a1b9a)', boxShadow: '0 4px 24px rgba(26,35,126,0.4)' }}
          >
            🤖
          </button>
        )}

        {isOpen && (
          <div className="fixed bottom-6 right-6 z-50 nexus-card"
            style={{ width: '380px', height: '520px', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 48px rgba(26,35,126,0.2)' }}>
            {chatContent}
          </div>
        )}
      </>
    )
  }

  return (
    <div className="nexus-card flex flex-col" style={{ height: '100%', minHeight: '500px' }}>
      {chatContent}
    </div>
  )
}
