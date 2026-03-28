-- ============================================
-- MKU NEXUS — Migration v8
-- Schedule Manager · Deactivation · Login Tracking
-- Profile Photos · Clickable Notifications
-- Venue Change Tags · Smart Features
-- ============================================

-- ============================================
-- 1. ADD SCHEDULE_MANAGER ROLE
-- ============================================
-- Drop the old constraint and recreate with new role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'lecturer', 'student', 'schedule_manager'));

-- ============================================
-- 2. LOGIN / SESSION TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS login_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  logged_in_at TIMESTAMPTZ DEFAULT NOW(),
  logged_out_at TIMESTAMPTZ,
  session_duration_seconds INTEGER,
  is_active BOOLEAN DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_login_sessions_user ON login_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_date ON login_sessions(logged_in_at);

-- ============================================
-- 3. ACTIVATION REQUESTS (deactivated users)
-- ============================================
CREATE TABLE IF NOT EXISTS activation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activation_requests_user ON activation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_activation_requests_status ON activation_requests(status);

-- ============================================
-- 4. TIMETABLE APPEALS (→ Schedule Manager)
-- ============================================
CREATE TABLE IF NOT EXISTS timetable_appeals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submitted_by UUID REFERENCES users(id) ON DELETE CASCADE,
  submitter_role VARCHAR(20) NOT NULL,       -- 'student' or 'lecturer'
  timetable_id UUID REFERENCES timetable(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  appeal_type VARCHAR(30) NOT NULL CHECK (appeal_type IN (
    'venue_change', 'time_change', 'accessibility', 'clash', 'cancellation', 'other'
  )),
  current_venue_id UUID REFERENCES venues(id),
  requested_venue_id UUID REFERENCES venues(id),
  description TEXT NOT NULL,
  supporting_docs TEXT[],
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'under_review', 'approved', 'rejected', 'escalated'
  )),
  manager_notes TEXT,
  reviewed_by UUID REFERENCES users(id),     -- schedule_manager
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tt_appeals_submitter ON timetable_appeals(submitted_by);
CREATE INDEX IF NOT EXISTS idx_tt_appeals_status ON timetable_appeals(status);
CREATE INDEX IF NOT EXISTS idx_tt_appeals_unit ON timetable_appeals(unit_id);

-- ============================================
-- 5. VENUE CHANGE TAG (for AI awareness)
-- ============================================
ALTER TABLE timetable_overrides ADD COLUMN IF NOT EXISTS venue_change_tag TEXT;
ALTER TABLE timetable_overrides ADD COLUMN IF NOT EXISTS old_venue_name TEXT;
ALTER TABLE timetable_overrides ADD COLUMN IF NOT EXISTS new_venue_name TEXT;

-- ============================================
-- 6. PROFILE PHOTO & ADDITIONAL FIELDS
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_updated_at TIMESTAMPTZ;
-- profile_image already exists in schema

-- ============================================
-- 7. NOTIFICATION LINK METADATA
-- ============================================
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_type VARCHAR(50);
-- 'appeal', 'timetable', 'enrollment', 'event', 'activation', 'venue_change'

-- ============================================
-- 8. SMART FEATURE: STUDY GROUPS
-- ============================================
CREATE TABLE IF NOT EXISTS study_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  max_members INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  meeting_day VARCHAR(10),
  meeting_time TIME,
  meeting_venue TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, student_id)
);

-- ============================================
-- 9. SMART FEATURE: ATTENDANCE TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timetable_id UUID REFERENCES timetable(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  class_date DATE NOT NULL,
  status VARCHAR(10) DEFAULT 'present' CHECK (status IN ('present','absent','late','excused')),
  marked_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(timetable_id, student_id, class_date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timetable ON attendance(timetable_id);

-- ============================================
-- 10. SMART FEATURE: ANNOUNCEMENTS TARGETING
-- ============================================
ALTER TABLE events ADD COLUMN IF NOT EXISTS unit_id_target UUID REFERENCES units(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS pinned_until TIMESTAMPTZ;

-- ============================================
-- 11. SEED SCHEDULE MANAGER (example account)
-- ============================================
-- INSERT INTO users (email, password_hash, full_name, role, staff_id, must_change_password)
-- VALUES ('schedulemanager@mku.ac.ke', '$2b$12$placeholder', 'Schedule Manager', 'schedule_manager', 'SM001', true);
-- NOTE: Create this user through Admin > Users panel

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_login_sessions_active ON login_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_study_groups_unit ON study_groups(unit_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(class_date);
