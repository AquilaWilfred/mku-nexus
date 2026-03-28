// ============================================
// MKU NEXUS - Global TypeScript Types
// ============================================

export type UserRole = 'admin' | 'lecturer' | 'student' | 'schedule_manager'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  student_id?: string
  staff_id?: string
  phone?: string
  profile_image?: string
  is_active: boolean
  is_disabled: boolean
  disability_type?: string
  disability_notes?: string
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  name: string
  code: string
  description?: string
  created_at: string
}

export interface Building {
  id: string
  name: string
  code: string
  has_lift: boolean
  floors: number
  accessibility_notes?: string
  location_description?: string
  created_at: string
}

export interface Venue {
  id: string
  building_id: string
  room_number: string
  name?: string
  capacity: number
  floor_number: number
  has_projector: boolean
  has_ac: boolean
  is_accessible: boolean
  notes?: string
  building?: Building
  created_at: string
}

export interface Unit {
  id: string
  code: string
  name: string
  description?: string
  department_id: string
  credits: number
  semester: string
  year: number
  lecturer_id: string
  max_students: number
  is_active: boolean
  lecturer?: User
  department?: Department
  created_at: string
  updated_at: string
}

export interface Enrollment {
  id: string
  student_id: string
  unit_id: string
  enrolled_at: string
  status: 'active' | 'dropped' | 'completed'
  unit?: Unit
  student?: User
}

export type TimetableDayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
export type SessionType = 'lecture' | 'lab' | 'tutorial' | 'exam'

export interface TimetableEntry {
  id: string
  unit_id: string
  venue_id: string
  day_of_week: TimetableDayOfWeek
  start_time: string
  end_time: string
  session_type: SessionType
  semester: string
  year: number
  is_recurring: boolean
  effective_from?: string
  effective_to?: string
  unit?: Unit
  venue?: Venue
  created_at: string
  updated_at: string
}

export type MaterialType = 'pdf' | 'video' | 'image' | 'text' | 'link' | 'audio'

export interface Material {
  id: string
  unit_id: string
  lecturer_id: string
  title: string
  description?: string
  type: MaterialType
  file_url?: string
  file_size?: number
  file_name?: string
  content_text?: string
  is_published: boolean
  download_count: number
  unit?: Unit
  lecturer?: User
  created_at: string
  updated_at: string
}

export type EventType = 'class' | 'exam' | 'entertainment' | 'sports' | 'university' | 'emergency' | 'venue_change' | 'cancellation' | 'general'

export interface Event {
  id: string
  title: string
  description: string
  event_type: EventType
  created_by: string
  unit_id?: string
  venue_id?: string
  start_datetime?: string
  end_datetime?: string
  is_urgent: boolean
  target_role: 'all' | 'student' | 'lecturer' | 'admin'
  is_published: boolean
  creator?: User
  unit?: Unit
  venue?: Venue
  created_at: string
  updated_at: string
}

export type AppealStatus = 'pending' | 'under_review' | 'approved' | 'rejected'

export interface DisabilityAppeal {
  id: string
  student_id: string
  unit_id?: string
  current_venue_id?: string
  requested_venue_id?: string
  disability_type: string
  description: string
  supporting_docs?: string[]
  status: AppealStatus
  admin_notes?: string
  lecturer_notes?: string
  reviewed_by_admin?: string
  reviewed_by_lecturer?: string
  admin_reviewed_at?: string
  lecturer_reviewed_at?: string
  student?: User
  unit?: Unit
  current_venue?: Venue
  requested_venue?: Venue
  created_at: string
  updated_at: string
}

export interface AITrainingSession {
  id: string
  semester: string
  year: number
  title: string
  description?: string
  training_data: Record<string, unknown>
  created_by: string
  is_active: boolean
  created_at: string
}

export interface ChatMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  metadata?: Record<string, unknown>
  created_at: string
}

export type NotificationType = 'info' | 'warning' | 'success' | 'error' | 'urgent'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  link?: string
  created_at: string
}

export interface VenueChange {
  id: string
  timetable_id: string
  old_venue_id: string
  new_venue_id: string
  change_date: string
  reason?: string
  created_by: string
  approved_by?: string
  status: 'pending' | 'approved' | 'rejected'
  old_venue?: Venue
  new_venue?: Venue
  created_at: string
}

// ============================================
// API Response Types
// ============================================
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// ============================================
// Dashboard Stats
// ============================================
export interface AdminDashboardStats {
  total_students: number
  total_lecturers: number
  total_units: number
  total_events: number
  pending_appeals: number
  active_timetable_entries: number
  recent_events: Event[]
  recent_appeals: DisabilityAppeal[]
  enrollment_trends: { month: string; count: number }[]
  user_activity: { date: string; active_users: number }[]
}

// ============================================
// Next Auth Session
// ============================================
export interface NexusSession {
  user: {
    id: string
    email: string
    name: string
    role: UserRole
    image?: string
  }
  expires: string
}

export interface TimetableAppeal {
  id: string
  submitted_by: string
  submitter_role: string
  timetable_id?: string
  unit_id: string
  appeal_type: string
  current_venue_id?: string
  requested_venue_id?: string
  description: string
  supporting_docs?: string[]
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'escalated'
  manager_notes?: string
  reviewed_by?: string
  reviewed_at?: string
  submitter?: User
  unit?: Unit
  current_venue?: Venue
  requested_venue?: Venue
  created_at: string
  updated_at: string
}

export interface ActivationRequest {
  id: string
  user_id: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes?: string
  reviewed_by?: string
  reviewed_at?: string
  user?: User
  created_at: string
  updated_at: string
}

export interface LoginSession {
  id: string
  user_id: string
  ip_address?: string
  user_agent?: string
  logged_in_at: string
  logged_out_at?: string
  session_duration_seconds?: number
  is_active: boolean
  user?: User
}
