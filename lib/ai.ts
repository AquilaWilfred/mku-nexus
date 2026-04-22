import { supabaseAdmin } from './supabase'
import { UserRole } from '@/types'

type AIMessage = { role: 'user' | 'assistant'; content: string }

async function callGroq(systemPrompt: string, messages: AIMessage[], newMessage: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('No Groq API key')
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-18).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: newMessage },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })
    if (!res.ok) { const body = await res.text().catch(() => ''); throw new Error(`Groq error: ${res.status} | ${body.slice(0,300)}`) }
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  } finally { clearTimeout(timeout) }
}

async function callGemini(systemPrompt: string, messages: AIMessage[], newMessage: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('No Gemini API key')
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  const allMessages = [
    ...messages.slice(-18).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: newMessage }] },
  ]
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents: allMessages, generationConfig: { maxOutputTokens: 1024, temperature: 0.7 } }),
  })
  if (!res.ok) { const body = await res.text().catch(() => ''); throw new Error(`Gemini error: ${res.status} | ${body.slice(0,300)}`) }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function callOllama(systemPrompt: string, messages: AIMessage[], newMessage: string): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  const model = process.env.OLLAMA_MODEL || 'llama3'
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, stream: false, messages: [{ role: 'system', content: systemPrompt }, ...messages.slice(-18).map(m => ({ role: m.role, content: m.content })), { role: 'user', content: newMessage }] }),
  })
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data = await res.json()
  return data.message?.content || ''
}

