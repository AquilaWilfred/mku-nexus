-- ============================================
-- MKU NEXUS - Complete Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (Admin, Lecturer, Student)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'lecturer', 'student')),
  student_id VARCHAR(50),
  staff_id VARCHAR(50),
  phone VARCHAR(20),
  profile_image TEXT,
  is_active BOOLEAN DEFAULT true,
  is_disabled BOOLEAN DEFAULT false,
  disability_type VARCHAR(255),
  disability_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DEPARTMENTS
-- ============================================
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BUILDINGS & VENUES
-- ============================================
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  has_lift BOOLEAN DEFAULT false,
  floors INTEGER DEFAULT 1,
  accessibility_notes TEXT,
  location_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id),
  room_number VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  capacity INTEGER DEFAULT 30,
  floor_number INTEGER DEFAULT 0,
  has_projector BOOLEAN DEFAULT false,
  has_ac BOOLEAN DEFAULT false,
  is_accessible BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- UNITS (COURSES)
-- ============================================
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  department_id UUID REFERENCES departments(id),
  credits INTEGER DEFAULT 3,
  semester VARCHAR(20) NOT NULL,
  year INTEGER NOT NULL,
  lecturer_id UUID REFERENCES users(id),
  max_students INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STUDENT UNIT ENROLLMENTS
-- ============================================
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
  UNIQUE(student_id, unit_id)
);

-- ============================================
-- TIMETABLE
-- ============================================
CREATE TABLE timetable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id),
  day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  session_type VARCHAR(20) DEFAULT 'lecture' CHECK (session_type IN ('lecture','lab','tutorial','exam')),
  semester VARCHAR(20) NOT NULL,
  year INTEGER NOT NULL,
  is_recurring BOOLEAN DEFAULT true,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEARNING MATERIALS
-- ============================================
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  lecturer_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('pdf','video','image','text','link','audio')),
  file_url TEXT,
  file_size BIGINT,
  file_name VARCHAR(255),
  content_text TEXT,
  is_published BOOLEAN DEFAULT true,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EVENTS & ANNOUNCEMENTS
-- ============================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  event_type VARCHAR(30) DEFAULT 'general' CHECK (event_type IN ('class','exam','entertainment','sports','university','emergency','venue_change','cancellation','general')),
  created_by UUID REFERENCES users(id),
  unit_id UUID REFERENCES units(id),
  venue_id UUID REFERENCES venues(id),
  start_datetime TIMESTAMPTZ,
  end_datetime TIMESTAMPTZ,
  is_urgent BOOLEAN DEFAULT false,
  target_role VARCHAR(20) DEFAULT 'all' CHECK (target_role IN ('all','student','lecturer','admin')),
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DISABILITY APPEALS
-- ============================================
CREATE TABLE disability_appeals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id),
  current_venue_id UUID REFERENCES venues(id),
  requested_venue_id UUID REFERENCES venues(id),
  disability_type VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  supporting_docs TEXT[],
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','under_review','approved','rejected')),
  admin_notes TEXT,
  lecturer_notes TEXT,
  reviewed_by_admin UUID REFERENCES users(id),
  reviewed_by_lecturer UUID REFERENCES users(id),
  admin_reviewed_at TIMESTAMPTZ,
  lecturer_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI TRAINING DATA (Semester Knowledge)
-- ============================================
CREATE TABLE ai_training_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  semester VARCHAR(20) NOT NULL,
  year INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  training_data JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHAT HISTORY
-- ============================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(30) DEFAULT 'info' CHECK (type IN ('info','warning','success','error','urgent')),
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VENUE CHANGE REQUESTS (by Lecturers)
-- ============================================
CREATE TABLE venue_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timetable_id UUID REFERENCES timetable(id),
  old_venue_id UUID REFERENCES venues(id),
  new_venue_id UUID REFERENCES venues(id),
  change_date DATE NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_unit ON enrollments(unit_id);
