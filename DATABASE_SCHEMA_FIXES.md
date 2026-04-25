# DATABASE SCHEMA REMEDIATION GUIDE

## Overview
The codebase references tables that may not exist in the current database schema. This guide helps identify and fix these mismatches.

---

## CRITICAL: Tables Referenced in Code But Missing from schema.sql

### 1. `courses` Table ⚠️ **CRITICAL**

**Referenced in**:
- `lib/registrationNumber.ts` line 45-46
- `lib/ai.ts` line 244
- `app/api/courses/route.ts` line 11-12, 34-35

**Current Code**:
```typescript
// registrationNumber.ts
const { data: course } = await supabaseAdmin
  .from('courses')
  .select('code')
  .eq('id', courseId)
  .single()
```

**Issue**: `courses` table doesn't exist in schema.sql

**Solution Options**:

#### Option A: Create `courses` table (if you need it separate from `units`)
```sql
-- Add to database/migration_v10.sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  department_id UUID REFERENCES departments(id),
  description TEXT,
  year_start INTEGER,
  year_end INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key to users table for student's course
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id);
```

#### Option B: Use `units` table instead (Recommended)
```typescript
// registrationNumber.ts - CHANGE THIS
const { data: course } = await supabaseAdmin
  .from('units')  // Changed from 'courses'
  .select('code')
  .eq('id', courseId)
  .single()
```

**Recommendation**: **Option B** - Use `units` table since it already has `code` field

---

### 2. `login_sessions` Table

**Referenced in**:
- `lib/authOptions.ts` line 82 (insert)
- `lib/authOptions.ts` line 134 (update)

**Current Schema Definition Missing**

**Create Table SQL**:
```sql
CREATE TABLE login_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  login_at TIMESTAMPTZ DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_sessions_user_id ON login_sessions(user_id);
CREATE INDEX idx_login_sessions_active ON login_sessions(is_active);
```

---

### 3. `polls` Table

**Referenced in**:
- `lib/ai.ts` lines 234, 294, 350
- Various lecturer/student pages

**Create Table SQL**:
```sql
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  question VARCHAR(500) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  allow_multiple_answers BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_polls_unit_id ON polls(unit_id);
```

---

### 4. `poll_options` Table

**Referenced in**:
- `lib/ai.ts` line 235, 295, 351

**Create Table SQL**:
```sql
CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_text VARCHAR(255) NOT NULL,
  votes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_poll_options_poll_id ON poll_options(poll_id);
```

---

### 5. `timetable_overrides` Table

**Referenced in**:
- `lib/ai.ts` lines 223, 276, 344

**Create Table SQL**:
```sql
CREATE TABLE timetable_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timetable_id UUID REFERENCES timetable(id) ON DELETE CASCADE,
  override_type VARCHAR(50) CHECK (override_type IN ('venue_change', 'cancellation', 'time_change')),
  new_venue_id UUID REFERENCES venues(id),
  reason TEXT,
  created_by UUID REFERENCES users(id),
  effective_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timetable_overrides_timetable_id ON timetable_overrides(timetable_id);
```

---

### 6. `chat_messages` Table

**Referenced in**:
- `lib/ai.ts` lines 549, 588, 598-599
- `app/api/chat/route.ts` line 65-66