async function callAnthropic(systemPrompt: string, messages: AIMessage[], newMessage: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('No Anthropic API key')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [...messages.slice(-18).map(m => ({ role: m.role, content: m.content })), { role: 'user', content: newMessage }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`)
  const data = await res.json()
  const block = data.content?.[0]
  return block?.type === 'text' ? block.text : ''
}

async function callAI(systemPrompt: string, messages: AIMessage[], newMessage: string): Promise<string> {
  const preferred = process.env.AI_PROVIDER?.toLowerCase()
  const providers: { name: string; fn: () => Promise<string> }[] = []
  if (preferred === 'anthropic') {
    providers.push({ name: 'Anthropic', fn: () => callAnthropic(systemPrompt, messages, newMessage) })
  } else if (preferred === 'gemini') {
    providers.push({ name: 'Gemini', fn: () => callGemini(systemPrompt, messages, newMessage) })
    if (process.env.GROQ_API_KEY) providers.push({ name: 'Groq', fn: () => callGroq(systemPrompt, messages, newMessage) })
  } else if (preferred === 'ollama') {
    providers.push({ name: 'Ollama', fn: () => callOllama(systemPrompt, messages, newMessage) })
    if (process.env.GROQ_API_KEY) providers.push({ name: 'Groq', fn: () => callGroq(systemPrompt, messages, newMessage) })
  } else {
    if (process.env.GROQ_API_KEY) providers.push({ name: 'Groq', fn: () => callGroq(systemPrompt, messages, newMessage) })
    if (process.env.GEMINI_API_KEY) providers.push({ name: 'Gemini', fn: () => callGemini(systemPrompt, messages, newMessage) })
    if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL) providers.push({ name: 'Ollama', fn: () => callOllama(systemPrompt, messages, newMessage) })
    if (process.env.ANTHROPIC_API_KEY) providers.push({ name: 'Anthropic', fn: () => callAnthropic(systemPrompt, messages, newMessage) })
  }
  if (providers.length === 0) {
    return `⚠️ No AI provider configured. Add one of: GROQ_API_KEY, GEMINI_API_KEY, OLLAMA_BASE_URL, or ANTHROPIC_API_KEY to your .env.local`
  }
  for (const provider of providers) {
    try {
      const result = await provider.fn()
      if (result?.trim()) return result
    } catch (err) {
      console.warn(`[NexusAI] ${provider.name} failed, trying next...`, err instanceof Error ? err.message : err)
    }
  }
  return "I'm having trouble connecting right now. Please check your API keys and try again. 🔄"
}

// ============================================
// Build fully context-aware system prompt
// Includes: timetable overrides, polls, venue changes, events, enrollments
// ============================================
async function buildSystemPrompt(userId: string, role: UserRole): Promise<string> {
  const today = new Date()
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = today.toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const { data: training } = await supabaseAdmin
    .from('ai_training_sessions').select('*').eq('is_active', true)
    .order('created_at', { ascending: false }).limit(1).single()

  // Fetch all published events (last 14 days + future)
  const { data: events } = await supabaseAdmin
    .from('events')
    .select('*, venue:venues(name, room_number, building:buildings(name))')
    .eq('is_published', true)
    .gte('start_datetime', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
    .order('start_datetime', { ascending: true })
    .limit(30)

  // Fetch active timetable overrides (venue changes, cancellations)
  const { data: activeOverrides } = await supabaseAdmin
    .from('timetable_overrides')
    .select(`*, 
      timetable:timetable(unit_id, unit:units(code, name)),
      new_venue:venues!timetable_overrides_new_venue_id_fkey(room_number, name, building:buildings(name))
    `)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch active polls
  const { data: activePolls } = await supabaseAdmin
    .from('polls')
    .select(`*, unit:units(code, name), options:poll_options(id, option_text, votes_count)`)
    .eq('is_active', true)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(10)

  let userContext = ''

  if (role === 'student') {
    const { data: student } = await supabaseAdmin.from('users').select('*, course:courses(name, code)').eq('id', userId).single()
    const { data: enrollments } = await supabaseAdmin
      .from('enrollments')
      .select(`*, unit:units(*, lecturer:users!units_lecturer_id_fkey(full_name, email), timetable(*, venue:venues(room_number, name, floor_number, is_accessible, building:buildings(name, code, has_lift, accessibility_notes))))`)
      .eq('student_id', userId)
      .eq('status', 'active')

    // Get overrides specifically for this student's enrolled units
    const enrolledUnitIds = (enrollments || []).map((e: any) => e.unit_id)
    const { data: myOverrides } = enrolledUnitIds.length > 0 ? await supabaseAdmin
      .from('timetable_overrides')
      .select(`*, timetable:timetable(unit_id, day_of_week, start_time, end_time, unit:units(code, name)), new_venue:venues!timetable_overrides_new_venue_id_fkey(room_number, name, floor_number, building:buildings(name))`)
      .in('timetable.unit_id', enrolledUnitIds)
      .order('created_at', { ascending: false })
      .limit(20) : { data: [] }

    const overrideContext = (myOverrides || []).length > 0
      ? `\nYOUR VENUE CHANGES & CANCELLATIONS:\n${(myOverrides || []).map((o: any) => {
          const unit = o.timetable?.unit
          if (o.is_cancelled) return `❌ CANCELLED: ${unit?.code} on ${o.override_date || 'TBA'} — ${o.reason}`
          if (o.override_type === 'temporary') return `⚡ TEMP MOVE: ${unit?.code} on ${o.override_date} → New venue: ${o.new_venue?.name || o.new_venue?.room_number || 'TBA'} (${o.new_venue?.building?.name || ''}). Reason: ${o.reason}`
          if (o.override_type === 'permanent') return `🔄 PERMANENT CHANGE: ${unit?.code} now permanently at ${o.new_venue?.name || o.new_venue?.room_number || 'TBA'}. Reason: ${o.reason}`
          return ''
        }).filter(Boolean).join('\n')}`
      : ''

    // Student-specific polls
    const { data: myPolls } = enrolledUnitIds.length > 0 ? await supabaseAdmin
      .from('polls')
      .select(`*, unit:units(code, name), options:poll_options(id, option_text, votes_count)`)
      .in('unit_id', enrolledUnitIds)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString()) : { data: [] }

    const pollContext = (myPolls || []).length > 0
      ? `\nACTIVE POLLS FOR YOUR UNITS:\n${(myPolls || []).map((p: any) =>
          `📊 [${p.unit?.code}] "${p.question}" — expires ${new Date(p.expires_at).toLocaleDateString('en-KE')} | Options: ${(p.options || []).map((o: any) => o.option_text).join(', ')}`
        ).join('\n')}`
      : ''

    // Recent notifications for the student
    const { data: myNotifications } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    const notificationContext = (myNotifications || []).length > 0
      ? `\nRECENT NOTIFICATIONS:\n${(myNotifications || []).map((n: any) =>
          `🔔 ${n.title}: ${n.message} (${new Date(n.created_at).toLocaleDateString('en-KE')})`
        ).join('\n')}`
      : ''

    userContext = `STUDENT: ${student?.full_name} (ID: ${student?.student_id})
Course: ${(student as any)?.course?.name || 'Not set'} | Disability: ${student?.is_disabled ? student?.disability_type : 'None'}
ENROLLED UNITS (${enrollments?.length || 0}):
${(enrollments || []).map((e: any) => {
  const u = e.unit
  return `📚 ${u?.code} - ${u?.name} | Lecturer: ${u?.lecturer?.full_name || 'TBA'}
   Schedule: ${(u?.timetable || []).map((t: any) => `${t.day_of_week} ${t.start_time?.slice(0,5)}-${t.end_time?.slice(0,5)} @ ${t.venue?.name||t.venue?.room_number}, ${t.venue?.building?.name}`).join(' | ')}`
}).join('\n')}
${overrideContext}
${pollContext}
${notificationContext}

PRIVACY: You must NEVER reveal other students' personal information, grades, schedules, or details. Only answer about this student's own data.`

  } else if (role === 'lecturer') {
    const { data: lecturer } = await supabaseAdmin.from('users').select('*').eq('id', userId).single()
    const { data: myUnits } = await supabaseAdmin
      .from('units')
      .select('*, timetable(*, venue:venues(*, building:buildings(*)))')
      .eq('lecturer_id', userId).eq('is_active', true)

    const unitIds = (myUnits || []).map((u: any) => u.id)
    const { data: myOverrides } = unitIds.length > 0 ? await supabaseAdmin
      .from('timetable_overrides')
      .select(`*, timetable:timetable(unit_id, unit:units(code, name)), new_venue:venues!timetable_overrides_new_venue_id_fkey(room_number, name, building:buildings(name))`)
      .in('timetable.unit_id', unitIds)
      .order('created_at', { ascending: false }).limit(10) : { data: [] }

    const { data: myPolls } = unitIds.length > 0 ? await supabaseAdmin
      .from('polls')
      .select(`*, unit:units(code, name), options:poll_options(id, option_text, votes_count)`)
      .in('unit_id', unitIds)
      .order('created_at', { ascending: false }).limit(10) : { data: [] }

    // Recent notifications for the lecturer
    const { data: myNotifications } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    const notificationContext = (myNotifications || []).length > 0
      ? `\nRECENT NOTIFICATIONS:\n${(myNotifications || []).map((n: any) =>
          `🔔 ${n.title}: ${n.message} (${new Date(n.created_at).toLocaleDateString('en-KE')})`
        ).join('\n')}`
      : ''

    userContext = `LECTURER: ${lecturer?.full_name} (Staff ID: ${lecturer?.staff_id})
MY TEACHING UNITS:
${(myUnits || []).map((u: any) =>
  `📖 ${u.code} - ${u.name}\n   Schedule: ${(u.timetable || []).map((t: any) => `${t.day_of_week} ${t.start_time?.slice(0,5)}-${t.end_time?.slice(0,5)} @ ${t.venue?.name||t.venue?.room_number}`).join(' | ')}`
).join('\n')}

RECENT VENUE CHANGES I MADE:
${(myOverrides || []).map((o: any) => {
  const unit = o.timetable?.unit
  if (o.is_cancelled) return `❌ Cancelled ${unit?.code} on ${o.override_date}`
  return `${o.override_type === 'temporary' ? '⚡' : '🔄'} ${o.override_type} change for ${unit?.code}: ${o.reason}`
}).join('\n') || 'None recently'}

MY ACTIVE POLLS:
${(myPolls || []).map((p: any) => `📊 [${p.unit?.code}] "${p.question}" — ${p.options?.length || 0} options, expires ${new Date(p.expires_at).toLocaleDateString('en-KE')}`).join('\n') || 'No active polls'}
${notificationContext}`

  } else {
    // Admin gets full system overview
    const { data: pendingVenueReqs } = await supabaseAdmin.from('venue_requests').select('*, lecturer:users!venue_requests_lecturer_id_fkey(full_name), unit:units(code, name), venue:venues(room_number)').eq('status', 'pending').limit(10)
    const { data: pendingAppeals } = await supabaseAdmin.from('disability_appeals').select('*, student:users!disability_appeals_student_id_fkey(full_name), unit:units(code, name)').eq('status', 'pending').limit(10)

    // Recent notifications for the admin
    const { data: myNotifications } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    const notificationContext = (myNotifications || []).length > 0
      ? `\nRECENT NOTIFICATIONS:\n${(myNotifications || []).map((n: any) =>
          `🔔 ${n.title}: ${n.message} (${new Date(n.created_at).toLocaleDateString('en-KE')})`
        ).join('\n')}`
      : ''

    userContext = `ADMIN: Full system access
PENDING VENUE REQUESTS (${pendingVenueReqs?.length || 0}):
${(pendingVenueReqs || []).map((r: any) => `• ${r.unit?.code} — ${r.lecturer?.full_name} requesting ${r.venue?.room_number}`).join('\n') || 'None'}

PENDING DISABILITY APPEALS (${pendingAppeals?.length || 0}):
${(pendingAppeals || []).map((a: any) => `• ${a.student?.full_name} — ${a.unit?.code}: ${a.disability_type}`).join('\n') || 'None'}

SYSTEM OVERRIDES THIS WEEK:
${(activeOverrides || []).map((o: any) => {
  const unit = o.timetable?.unit
  if (o.is_cancelled) return `❌ Cancelled: ${unit?.code} on ${o.override_date} — ${o.reason}`
  return `${o.override_type === 'temporary' ? '⚡' : '🔄'} ${unit?.code}: ${o.reason} → ${o.new_venue?.name || o.new_venue?.room_number || 'TBA'}`
}).join('\n') || 'None'}
${notificationContext}`
  }

  const eventsContext = (events || []).map((e: any) =>
    `[${e.event_type?.toUpperCase()}] ${e.title} — ${e.start_datetime ? new Date(e.start_datetime).toLocaleString('en-KE') : 'No date'} ${e.is_urgent ? '🚨 URGENT' : ''} ${e.venue ? `@ ${e.venue.room_number}` : ''}`
  ).join('\n')

  const systemOverridesContext = (activeOverrides || []).length > 0
    ? `\nRECENT SYSTEM-WIDE VENUE CHANGES & CANCELLATIONS:\n${(activeOverrides || []).map((o: any) => {
        const unit = o.timetable?.unit
        if (o.is_cancelled) return `❌ ${unit?.code} CANCELLED on ${o.override_date}: ${o.reason}`
        if (o.override_type === 'temporary') return `⚡ ${unit?.code} TEMP MOVED on ${o.override_date} to ${o.new_venue?.name || o.new_venue?.room_number || 'TBA'} (${o.new_venue?.building?.name || ''}): ${o.reason}`
        if (o.override_type === 'permanent') return `🔄 ${unit?.code} PERMANENTLY moved to ${o.new_venue?.name || o.new_venue?.room_number || 'TBA'}: ${o.reason}`
        return ''
      }).filter(Boolean).join('\n')}`
    : ''

  const pollsContext = (activePolls || []).length > 0
    ? `\nACTIVE POLLS ACROSS SYSTEM:\n${(activePolls || []).map((p: any) =>
        `📊 [${p.unit?.code}] "${p.question}" expires ${new Date(p.expires_at).toLocaleDateString('en-KE')}`
      ).join('\n')}`
    : ''

  const trainingContext = training
    ? `SEMESTER KNOWLEDGE (${training.semester} ${training.year}):\n${JSON.stringify(training.training_data, null, 2)}`
    : ''

  return `You are MKU NEXUS AI — the intelligent academic assistant for Mount Kenya University (MKU).
Today: ${dateStr} (${dayName}).

${userContext}

UPCOMING & RECENT EVENTS:
${eventsContext || 'No upcoming events'}
${systemOverridesContext}
${pollsContext}

${trainingContext}

CAMPUS ACCESSIBILITY:
Buildings WITH lift: MAB (Main Academic Block), TECH (Technology Hub), LIB (Library), ADM (Administration).
Buildings WITHOUT lift: SCI (Science Complex), SPORT (Sports Complex).

INSTRUCTIONS:
- Be friendly, professional, helpful. Use emojis appropriately.
- Use appropriate verb tenses based on time: past tense for completed events, present continuous for ongoing activities, future tense for upcoming events. Make conversations feel natural and real-time.
- Proactively mention upcoming events, recent announcements, and important notifications when they are relevant to the conversation or when the user might benefit from knowing about them.
- For venue changes/cancellations: proactively mention them when the student asks about that unit.
- For polls: tell students about active polls and encourage participation.
- NEVER reveal another student's personal info, schedule, grades, or any private data.
- NEVER invent grades, exam scores, or official decisions.
- If asked about other students: politely decline and explain privacy policy.
- Help with: timetables, campus navigation, study tips, quiz prep, events, venue changes, polls.`
}

// ============================================
// Main Chat Function
// ============================================
export async function chatWithNexusAI(
  userId: string,
  role: UserRole,
  messages: AIMessage[],
  newMessage: string
): Promise<string> {
  try {
    const systemPrompt = await buildSystemPrompt(userId, role)
    await supabaseAdmin.from('chat_messages').insert({ user_id: userId, role: 'user', content: newMessage })
    const assistantMessage = await callAI(systemPrompt, messages, newMessage)
    await supabaseAdmin.from('chat_messages').insert({ user_id: userId, role: 'assistant', content: assistantMessage })
    return assistantMessage
  } catch (error) {
    console.error('AI Chat Error:', error)
    return "I'm having trouble connecting right now. Please try again in a moment. 🔄"
  }
}

export async function getChatHistory(userId: string, limit = 50) {
  const { data } = await supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit)
  return data || []
}