CREATE INDEX idx_timetable_unit ON timetable(unit_id);
CREATE INDEX idx_timetable_day ON timetable(day_of_week);
CREATE INDEX idx_materials_unit ON materials(unit_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_datetime ON events(start_datetime);
CREATE INDEX idx_chat_user ON chat_messages(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_disability_student ON disability_appeals(student_id);

-- ============================================
-- SEED DATA - Departments
-- ============================================
INSERT INTO departments (name, code) VALUES
('Computer Science', 'CS'),
('Business Administration', 'BA'),
('Engineering', 'ENG'),
('Medicine', 'MED'),
('Law', 'LAW'),
('Education', 'EDU');

-- ============================================
-- SEED DATA - Buildings
-- ============================================
INSERT INTO buildings (name, code, has_lift, floors, accessibility_notes) VALUES
('Main Academic Block', 'MAB', true, 5, 'Lift available on east wing. Ramps on all entrances.'),
('Science Complex', 'SCI', false, 3, 'No lift available. Ground floor only for mobility-impaired.'),
('Technology Hub', 'TECH', true, 4, 'Fully accessible. Lift, ramps, and accessible restrooms.'),
('Library Block', 'LIB', true, 2, 'Lift available. Accessible entrance on north side.'),
('Sports Complex', 'SPORT', false, 1, 'Single floor. Accessible parking nearby.'),
('Administration Block', 'ADMIN', true, 3, 'Lift available. Accessible reception on ground floor.');

-- ============================================
-- SEED DATA - Venues
-- ============================================
INSERT INTO venues (building_id, room_number, name, capacity, floor_number, has_projector, is_accessible) VALUES
((SELECT id FROM buildings WHERE code='MAB'), 'MAB-101', 'Lecture Hall 1', 120, 1, true, true),
((SELECT id FROM buildings WHERE code='MAB'), 'MAB-102', 'Lecture Hall 2', 80, 1, true, true),
((SELECT id FROM buildings WHERE code='MAB'), 'MAB-301', 'Seminar Room A', 40, 3, true, false),
((SELECT id FROM buildings WHERE code='TECH'), 'TECH-101', 'Computer Lab 1', 50, 1, true, true),
((SELECT id FROM buildings WHERE code='TECH'), 'TECH-201', 'Computer Lab 2', 50, 2, true, true),
((SELECT id FROM buildings WHERE code='SCI'), 'SCI-101', 'Science Lab A', 35, 1, false, true),
((SELECT id FROM buildings WHERE code='SCI'), 'SCI-201', 'Physics Lab', 30, 2, false, false),
((SELECT id FROM buildings WHERE code='LIB'), 'LIB-GF', 'Study Hall', 100, 0, false, true);

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Basic
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE disability_appeals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "users_read_own" ON users FOR SELECT USING (true);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (true);

-- Allow service role full access (for server-side operations)
CREATE POLICY "service_role_all" ON enrollments FOR ALL USING (true);
CREATE POLICY "service_role_materials" ON materials FOR ALL USING (true);
CREATE POLICY "service_role_chat" ON chat_messages FOR ALL USING (true);
CREATE POLICY "service_role_notif" ON notifications FOR ALL USING (true);
CREATE POLICY "service_role_appeals" ON disability_appeals FOR ALL USING (true);


-- ============================================
-- SCHEMA UPDATES (Run after initial migration)
-- ============================================

-- Add must_change_password to users (for admin-created accounts)
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- ============================================
-- VENUE REQUESTS (Lecturer requests → Admin approves)
-- ============================================
CREATE TABLE IF NOT EXISTS venue_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecturer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  day_of_week VARCHAR(20) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  session_type VARCHAR(20) DEFAULT 'lecture',
  semester VARCHAR(20) NOT NULL,
  year INTEGER NOT NULL,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venue_requests_lecturer ON venue_requests(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_venue_requests_status ON venue_requests(status);
CREATE INDEX IF NOT EXISTS idx_venue_requests_venue ON venue_requests(venue_id);

-- ============================================
-- FORUMS & DISCUSSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS forums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  forum_type VARCHAR(30) DEFAULT 'discussion' CHECK (forum_type IN ('discussion', 'assignment', 'quiz', 'announcement', 'general')),
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forum_id UUID REFERENCES forums(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forums_unit ON forums(unit_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_forum ON forum_posts(forum_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(post_id);

-- Add is_read to notifications if not exists
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Add must_change_password to users if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- ============================================
-- COURSES (Degree programmes students enrol in)
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  department_id UUID REFERENCES departments(id),
  duration_years INTEGER DEFAULT 4,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link units to courses (a unit can belong to multiple courses)
CREATE TABLE IF NOT EXISTS course_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  year_of_study INTEGER DEFAULT 1,
  is_required BOOLEAN DEFAULT true,
  UNIQUE(course_id, unit_id)
);

-- Track which course a student is registered for
ALTER TABLE users ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS year_of_study INTEGER DEFAULT 1;
