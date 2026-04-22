# Student Unit Management System - Color-Coded Implementation

## Overview
Students can now see their complete course curriculum with color-coded units based on enrollment and completion status. This provides a clear visual representation of academic progress and available units to enroll in.

## Color Coding System

### 🔵 Blue - All Course Units (Not Taken)
- Units that exist in the curriculum but the student hasn't enrolled in yet
- Student can enroll in these units
- Shows as "Available" in the status badge

### 🟡 Yellow - In Progress
- Units the student is currently enrolled in
- Enrollment status: `active`
- Grade: `status = 'in_progress'` (or no grade yet)
- Student can drop these units
- Shows as "In Progress" in the status badge

### 🟢 Green - Completed (Pass)
- Units the student has completed with a passing grade
- Grade: `status = 'completed_pass'`
- Score and grade letter visible (e.g., "85/100 (A)")
- Not available for re-enrollment (unless retake allowed)
- Shows as "Completed (Pass)" in the status badge

### 🔴 Red - Failed/Retake
- Units the student failed and needs to retake
- Grade: `status = 'completed_fail'` or `status = 'retake'`
- Shows the score and grade (e.g., "45/100 (F)")
- Student can click "Retake" button to re-enroll
- Shows as "Need Retake" or "Failed" in the status badge

### ⚪ Gray - Grade Pending
- Units completed but grade not yet released
- Grade: `status = 'completed_defer'`
- No score or letter grade visible yet
- Shows as "Grade Pending" in the status badge

## Database Schema

### New Table: `grades`
```sql
CREATE TABLE grades (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES users(id),
  unit_id UUID REFERENCES units(id),
  score NUMERIC(5,2),           -- 0-100
  grade_letter VARCHAR(2),       -- A, B, C, D, E, F
  status VARCHAR(20),            -- in_progress | completed_pass | completed_fail | completed_defer | retake
  result_released_at TIMESTAMPTZ, -- When grade was released
  marked_by UUID REFERENCES users(id),
  notes TEXT,
  UNIQUE(student_id, unit_id)
);
```

### Updated: `enrollments` Table
- Added optional column: `current_status` (in_progress | completed | dropped | failed)
- Retains existing structure for backward compatibility

## Features Implemented

### 1. Complete Curriculum View
- Students see ALL units for their course (across all years)
- Units are organized by year of study (Year 1, Year 2, etc.)
- Search by unit code or name
- Filter by year of study

### 2. Grade Tracking
- View final scores and letter grades for completed units
- See date grades were released
- Status indicators for pending/released grades

### 3. Enrollment & Retake Management
- Enroll in blue units ("+ Enroll" button)
- Drop yellow units ("✕ Drop" button)
- Retake red units ("🔄 Retake" button)

### 4. Smart Enrollment Logic
- **Retake Logic**: When a student fails a unit, they can re-enroll using the same enrollment record
- The system checks for previous enrollments (dropped/completed)
- If previous enrollment exists for a failed unit, it updates status to 'active'
- Capacity checking before enrollment

### 5. Enhanced Unit Cards
- Status badge with color and label
- Credit count and requirement indicators
- Lecturer name
- Timetable information (day, time, venue)
- Expandable details (description, full schedule)
- Grade information when available

## API Endpoints

### GET `/api/units/available`
**Query Parameters:**
- `course_id` (required): Student's course ID

**Response Fields (per unit):**
```json
{
  "id": "uuid",
  "code": "CS101",
  "name": "Unit Name",
  "status_color": "blue|yellow|green|red|gray",
  "status_label": "Available|In Progress|Completed (Pass)|Need Retake|Grade Pending",
  "enrollment_status": "active|null",
  "grade": {
    "score": 85,
    "grade_letter": "A",
    "status": "completed_pass",
    "result_released_at": "2026-02-15T10:00:00Z"
  },
  "can_enroll": true,
  "can_retake": false,
  "year_of_study": 1,
  "credits": 3,
  "timetable": [...]
}
```

### GET `/api/units/enrolled`
Returns only active enrollments with grade information attached.

### POST `/api/enrollments`
**Supports:**
- Initial enrollment in blue units
- Retakes for red (failed) units

### DELETE `/api/enrollments`
Drops a unit (changes status from 'active' to 'dropped').

## User Flows

### Initial Enrollment Flow
1. Student registers a course
2. Views "Browse & Register" tab
3. Sees all units in curriculum (mostly blue)
4. Clicks "+ Enroll" on desired unit
5. Unit becomes yellow (In Progress)
6. Unit appears in "Enrolled" tab

### Retake Flow
1. Student sees failed unit (red - "Need Retake")
2. Clicks "🔄 Retake" button
3. System re-activates the enrollment
4. Unit returns to yellow (In Progress) status
5. Student can attend classes and be reassessed

### Grade Release Flow
1. Unit is gray ("Grade Pending") after completion
2. Lecturer marks enrollments with grades
3. Grade status changes to `completed_pass` or `completed_fail`
4. Unit becomes green or red accordingly
5. Score and letter grade become visible to student

## Migration & Setup

### Step 1: Run Migration v9
Execute the migration file to create the grades table:
```bash
# In Supabase SQL Editor or psql:
psql -U postgres -d your_db -f database/migration_v9_grades.sql
```

### Step 2: Seed Sample Grades (Optional)
Uncomment the sample data section in migration to add test grades.

### Step 3: Update Lecturer Panel
Lecturers can mark enrollments with grades through admin interface (feature to be implemented separately).

## Testing Checklist

- [ ] Student can view all course units
- [ ] Blue units show "Available" status
- [ ] Yellow units show "In Progress"
- [ ] Green units show "Completed (Pass)" with score
- [ ] Red units show "Need Retake" with score
- [ ] Gray units show "Grade Pending"
- [ ] Can enroll in blue unit → becomes yellow
- [ ] Can drop yellow unit → becomes blue
- [ ] Can retake red unit → becomes yellow
- [ ] Unit capacity is enforced
- [ ] Timetable displays correctly
- [ ] Search and filter work
- [ ] Expand/collapse unit details

## Future Enhancements

1. **Lecturer Grade Entry Interface**
   - Bulk mark grades for a unit
   - Release grades all at once
   - Add notes for each student

2. **Academic Standing**
   - Automatic degree audit
   - Prerequisites enforcement
   - Co-requisite warnings

3. **Progress Dashboard**
   - GPA calculation
   - Completion percentage
   - Remaining credits needed
   - Graduation timeline

4. **Analytics**
   - Unit difficulty trends
   - Pass/fail rates
   - Time to completion stats

## Code Files Modified

1. `/database/migration_v9_grades.sql` - New migration
2. `/app/api/units/available/route.ts` - Updated to support color coding
3. `/app/api/units/enrolled/route.ts` - Updated to include grades
4. `/app/api/enrollments/route.ts` - Enhanced retake logic
5. `/app/student/units/page.tsx` - Complete UI redesign with color coding
