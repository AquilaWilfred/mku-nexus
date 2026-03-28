-- ============================================================
-- MKU NEXUS v6 MIGRATION
-- Run in Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- 1. Lecturer unit registrations (lecturer picks units to teach)
CREATE TABLE IF NOT EXISTS lecturer_unit_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecturer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  semester VARCHAR(20) NOT NULL DEFAULT 'Semester 1',
  year INTEGER NOT NULL DEFAULT 2026,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lecturer_id, unit_id, semester, year)
);

-- 2. Timetable overrides (temporary or permanent changes)
CREATE TABLE IF NOT EXISTS timetable_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timetable_id UUID REFERENCES timetable(id) ON DELETE CASCADE,
  override_type VARCHAR(20) NOT NULL CHECK (override_type IN ('temporary', 'permanent')),
  override_date DATE,                  -- for temporary: specific date affected
  new_venue_id UUID REFERENCES venues(id),
  new_day_of_week VARCHAR(10),
  new_start_time TIME,
  new_end_time TIME,
  reason TEXT NOT NULL,
  is_cancelled BOOLEAN DEFAULT false,  -- true = lecturer not attending, no new venue
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_overrides_timetable ON timetable_overrides(timetable_id);
CREATE INDEX IF NOT EXISTS idx_overrides_date ON timetable_overrides(override_date);
CREATE INDEX IF NOT EXISTS idx_lecturer_unit_reg ON lecturer_unit_registrations(lecturer_id);

-- 4. Enable RLS
ALTER TABLE lecturer_unit_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_lur" ON lecturer_unit_registrations FOR ALL USING (true);
CREATE POLICY "service_role_overrides" ON timetable_overrides FOR ALL USING (true);

-- ============================================================
-- DONE. Now run seed_data.sql if you haven't already.
-- ============================================================

-- ============================================================
-- Fix existing timetable entries to 3-hour slots
-- Maps old 2-hour blocks to their correct 3-hour slot
-- ============================================================
UPDATE timetable SET
  start_time = '07:00:00', end_time = '10:00:00'
WHERE start_time IN ('07:00:00','07:30:00','08:00:00','08:30:00')
  AND end_time NOT IN ('10:00:00','13:00:00','16:00:00','19:00:00');

UPDATE timetable SET
  start_time = '10:00:00', end_time = '13:00:00'
WHERE start_time IN ('09:00:00','09:30:00','10:00:00','10:30:00')
  AND end_time NOT IN ('10:00:00','13:00:00','16:00:00','19:00:00');

UPDATE timetable SET
  start_time = '13:00:00', end_time = '16:00:00'
WHERE start_time IN ('11:00:00','11:30:00','12:00:00','13:00:00','13:30:00')
  AND end_time NOT IN ('10:00:00','13:00:00','16:00:00','19:00:00');

UPDATE timetable SET
  start_time = '16:00:00', end_time = '19:00:00'
WHERE start_time IN ('14:00:00','14:30:00','15:00:00','16:00:00','16:30:00')
  AND end_time NOT IN ('10:00:00','13:00:00','16:00:00','19:00:00');

-- Remove duplicate timetable entries for the same unit+semester+year
-- Keep only the first entry per unit
DELETE FROM timetable
WHERE id NOT IN (
  SELECT DISTINCT ON (unit_id, semester, year) id
  FROM timetable
  ORDER BY unit_id, semester, year, created_at ASC
);