**Create Table SQL**:
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
```

---

### 7. `material_chunks` Table (For RAG)

**Referenced in**:
- `lib/rag.ts` line 47

**Create Table SQL**:
```sql
CREATE TABLE material_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  chunk_index INTEGER,
  chunk_text TEXT NOT NULL,
  embedding vector(768),  -- For pgvector extension
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_material_chunks_material_id ON material_chunks(material_id);
```

**Note**: Requires pgvector extension for embeddings

---

### 8. `forum_posts` Table (If Forums Feature Used)

**Referenced in**:
- Various forum pages
- `app/api/forums/[id]/posts/route.ts`

**Create Table SQL**:
```sql
CREATE TABLE forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forum_id UUID REFERENCES forums(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE forums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 9. `help_requests` Table

**Referenced in**:
- `app/api/help/` routes
- Admin help management pages

**Create Table SQL**:
```sql
CREATE TABLE help_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(50),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_response TEXT,
  responded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_help_requests_user_id ON help_requests(user_id);
CREATE INDEX idx_help_requests_status ON help_requests(status);
```

---

### 10. `venue_requests` Table

**Referenced in**:
- `app/api/venue-requests/` routes
- Venue request management

**Create Table SQL**:
```sql
CREATE TABLE venue_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecturer_id UUID REFERENCES users(id),
  unit_id UUID REFERENCES units(id),
  timetable_id UUID REFERENCES timetable(id),
  requested_venue_id UUID REFERENCES venues(id),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_venue_requests_lecturer_id ON venue_requests(lecturer_id);
CREATE INDEX idx_venue_requests_status ON venue_requests(status);
```

---

### 11. `activation_requests` Table

**Referenced in**:
- `app/api/activation-request/route.ts`

**Create Table SQL** (Should already exist):
```sql
CREATE TABLE IF NOT EXISTS activation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## IMPLEMENTATION STEPS

### Step 1: Check Current State
```sql
-- Run in Supabase SQL Editor to see what exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Step 2: Create Missing Tables
1. Create a new migration file: `database/migration_v10_missing_tables.sql`
2. Copy all missing table definitions from above
3. Run migration in Supabase SQL Editor
4. Verify tables are created

### Step 3: Update Foreign Keys
After creating new tables, update these columns in `users` table if needed:
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id);
```

### Step 4: Test Application
```bash
npm run dev
# Test:
# - Student registration (uses registrationNumber.ts)
# - Chat functionality (uses chat_messages)
# - Polls (if feature exists)
# - Help requests (if feature exists)
```

---

## DECISION MATRIX: courses vs units

| Aspect | `courses` | `units` |
|--------|-----------|---------|
| **Size** | Many units per course | One-to-one mapping |
| **Use in code** | Only registrationNumber.ts | Widely used (50+ queries) |
| **Already in schema** | ❌ No | ✅ Yes |
| **Existing data** | Unknown | Unknown |
| **Refactor effort** | Low | Medium |
| **Recommendation** | Only if needed | **USE THIS** |

**RECOMMENDATION**: Use `units` table and remove `courses` references.

---

## QUICK SQL SCRIPT TO RUN

Save as `database/migration_v10_schema_fixes.sql`:

```sql
-- ============================================
-- MKU NEXUS: Schema Fixes & Missing Tables
-- ============================================

-- 1. Create login_sessions
CREATE TABLE IF NOT EXISTS login_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  login_at TIMESTAMPTZ DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_sessions_user_id ON login_sessions(user_id);

-- 2. Create polls and poll_options
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  question VARCHAR(500) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_polls_unit_id ON polls(unit_id);

CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_text VARCHAR(255) NOT NULL,
  votes_count INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);

-- 3. Create timetable_overrides
CREATE TABLE IF NOT EXISTS timetable_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timetable_id UUID REFERENCES timetable(id) ON DELETE CASCADE,
  override_type VARCHAR(50),
  new_venue_id UUID REFERENCES venues(id),
  reason TEXT,
  created_by UUID REFERENCES users(id),
  effective_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_timetable_overrides_timetable_id ON timetable_overrides(timetable_id);

-- 4. Create chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- 5. Create material_chunks (for RAG)
CREATE TABLE IF NOT EXISTS material_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  chunk_index INTEGER,
  chunk_text TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_material_chunks_material_id ON material_chunks(material_id);

-- Run verification query
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN 
('login_sessions', 'polls', 'poll_options', 'timetable_overrides', 'chat_messages', 'material_chunks')
ORDER BY table_name;
```

---

## VALIDATION CHECKLIST

After running migrations:
- [ ] All 10+ tables created successfully
- [ ] All indexes created
- [ ] Foreign keys properly configured
- [ ] Application builds without errors
- [ ] Student registration works
- [ ] Chat functionality works
- [ ] No database connection errors in logs

---

## TROUBLESHOOTING

### Error: "relation does not exist"
- **Cause**: Table not created or migration not run
- **Fix**: Check migration file exists and run it in Supabase

### Error: "foreign key constraint fails"
- **Cause**: Referenced table/column doesn't exist
- **Fix**: Create parent table first, then child table

### Application still fails after creating tables
- **Check**: 
  - Migrations ran in correct order
  - All tables appear in `information_schema.tables`
  - No typos in table/column names
  - Supabase RLS policies don't block access

---

**Status**: Ready to implement  
**Estimated Time**: 30 minutes  
**Risk Level**: Low (adding tables, not modifying existing data)
