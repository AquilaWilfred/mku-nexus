-- ============================================
-- MKU NEXUS — Migration v11
-- Fix course_id foreign key constraint
-- Point to units table instead of courses
-- ============================================

-- Fix the foreign key constraint for course_id to reference units instead of courses
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_course_id_fkey;
ALTER TABLE users ADD CONSTRAINT users_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES units(id) ON DELETE CASCADE;