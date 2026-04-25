import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase'
import { UserRole } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as unknown as { role: UserRole }).role
    if (role !== 'lecturer' && role !== 'admin') {
      return NextResponse.json({ error: 'Only lecturers can upload files' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const unitId = formData.get('unit_id') as string

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileExt = file.name.split('.').pop()
    const fileName = `${unitId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    // Upload to Supabase Storage (bucket: 'materials')
    const { data, error } = await supabaseAdmin.storage
      .from('materials')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json({ error: 'Failed to upload file: ' + error.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('materials')
      .getPublicUrl(data.path)

    return NextResponse.json({ url: publicUrl, path: data.path, success: true })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
