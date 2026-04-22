import NextAuth, { AuthOptions, Session } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { UserRole } from '@/types'
import { JWT } from 'next-auth/jwt'
import crypto from 'crypto'

// Generate a unique session ID to prevent session collisions
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex')
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'student-login',
      name: 'Student',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        return await authenticateUser(credentials.email, credentials.password, 'student')
      },
    }),
    CredentialsProvider({
      id: 'lecturer-login',
      name: 'Lecturer',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        return await authenticateUser(credentials.email, credentials.password, 'lecturer')
      },
    }),
    CredentialsProvider({
      id: 'admin-login',
      name: 'Admin',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        return await authenticateUser(credentials.email, credentials.password, 'admin')
      },
    }),
    CredentialsProvider({
      id: 'schedule-manager-login',
      name: 'Schedule Manager',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        return await authenticateUser(credentials.email, credentials.password, 'schedule_manager')
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }: { token: JWT; user?: unknown; trigger?: string }) {
      if (user) {
        const u = user as any
        token.id = u.id
        token.role = u.role
        token.full_name = u.full_name
        token.must_change_password = u.must_change_password || false
        token.course_id = u.course_id || null
        token.year_of_study = u.year_of_study || 1
        token.is_active = u.is_active !== false
        token.iat = Math.floor(Date.now() / 1000)
        token.sessionId = generateSessionId()

        // Record login session with unique session ID
        try {
          const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          await supabaseAdmin.from('login_sessions').insert({
            user_id: u.id,
            session_id: token.sessionId,
            logged_in_at: new Date().toISOString(),
            expires_at: sessionExpiresAt,
            is_active: true,
          })
        } catch (error) {
          console.error('[Auth] Error recording session:', error)
        }
      }

      if (trigger === 'update' || (token.id && !token._refreshed)) {
        try {
          const { data: freshUser } = await supabaseAdmin
            .from('users')
            .select('id, role, full_name, course_id, year_of_study, must_change_password, is_active')
            .eq('id', token.id as string)
            .single()
          if (freshUser) {
            token.course_id = freshUser.course_id || null
            token.year_of_study = freshUser.year_of_study || 1
            token.full_name = freshUser.full_name
            token.is_active = freshUser.is_active !== false
            token._refreshed = true
          }
        } catch (error) {
          console.error('[Auth] Error refreshing user:', error)
        }
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string
        ;(session.user as any).role = token.role as UserRole
        ;(session.user as any).must_change_password = token.must_change_password as boolean
        ;(session.user as any).course_id = token.course_id || null
        ;(session.user as any).year_of_study = token.year_of_study || 1
        ;(session.user as any).is_active = token.is_active !== false
        ;(session.user as any).sessionId = token.sessionId as string
        session.user.name = token.full_name as string
      }
      return session
    },
  },
  events: {
    async signOut({ token }) {
      if (token?.id && (token as any)?.sessionId) {
        try {
          const sessionId = (token as any).sessionId as string
          await supabaseAdmin
            .from('login_sessions')
            .update({
              logged_out_at: new Date().toISOString(),
              is_active: false,
            })
            .eq('session_id', sessionId)
        } catch (error) {
          console.error('[Auth] Error on signOut:', error)
        }
      }
    },
  },
  pages: {
    signIn: '/student/login',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // Update every hour
  },
  jwt: {
    maxAge: 24 * 60 * 60,
  },
}

async function authenticateUser(email: string, password: string, expectedRole: string) {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('role', expectedRole)
      .single()

    if (error || !user) return null

    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatch) return null

    return {
      id: user.id,
      email: user.email,
      name: user.full_name,
      full_name: user.full_name,
      role: user.role,
      must_change_password: user.must_change_password || false,
      course_id: user.course_id || null,
      year_of_study: user.year_of_study || 1,
      is_active: user.is_active !== false,
    }
  } catch (error) {
    console.error('[Auth] Authentication error:', error)
    return null
  }
}
