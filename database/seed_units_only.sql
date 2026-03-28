-- ============================================================
-- MKU NEXUS — UNITS-ONLY SEED (Safe for production testing)
-- Run AFTER schema.sql in Supabase SQL Editor
-- No fake user accounts — students and lecturers register themselves
-- Extracted from MKU Jan–Apr 2026 Teaching Timetable
-- ============================================================

-- ============================================================
-- MIGRATIONS (safe to re-run)
-- ============================================================
ALTER TABLE events ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS file_type VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS year_of_study INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS help_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email VARCHAR(255) NOT NULL,
  user_role VARCHAR(20) NOT NULL CHECK (user_role IN ('student','lecturer','admin')),
  full_name VARCHAR(255),
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  request_type VARCHAR(30) DEFAULT 'general' CHECK (request_type IN ('password_reset','account_issue','general','technical')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  admin_response TEXT,
  reset_link TEXT,
  reset_link_expires_at TIMESTAMPTZ,
  reset_link_used BOOLEAN DEFAULT false,
  handled_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS course_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  year_of_study INTEGER DEFAULT 1,
  is_required BOOLEAN DEFAULT true,
  UNIQUE(course_id, unit_id)
);

CREATE TABLE IF NOT EXISTS forums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  forum_type VARCHAR(30) DEFAULT 'discussion',
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

