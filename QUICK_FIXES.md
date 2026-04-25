# QUICK ACTION ITEMS - MKU NEXUS AUDIT

## 🔴 CRITICAL - Do First

### 1. Delete Empty File
```bash
rm components/shared/route.ts
```
- This is a completely empty orphaned file from refactoring

### 2. Fix Database Mismatches
**Problem**: Code references `courses` table that doesn't exist in schema

**Affected Files**:
- `lib/registrationNumber.ts` (Line 45)
- `lib/ai.ts` (Line 244) 
- `app/api/courses/route.ts` (Lines 11-12)

**Action**: Choose one:
- Option A: Create `courses` table in database
- Option B: Replace all `courses` references with `units` table

**Priority**: CRITICAL - Student registration will fail without this fix

### 3. Verify Database Schema
Run migration files in order:
```bash
# Check which migrations have been applied
# Then run missing ones:
# migration_v6.sql
# migration_v7_polls.sql  
# migration_v8.sql
# migration_v9_grades.sql
```

**Verify these tables exist**:
- [ ] courses (or decide to use units instead)
- [ ] login_sessions
- [ ] polls
- [ ] poll_options
- [ ] timetable_overrides
- [ ] chat_messages
- [ ] material_chunks

---

## 🟠 HIGH PRIORITY - This Sprint

### 4. Remove Unused Dependencies
```bash
npm remove react-dropzone
npm remove xml2js
npm run build
```

**Dependencies to remove** (never imported, only in package.json):
- `react-dropzone` - Not used anywhere
- `xml2js` - Not used anywhere

**Verification**: 
- No imports found in entire codebase
- Safe to remove without breaking anything

### 5. Fix CSS Linting Errors in ChatBot Component
**File**: `components/shared/ChatBot.tsx`  
**Issue**: 16 instances of inline CSS styles

**Lines with errors**: 57, 71, 81, 102, 135, 142, 288, 290, 295, 318, 325, 343, 361, 374, 376, 390, 408, 418, 428

**Fix Strategy**:
```tsx
// ❌ Current (Wrong)
<span style={{ color: '#1a237e' }}>Text</span>

// ✅ Fixed (Right)  
<span className="text-blue-900">Text</span>
```

**Action**: Create CSS utility classes in `globals.css` for colors:
```css
.text-nexus-primary { color: #1a237e; }
.text-nexus-purple { color: #6a1b9a; }
.border-nexus-light { border-color: #e0e0ef; }
```

### 6. Add Missing TypeScript Compiler Option
**File**: `tsconfig.json`

**Add this**:
```json
{
  "compilerOptions": {
    "forceConsistentCasingInFileNames": true
  }
}
```

---

## 🟡 MEDIUM PRIORITY - Next Sprint

### 7. Optimize Database Queries
**Slow pattern found in**:
- `lib/ai.ts` - buildSystemPrompt() function
- `app/api/units/enrolled/route.ts`

**Issue**: Multiple round-trips to database (N+1 queries)

**Example to Fix**:
```typescript
// 🐢 SLOW (Wrong)
const enrollments = await supabaseAdmin.from('enrollments').select('*')
for (const e of enrollments) {
  const unit = await supabaseAdmin.from('units').select('*').eq('id', e.unit_id).single()
}

// 🚀 FAST (Right)
const enrollments = await supabaseAdmin
  .from('enrollments')
  .select('*, units(*)')
```

---

## SUMMARY TABLE

| Item | File | Type | Fix Time |
|------|------|------|----------|
| Empty orphaned file | `components/shared/route.ts` | Delete | 1 min |
| Broken courses table | Multiple files | Database | 30 min |
| Verify schema | database/*.sql | Database | 15 min |
| Remove unused deps | package.json | Npm | 5 min |
| ChatBot CSS fixes | ChatBot.tsx | Refactor | 45 min |
| TypeScript config | tsconfig.json | Config | 2 min |
| Query optimization | lib/ai.ts, api routes | Refactor | 2-3 hrs |
| **TOTAL** | | | **4-5 hours** |

---

## CHECKLIST

### Pre-Deployment
- [ ] Delete empty `route.ts` file
- [ ] Resolve courses vs units table issue
- [ ] Run database migrations
- [ ] Remove unused dependencies
- [ ] Fix ChatBot CSS issues
- [ ] Update TypeScript config
- [ ] Test full build: `npm run build`
- [ ] Verify no errors: `npm run lint`

### Post-Deployment
- [ ] Test student registration
- [ ] Test timetable functionality
- [ ] Test chat with AI
- [ ] Test role-based access
- [ ] Monitor database performance

---

## QUICK COMMAND REFERENCE

```bash
# Full audit build and test
npm run build
npm run lint

# Remove unused packages
npm remove react-dropzone xml2js

# Test without building
npm run dev

# Check for type errors
npx tsc --noEmit
```

---

## FILES TO REVIEW THIS WEEK

1. **CRITICAL**: 
   - `lib/registrationNumber.ts` 
   - `lib/ai.ts`
   - `app/api/courses/route.ts`

2. **HIGH**:
   - `components/shared/ChatBot.tsx`
   - `tsconfig.json`

3. **MEDIUM**:
   - `app/api/units/enrolled/route.ts`
   - Database schema files

---

**Status**: Ready for implementation  
**Est. Completion**: 1-2 days  
**Next Review**: After critical fixes applied
