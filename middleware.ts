import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname
    const role = token?.role as string | undefined
    const isActive = (token as any)?.is_active !== false

    // Block deactivated users from API mutations (except auth + activation-request)
    if (!isActive && token) {
      const blockedApiMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
      if (path.startsWith('/api/') && blockedApiMethods.includes(req.method || '')) {
        if (!path.startsWith('/api/activation-request') && !path.startsWith('/api/auth')) {
          return NextResponse.json({ error: 'Account deactivated. Please request reactivation from admin.' }, { status: 403 })
        }
      }
    }

    // Strict role-based access
    if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
      if (role !== 'admin') {
        if (role === 'lecturer') return NextResponse.redirect(new URL('/lecturer/dashboard', req.url))
        if (role === 'student') return NextResponse.redirect(new URL('/student/dashboard', req.url))
        if (role === 'schedule_manager') return NextResponse.redirect(new URL('/schedule-manager/dashboard', req.url))
        return NextResponse.redirect(new URL('/student/login', req.url))
      }
    }
    if (path.startsWith('/lecturer') && !path.startsWith('/lecturer/login')) {
      if (role !== 'lecturer') {
        if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', req.url))
        if (role === 'student') return NextResponse.redirect(new URL('/student/dashboard', req.url))
        if (role === 'schedule_manager') return NextResponse.redirect(new URL('/schedule-manager/dashboard', req.url))
        return NextResponse.redirect(new URL('/student/login', req.url))
      }
    }
    if (path.startsWith('/student') && !path.startsWith('/student/login')) {
      if (role !== 'student') {
        if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', req.url))
        if (role === 'lecturer') return NextResponse.redirect(new URL('/lecturer/dashboard', req.url))
        if (role === 'schedule_manager') return NextResponse.redirect(new URL('/schedule-manager/dashboard', req.url))
        return NextResponse.redirect(new URL('/student/login', req.url))
      }
    }
    if (path.startsWith('/schedule-manager') && !path.startsWith('/schedule-manager/login')) {
      if (role !== 'schedule_manager') {
        if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', req.url))
        if (role === 'lecturer') return NextResponse.redirect(new URL('/lecturer/dashboard', req.url))
        if (role === 'student') return NextResponse.redirect(new URL('/student/dashboard', req.url))
        return NextResponse.redirect(new URL('/student/login', req.url))
      }
    }

    const res = NextResponse.next()
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('X-Frame-Options', 'DENY')
    res.headers.set('X-XSS-Protection', '1; mode=block')
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    return res
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        if (path.endsWith('/login') || path === '/' || path.startsWith('/welcome') ||
            path.startsWith('/api/auth') || path.startsWith('/help') ||
            path.startsWith('/schedule-manager/login')) return true
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/admin/:path*', '/lecturer/:path*', '/student/:path*', '/schedule-manager/:path*'],
}
