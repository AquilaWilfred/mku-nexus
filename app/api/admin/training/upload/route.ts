import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'

// Extract text from CSV content
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    return headers.reduce((obj, h, i) => ({ ...obj, [h]: values[i] || '' }), {} as Record<string, string>)
  })
}

// Simple PDF text extraction (reads raw text tokens from PDF)
function extractPDFText(buffer: Buffer): string {
  const text = buffer.toString('latin1')
  const strings: string[] = []
  
  // Extract text from PDF stream objects (BT...ET blocks)
  const btRegex = /BT([\s\S]*?)ET/g
  let match
  while ((match = btRegex.exec(text)) !== null) {
    const block = match[1]
    // Extract strings from Tj, TJ, ' operators
    const strRegex = /\(((?:[^()\\]|\\[\s\S])*)\)\s*(?:Tj|')/g
    let strMatch
    while ((strMatch = strRegex.exec(block)) !== null) {
      const decoded = strMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\t/g, ' ')
        .replace(/\\\\/g, '\\')
        .replace(/\\([()\\])/g, '$1')
      if (decoded.trim()) strings.push(decoded.trim())
    }
    // TJ array format
    const tjRegex = /\[((?:[^\[\]])*)\]\s*TJ/g
    let tjMatch
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      const inner = tjMatch[1]
      const pieceRegex = /\(((?:[^()\\]|\\[\s\S])*)\)/g
      let pieceMatch
      while ((pieceMatch = pieceRegex.exec(inner)) !== null) {
        const s = pieceMatch[1].replace(/\\\\/g, '\\').replace(/\\([()\\])/g, '$1')
        if (s.trim()) strings.push(s)
      }
    }
  }
  return strings.join(' ').replace(/\s+/g, ' ').trim()
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const userId = (session.user as any).id

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const semester = formData.get('semester') as string || 'Semester 1'
    const year = parseInt(formData.get('year') as string || String(new Date().getFullYear()))
    const title = formData.get('title') as string || file?.name || 'Uploaded Training Data'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const fileName = file.name.toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())
    
    let extractedText = ''
    let structuredData: any = null
    let fileType = 'unknown'

    if (fileName.endsWith('.csv') || fileName.endsWith('.tsv')) {
      fileType = 'csv'
      const text = buffer.toString('utf-8')
      const rows = parseCSV(text)
      structuredData = rows
      extractedText = rows.map(r => Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(', ')).join('\n')
    } else if (fileName.endsWith('.pdf')) {
      fileType = 'pdf'
      extractedText = extractPDFText(buffer)
      if (!extractedText || extractedText.length < 50) {
        extractedText = `[PDF: ${file.name} — ${Math.round(file.size / 1024)}KB. Text extraction limited. Please also enter key content manually in the training data field.]`
      }
    } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      fileType = 'text'
      extractedText = buffer.toString('utf-8')
    } else if (fileName.endsWith('.json')) {
      fileType = 'json'
      try {
        structuredData = JSON.parse(buffer.toString('utf-8'))
        extractedText = JSON.stringify(structuredData, null, 2)
      } catch {
        extractedText = buffer.toString('utf-8')
      }
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Use PDF, CSV, TXT, JSON, or MD files.' }, { status: 400 })
    }

    // Deactivate existing sessions for same semester/year
    await supabaseAdmin
      .from('ai_training_sessions')
      .update({ is_active: false })
      .eq('semester', semester)
      .eq('year', year)

    // Save training session with extracted content
    const trainingData = {
      source: 'file_upload',
      file_name: file.name,
      file_type: fileType,
      file_size_kb: Math.round(file.size / 1024),
      uploaded_at: new Date().toISOString(),
      extracted_text: extractedText.slice(0, 50000), // limit to 50k chars
      structured_data: structuredData,
    }

    const { data, error } = await supabaseAdmin
      .from('ai_training_sessions')
      .insert({
        semester,
        year,
        title: `📄 ${title}`,
        description: `Uploaded from ${file.name} (${fileType.toUpperCase()}, ${Math.round(file.size / 1024)}KB)`,
        training_data: trainingData,
        created_by: userId,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      data,
      success: true,
      message: `✅ AI trained from ${file.name}! Extracted ${extractedText.length} characters of knowledge.`,
      extracted_preview: extractedText.slice(0, 300),
    })
  } catch (error) {
    console.error('Training upload error:', error)
    return NextResponse.json({ error: 'Failed to process training file' }, { status: 500 })
  }
}
