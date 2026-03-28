'use client'
import { useState } from 'react'

interface DocumentPreviewProps {
  fileUrl: string
  fileName: string
  fileType?: string
  fileSize?: number
  title?: string
}

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(type?: string, name?: string): string {
  const t = type || ''
  const n = (name || '').toLowerCase()
  if (t.includes('pdf') || n.endsWith('.pdf')) return '📄'
  if (t.includes('word') || n.endsWith('.doc') || n.endsWith('.docx')) return '📝'
  if (t.includes('excel') || t.includes('spreadsheet') || n.endsWith('.xls') || n.endsWith('.xlsx')) return '📊'
  if (t.includes('image') || n.match(/\.(jpg|jpeg|png|webp|gif)$/)) return '🖼️'
  return '📎'
}

function getFileLabel(type?: string, name?: string): string {
  const t = type || ''
  const n = (name || '').toLowerCase()
  if (t.includes('pdf') || n.endsWith('.pdf')) return 'PDF Document'
  if (t.includes('word') || n.endsWith('.doc') || n.endsWith('.docx')) return 'Word Document'
  if (t.includes('excel') || t.includes('spreadsheet') || n.endsWith('.xls') || n.endsWith('.xlsx')) return 'Excel Spreadsheet'
  if (t.includes('image') || n.match(/\.(jpg|jpeg|png|webp|gif)$/)) return 'Image'
  return 'Document'
}

function isImage(type?: string, name?: string): boolean {
  const t = type || ''
  const n = (name || '').toLowerCase()
  return t.includes('image') || !!n.match(/\.(jpg|jpeg|png|webp|gif)$/)
}

function isPdf(type?: string, name?: string): boolean {
  return (type || '').includes('pdf') || (name || '').toLowerCase().endsWith('.pdf')
}

export default function DocumentPreview({ fileUrl, fileName, fileType, fileSize, title }: DocumentPreviewProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const icon = getFileIcon(fileType, fileName)
  const label = getFileLabel(fileType, fileName)
  const size = formatSize(fileSize)

  return (
    <div className="mt-3">
      {/* Compact preview card — always visible */}
      <div className="rounded-xl overflow-hidden border"
        style={{ borderColor: '#e0e0ef', background: '#f8f9ff' }}>

        {/* HEADING PREVIEW — Half page / first view */}
        <div className="relative" style={{ height: '180px', overflow: 'hidden' }}>
          {isImage(fileType, fileName) ? (
            <img src={fileUrl} alt={fileName}
              className="w-full h-full object-cover"
              style={{ objectPosition: 'top' }} />
          ) : isPdf(fileType, fileName) ? (
            <iframe
              src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              className="w-full border-0"
              style={{ height: '800px', marginTop: '0', transform: 'scale(1)', transformOrigin: 'top left', pointerEvents: 'none' }}
              title={fileName}
            />
          ) : (
            /* For Word/Excel — show a styled placeholder with icon */
            <div className="w-full h-full flex flex-col items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f3f4f6, #e8eaf6)' }}>
              <span style={{ fontSize: '48px' }}>{icon}</span>
              <p className="font-semibold mt-2 text-sm" style={{ color: '#1a237e' }}>{label}</p>
              <p className="text-xs text-gray-500 mt-1 px-4 text-center">{fileName}</p>
              <p className="text-xs text-gray-400 mt-1">Click preview to view or download</p>
            </div>
          )}

          {/* Gradient fade at bottom to signal truncation */}
          {!isImage(fileType, fileName) && (
            <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
              style={{ background: 'linear-gradient(transparent, #f8f9ff)' }} />
          )}
        </div>

        {/* File info bar */}
        <div className="px-4 py-3 flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid #e0e0ef' }}>
          <div className="flex items-center gap-3 min-w-0">
            <span style={{ fontSize: '20px', flexShrink: 0 }}>{icon}</span>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: '#1a237e' }}>{fileName}</p>
              <p className="text-xs text-gray-400">{label}{size ? ` · ${size}` : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View full button */}
            <button onClick={() => setPreviewOpen(true)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
              style={{ background: '#e8eaf6', color: '#1a237e', border: 'none', cursor: 'pointer' }}>
              👁️ View
            </button>
            {/* Download */}
            <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
              style={{ background: '#1a237e', color: '#fff', textDecoration: 'none' }}>
              ⬇️ Download
            </a>
          </div>
        </div>
      </div>

      {/* Fullscreen Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(0,0,0,0.92)' }}>
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
            style={{ background: '#1a1a2e' }}>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: '22px' }}>{icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{fileName}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}{size ? ` · ${size}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer"
                className="text-sm px-4 py-2 rounded-xl font-medium flex items-center gap-2"
                style={{ background: '#1a237e', color: '#fff', textDecoration: 'none' }}>
                ⬇️ Download
              </a>
              <button onClick={() => setPreviewOpen(false)}
                className="text-white text-lg px-3 py-2 rounded-xl hover:bg-white/10"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          </div>

          {/* Preview content */}
          <div className="flex-1 overflow-hidden">
            {isImage(fileType, fileName) ? (
              <div className="w-full h-full flex items-center justify-center p-8">
                <img src={fileUrl} alt={fileName}
                  className="max-w-full max-h-full object-contain rounded-xl" />
              </div>
            ) : isPdf(fileType, fileName) ? (
              <iframe src={`${fileUrl}#toolbar=1&navpanes=1`}
                className="w-full h-full border-0" title={fileName} />
            ) : (
              /* Word/Excel: fallback to Google Docs viewer */
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
                className="w-full h-full border-0"
                title={fileName} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
