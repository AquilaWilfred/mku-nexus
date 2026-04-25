import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import { UserRole } from '@/types'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const role = (session.user as unknown as { role: UserRole }).role
    if (!['admin', 'schedule_manager'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as Blob | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    const fileName = (file as any).name || ''
    const fileType = (file as any).type || (
      fileName.endsWith('.pdf') ? 'application/pdf' :
      fileName.endsWith('.xml') ? 'text/xml' :
      fileName.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
      fileName.endsWith('.xls') ? 'application/vnd.ms-excel' :
      ''
    )
    const allowedTypes = [
      'application/pdf',
      'text/xml',
      'application/xml',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json({ success: false, error: 'Invalid file type. Only PDF, XML, and Excel files are allowed.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const storedFileName = `timetables/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('materials')
      .upload(storedFileName, buffer, { contentType: fileType || 'application/octet-stream', upsert: false })

    if (storageError || !storageData?.path) {
      console.error('Storage upload error:', storageError)
      return NextResponse.json({ success: false, error: 'Failed to save original timetable document' }, { status: 500 })
    }

    const { data: publicData } = supabaseAdmin.storage
      .from('materials')
      .getPublicUrl(storageData.path)

    if (!publicData?.publicUrl) {
      console.error('Storage URL error: Failed to get public URL')
      return NextResponse.json({ success: false, error: 'Failed to get timetable file URL' }, { status: 500 })
    }

    let extractedText = ''
    let firstPagePreview = ''

    if (fileType === 'application/pdf') {
      const pdfModule = await import('pdf-parse')
      const pdfParse = (pdfModule as any).default ?? pdfModule
      const data = await pdfParse(buffer)
      extractedText = data.text || ''
      firstPagePreview = extractedText.split(/\f/)[0]?.trim() || extractedText.trim()
    } else if (fileType === 'text/xml' || fileType === 'application/xml') {
      extractedText = buffer.toString('utf-8')
      firstPagePreview = extractedText.slice(0, 2000)
    } else if (fileType.includes('spreadsheet') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      extractedText = XLSX.utils.sheet_to_csv(worksheet)
      firstPagePreview = extractedText.split('\n').slice(0, 20).join('\n')
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ success: false, error: 'Could not extract text from file' }, { status: 400 })
    }

    const usersResult = await supabaseAdmin.from('users').select('id')
    if (usersResult.error) {
      console.error('Notifications user lookup failed:', usersResult.error)
    } else {
      const userIds = usersResult.data?.map((u: any) => u.id) || []
      if (userIds.length > 0) {
        const notifications = userIds.map((userId: string) => ({
          user_id: userId,
          title: 'New exam timetable uploaded',
          message: 'A new system exam timetable XML is available for viewing or download.',
          type: 'info',
          link: '/timetable/export',
          action_type: 'timetable',
        }))
        const { error: notifyError } = await supabaseAdmin.from('notifications').insert(notifications)
        if (notifyError) {
          console.error('Notifications insert failed:', notifyError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      preview: firstPagePreview,
      fileUrl: publicData.publicUrl,
      exportUrl: '/api/timetable/export',
      extractedText: extractedText.slice(0, 10000),
      message: 'File processed successfully. Preview is available.',
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}