CREATE TABLE IF NOT EXISTS venue_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecturer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id),
  unit_id UUID REFERENCES units(id),
  day_of_week VARCHAR(10),
  start_time TIME,
  end_time TIME,
  session_type VARCHAR(20) DEFAULT 'lecture',
  semester VARCHAR(20),
  year INTEGER,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_forums_unit ON forums(unit_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_forum ON forum_posts(forum_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_course_units_course ON course_units(course_id);
CREATE INDEX IF NOT EXISTS idx_users_course ON users(course_id);

-- ============================================================
-- STEP 1: Departments
-- ============================================================
INSERT INTO departments (name, code, description) VALUES
('Journalism & Media',       'JMC', 'Bachelor of Arts in Journalism and Mass Communication'),
('International Relations',  'IR',  'Diplomacy, Security Studies and International Economics'),
('Public Administration',    'PA',  'Public Policy, Administration and Development'),
('Finance & Accounting',     'FA',  'Banking, Finance, Accounting and Taxation'),
('Business Management',      'BM',  'Business, Commerce, Marketing and Procurement'),
('Law',                      'LW',  'Legal studies, Labour Law and Constitutional Law'),
('Education & Development',  'ED',  'Development Studies, Gender, Population and Human Rights')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- STEP 2: Buildings & Venues
-- ============================================================
INSERT INTO buildings (name, code, has_lift, floors, accessibility_notes) VALUES
('Main Academic Block',  'MAB',   true,  4, 'Lift available, all floors accessible'),
('Technology Hub',       'TECH',  true,  3, 'Lift available, accessible labs on all floors'),
('Library Block',        'LIB',   true,  3, 'Fully accessible, quiet zones on each floor'),
('Administration Block', 'ADM',   true,  2, 'Lift available'),
('Science Complex',      'SCI',   false, 3, 'No lift — ground floor labs accessible only'),
('Sports Complex',       'SPORT', false, 1, 'Ground floor only, fully accessible')
ON CONFLICT (code) DO NOTHING;

INSERT INTO venues (building_id, room_number, name, capacity, floor_number, has_projector, has_ac, is_accessible) VALUES
((SELECT id FROM buildings WHERE code='MAB'),  'MAB-101',  'Lecture Hall 1',       120, 1, true,  true,  true),
((SELECT id FROM buildings WHERE code='MAB'),  'MAB-102',  'Lecture Hall 2',       100, 1, true,  true,  true),
((SELECT id FROM buildings WHERE code='MAB'),  'MAB-201',  'Seminar Room 1',        40, 2, true,  true,  true),
((SELECT id FROM buildings WHERE code='MAB'),  'MAB-202',  'Seminar Room 2',        40, 2, true,  false, true),
((SELECT id FROM buildings WHERE code='MAB'),  'MAB-301',  'Tutorial Room 1',       30, 3, false, false, true),
((SELECT id FROM buildings WHERE code='MAB'),  'MAB-302',  'Tutorial Room 2',       30, 3, false, false, true),
((SELECT id FROM buildings WHERE code='TECH'), 'TECH-101', 'Computer Lab A',        50, 1, true,  true,  true),
((SELECT id FROM buildings WHERE code='TECH'), 'TECH-102', 'Computer Lab B',        50, 1, true,  true,  true),
((SELECT id FROM buildings WHERE code='TECH'), 'TECH-201', 'Media Studio',          25, 2, true,  true,  true),
((SELECT id FROM buildings WHERE code='TECH'), 'TECH-202', 'Broadcasting Lab',      20, 2, true,  true,  true),
((SELECT id FROM buildings WHERE code='LIB'),  'LIB-101',  'Reading Hall',          80, 1, false, true,  true),
((SELECT id FROM buildings WHERE code='LIB'),  'LIB-201',  'Research Room',         20, 2, true,  true,  true),
((SELECT id FROM buildings WHERE code='SCI'),  'SCI-001',  'Science Lab 1',         40, 0, true,  false, true),
((SELECT id FROM buildings WHERE code='ADM'),  'ADM-101',  'Boardroom',             20, 1, true,  true,  true)
ON CONFLICT (room_number) DO NOTHING;

-- ============================================================
-- STEP 3: Degree Courses (students select these on first login)
-- ============================================================
INSERT INTO courses (code, name, department_id, duration_years, description) VALUES
('BJL',  'Bachelor of Arts in Journalism & Mass Communication',
 (SELECT id FROM departments WHERE code='JMC'), 4,
 'Covers print, broadcast and digital media, journalism ethics, advertising and public relations.'),

('BJS',  'Bachelor of Arts in International Relations & Security Studies',
 (SELECT id FROM departments WHERE code='IR'),  4,
 'Diplomacy, international law, security studies and global political economy.'),

('BPA',  'Bachelor of Public Administration',
 (SELECT id FROM departments WHERE code='PA'),  4,
 'Public sector management, governance, policy analysis and administration.'),

('BAF',  'Bachelor of Arts in Finance & Accounting',
 (SELECT id FROM departments WHERE code='FA'),  4,
 'Financial management, accounting, banking and taxation.'),

('BBM',  'Bachelor of Business Management',
 (SELECT id FROM departments WHERE code='BM'),  4,
 'Management, organisational behaviour, procurement, marketing and entrepreneurship.'),

('BLW',  'Bachelor of Laws (LLB)',
 (SELECT id FROM departments WHERE code='LW'),  4,
 'Legal theory, constitutional law, commercial law and labour law.'),

('BED',  'Bachelor of Education in Development Studies',
 (SELECT id FROM departments WHERE code='ED'),  4,
 'Development theory, gender studies, population, human rights and policy.')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- STEP 4: Units (30 real units from MKU Jan–Apr 2026 Timetable)
-- NOTE: lecturer_id will be NULL until lecturers register and admin assigns them
-- ============================================================
INSERT INTO units (code, name, description, credits, semester, year, department_id, is_active) VALUES
-- JOURNALISM & MEDIA
('BJL2104','Feature Writing',
 'Advanced journalistic writing focusing on feature articles, human interest stories and investigative pieces.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='JMC'),true),
('BJL1204','Public Speaking',
 'Principles of public speaking, rhetoric, oral communication and presentation skills.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='JMC'),true),
('BJL2201','Advertising',
 'Theories and practice of advertising including media planning, campaign design and consumer behaviour.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='JMC'),true),
('BJL2106','Media And The Society',
 'Study of mass media effects on society, culture, politics and public discourse.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='JMC'),true),
('BJL2116','Media Law And Ethics',
 'Legal framework governing media practice, press freedom, defamation, copyright and media ethics.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='JMC'),true),
('BJL2110','Script And Screen Writing',
 'Principles of scriptwriting for television, film and radio including format, structure and character development.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='JMC'),true),
('BJL2210','Film Lighting',
 'Technical and artistic aspects of lighting for film and television production.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='JMC'),true),
('BJL3216','Documentary Production',
 'Pre-production, production and post-production techniques for documentary film making.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='JMC'),true),
-- INTERNATIONAL RELATIONS
('BJS1102','Introduction To Diplomacy',
 'Foundations of diplomatic practice, international protocols, negotiation and multilateral diplomacy.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='IR'),true),
('BJS1103','Introduction To Security Studies',
 'Concepts of national and international security, conflict resolution and peacekeeping.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='IR'),true),
('BJS1212','Comparative Public Administration',
 'Comparison of public administration systems across different political contexts and regions.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='PA'),true),
-- EDUCATION & DEVELOPMENT
('BED2102','Gender And Development',
 'Gender theories, gender mainstreaming in development policy and women empowerment.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='ED'),true),
('BED3202','Population And Development',
 'Demographic theories, population dynamics and their relationship to economic and social development.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='ED'),true),
('BED4219','Role Of Development Partners',
 'Analysis of bilateral and multilateral development agencies, NGOs and their role in national development.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='ED'),true),
('BED2111','Democracy And Human Rights',
 'Principles of democracy, human rights frameworks, constitutionalism and civil society.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='ED'),true),
('BED1101','Introduction To Micro Economics',
 'Basic microeconomic theory, market structures, consumer behaviour and price mechanisms.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='ED'),true),
('BBM3203','Conflict Management',
 'Theories and techniques of conflict resolution, negotiation, mediation and dispute management.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='BM'),true),
-- FINANCE & ACCOUNTING
('BAF2105','Business Law',
 'Legal principles governing business transactions, contracts, torts and commercial law.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='FA'),true),
('BAF2104','Financial Management I',
 'Capital budgeting, cost of capital, working capital management and financial planning.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='FA'),true),
('BAF1101','Financial Accounting I',
 'Double-entry bookkeeping, trial balance, financial statements and basic accounting principles.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='FA'),true),
('BAF2103','Quantitative Techniques',
 'Statistical methods, probability, linear programming and quantitative decision-making tools.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='FA'),true),
('BAF3204','Principles Of Taxation',
 'Kenya tax system, income tax, VAT, customs and excise, tax planning and compliance.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='FA'),true),
-- BUSINESS MANAGEMENT
('BBM2103','Organizational Behaviour',
 'Individual and group behaviour in organisations, motivation, leadership and change management.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='BM'),true),
('BBM2204','Fundamentals Of Management And Leadership',
 'Classical and contemporary management theories, leadership styles and organisational strategy.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='BM'),true),
('BBM3107','Human Resource Management',
 'Recruitment, training, performance appraisal, compensation, labour relations and HR strategy.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='BM'),true),
('BBM4213','Management Of Change',
 'Theories of organisational change, change management models, resistance and implementation.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='BM'),true),
('BBM1208','Managing Public And Non-Profit Organizations',
 'Governance, accountability and management in public sector and civil society organisations.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='BM'),true),
('BBM2102','Introduction To Purchasing And Supply',
 'Procurement principles, supply chain management, vendor management and inventory control.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='BM'),true),
-- LAW
('BLW2201','Labour Laws',
 'Employment law, workers rights, industrial relations, collective bargaining and labour disputes.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='LW'),true),
('BLA1102','French I',
 'Introductory French: grammar, vocabulary, reading comprehension and basic conversation.',
 3,'Semester 1',2026,(SELECT id FROM departments WHERE code='LW'),true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- STEP 5: Link units to their degree courses
-- ============================================================
-- BJL units
INSERT INTO course_units (course_id, unit_id, year_of_study)
SELECT (SELECT id FROM courses WHERE code='BJL'), u.id,
  CASE WHEN u.code LIKE 'BJL1%' THEN 1 WHEN u.code LIKE 'BJL2%' THEN 2 ELSE 3 END
FROM units u WHERE u.code IN ('BJL2104','BJL1204','BJL2201','BJL2106','BJL2116','BJL2110','BJL2210','BJL3216')
ON CONFLICT DO NOTHING;

-- BJS units
INSERT INTO course_units (course_id, unit_id, year_of_study)
SELECT (SELECT id FROM courses WHERE code='BJS'), u.id, 1
FROM units u WHERE u.code IN ('BJS1102','BJS1103','BJS1212')
ON CONFLICT DO NOTHING;

-- BAF units
INSERT INTO course_units (course_id, unit_id, year_of_study)
SELECT (SELECT id FROM courses WHERE code='BAF'), u.id,
  CASE WHEN u.code LIKE 'BAF1%' THEN 1 WHEN u.code LIKE 'BAF2%' THEN 2 ELSE 3 END
FROM units u WHERE u.code IN ('BAF2105','BAF2104','BAF1101','BAF2103','BAF3204')
ON CONFLICT DO NOTHING;

-- BBM units
INSERT INTO course_units (course_id, unit_id, year_of_study)
SELECT (SELECT id FROM courses WHERE code='BBM'), u.id,
  CASE WHEN u.code LIKE 'BBM1%' THEN 1 WHEN u.code LIKE 'BBM2%' THEN 2
       WHEN u.code LIKE 'BBM3%' THEN 3 ELSE 4 END
FROM units u WHERE u.code IN ('BBM2103','BBM2204','BBM3107','BBM4213','BBM1208','BBM2102','BBM3203')
ON CONFLICT DO NOTHING;

-- BLW units
INSERT INTO course_units (course_id, unit_id, year_of_study)
SELECT (SELECT id FROM courses WHERE code='BLW'), u.id, 2
FROM units u WHERE u.code IN ('BLW2201','BLA1102','BAF2105')
ON CONFLICT DO NOTHING;

-- BED units
INSERT INTO course_units (course_id, unit_id, year_of_study)
SELECT (SELECT id FROM courses WHERE code='BED'), u.id,
  CASE WHEN u.code LIKE '%1%' THEN 1 WHEN u.code LIKE '%2%' THEN 2
       WHEN u.code LIKE '%3%' THEN 3 ELSE 4 END
FROM units u WHERE u.code IN ('BED2102','BED3202','BED4219','BED2111','BED1101','BBM3203')
ON CONFLICT DO NOTHING;

-- BPA units (share some with BED and BJS)
INSERT INTO course_units (course_id, unit_id, year_of_study)
SELECT (SELECT id FROM courses WHERE code='BJS'), u.id, 2
FROM units u WHERE u.code IN ('BED2111','BED2102','BBM3203')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 6: Timetable (venues must exist first)
-- ============================================================
INSERT INTO timetable (unit_id, venue_id, day_of_week, start_time, end_time, session_type, semester, year, is_recurring)
SELECT u.id, v.id, tt.day, tt.start_t::time, tt.end_t::time, 'lecture', 'Semester 1', 2026, true
FROM (VALUES
  ('BJL2104','MAB-102','Monday',   '10:00','13:00'),
  ('BJL2201','MAB-101','Tuesday',  '07:00','10:00'),
  ('BJL1204','MAB-301','Tuesday',  '10:00','13:00'),
  ('BJL2106','MAB-101','Wednesday','10:00','13:00'),
  ('BJL2116','MAB-102','Thursday', '10:00','13:00'),
  ('BJL2110','TECH-101','Wednesday','07:00','10:00'),
  ('BJL2210','TECH-101','Monday',  '10:00','13:00'),
  ('BJL3216','MAB-102','Thursday', '13:00','16:00'),
  ('BJS1102','MAB-101','Tuesday',  '10:00','13:00'),
  ('BJS1103','MAB-102','Wednesday','10:00','13:00'),
  ('BJS1212','MAB-301','Wednesday','07:00','10:00'),
  ('BED2102','MAB-102','Tuesday',  '07:00','10:00'),
  ('BED3202','MAB-102','Wednesday','10:00','13:00'),
  ('BED4219','MAB-301','Wednesday','13:00','16:00'),
  ('BED2111','MAB-101','Monday',   '07:00','10:00'),
  ('BED1101','MAB-101','Tuesday',  '13:00','16:00'),
  ('BBM3203','TECH-101','Thursday','10:00','13:00'),
  ('BAF2105','MAB-101','Monday',   '10:00','13:00'),
  ('BAF2104','MAB-102','Monday',   '13:00','16:00'),
  ('BAF1101','TECH-101','Tuesday', '10:00','13:00'),
  ('BAF2103','MAB-301','Thursday', '07:00','10:00'),
  ('BAF3204','MAB-101','Friday',   '10:00','13:00'),
  ('BBM2103','MAB-101','Monday',   '10:00','13:00'),
  ('BBM2204','MAB-102','Tuesday',  '10:00','13:00'),
  ('BBM3107','TECH-101','Thursday','10:00','13:00'),
  ('BBM4213','MAB-301','Thursday', '13:00','16:00'),
  ('BBM1208','MAB-101','Wednesday','13:00','16:00'),
  ('BBM2102','TECH-201','Friday',  '07:00','10:00'),
  ('BLW2201','MAB-101','Tuesday',  '13:00','16:00'),
  ('BLA1102','MAB-102','Monday',   '07:00','10:00')
) AS tt(unit_code, venue_code, day, start_t, end_t)
JOIN units u ON u.code = tt.unit_code
JOIN venues v ON v.room_number = tt.venue_code
ON CONFLICT DO NOTHING;

-- ============================================================
-- HOW THIS WORKS
-- ============================================================
-- 1. Admin creates their account via /admin/login (or first run setup)
-- 2. Lecturers register at /lecturer/login then admin assigns their units
-- 3. Students register at /student/login, select their degree course,
--    then browse and self-enroll in units for their course
-- 4. All real data — no fake/test passwords needed
