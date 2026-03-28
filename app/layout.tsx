import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import SessionProvider from '@/components/shared/SessionProvider'

export const metadata: Metadata = {
  title: 'MKU NEXUS — Smart Academic Platform',
  description: 'Mount Kenya University intelligent campus management and AI assistant platform',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <SessionProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontFamily: "'DM Sans', sans-serif",
                borderRadius: '12px',
                border: '1px solid #e0e0ef',
                boxShadow: '0 4px 24px rgba(26,35,126,0.12)',
              },
              success: { iconTheme: { primary: '#2e7d32', secondary: '#fff' } },
              error: { iconTheme: { primary: '#c62828', secondary: '#fff' } },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  )
}
