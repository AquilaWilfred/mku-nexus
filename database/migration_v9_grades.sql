-- ============================================
-- MKU NEXUS — Migration v9
-- Student Unit Grades & Results Tracking
-- ============================================

-- ============================================
-- GRADES TABLE (tracking completion and performance)
-- ============================================
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
  score NUMERIC(5,2),               -- 0-100
  grade_letter VARCHAR(2),          -- A, B, C, D, E, F
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN (
    'in_progress',      -- Currently enrolled
    'completed_pass',   -- Completed with passing grade
    'completed_fail',   -- Completed but failed
    'completed_defer',  -- Grade deferred (yet to be released)
    'retake'           -- Failed and needs retake
  )),
  result_released_at TIMESTAMPTZ,   -- When grade was released
  marked_at TIMESTAMPTZ DEFAULT NOW(),
  marked_by UUID REFERENCES users(id),  -- Lecturer who marked
  notes TEXT,
  UNIQUE(student_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_unit ON grades(unit_id);
CREATE INDEX IF NOT EXISTS idx_grades_status ON grades(status);
CREATE INDEX IF NOT EXISTS idx_grades_result_released ON grades(result_released_at);

-- ============================================
-- ADD enrollment_status to track enrollment lifecycle
-- ============================================
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS current_status VARCHAR(20) 
  DEFAULT 'in_progress' CHECK (current_status IN (
    'in_progress',    -- Currently enrolled
    'completed',      -- Completed (with grade)
    'dropped',        -- Dropped by student
    'failed'         -- Failed (needs retake or not)
  ));

-- ============================================
-- SEED INITIAL GRADES (Example data for testing)
-- ============================================
-- NOTE: Uncomment to add sample grades. Adjust student_id, unit_id values
-- INSERT INTO grades (student_id, unit_id, score, grade_letter, status, marked_by, result_released_at)
-- SELECT 
--   (SELECT id FROM users WHERE role='student' LIMIT 1),
--   (SELECT id FROM units LIMIT 1),
--   85,
--   'A',
--   'completed_pass',
--   (SELECT id FROM users WHERE role='lecturer' LIMIT 1),
--   NOW()
-- WHERE NOT EXISTS (SELECT 1 FROM grades LIMIT 1);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status, student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_current_status ON enrollments(current_status);
