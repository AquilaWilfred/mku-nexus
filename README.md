# MKU NEXUS — Smart Academic Platform

AI-powered campus management system for Mount Kenya University. Three separate portals (Student, Lecturer, Admin) with real-time AI assistant, live timetable, learning materials, disability accessibility appeals, and full admin dashboard.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd mku-nexus
npm install
```

### 2. Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) → Create new project
2. Go to **SQL Editor** → New query
3. Copy and paste the entire contents of `database/schema.sql`
4. Run the query — this creates all tables, indexes, seed data

### 3. Set Up Supabase Storage (for file uploads)

In your Supabase project:
1. Go to **Storage** → Create new bucket
2. Name it `materials`
3. Set it to **Public**

### 4. Configure Environment Variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 5. Create Admin User

In Supabase **SQL Editor**, run:

```sql
-- First generate a bcrypt hash of your password at: https://bcrypt-generator.com (rounds: 10)
INSERT INTO users (email, password_hash, full_name, role, staff_id, is_active) VALUES
('admin@mku.ac.ke', '$2a$10$YOUR_BCRYPT_HASH_HERE', 'System Administrator', 'admin', 'ADMIN001', true);
```

Or use the admin Users panel to create users once you're logged in.

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the portal selection page.

---

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database**: PostgreSQL via Supabase
- **Auth**: NextAuth.js with role-based 3 separate credential providers
- **AI**: Anthropic Claude API (claude-sonnet) with real-time DB context
- **Storage**: Supabase Storage (for uploaded materials)

### Portal URLs
| Portal | URL | Login |
|--------|-----|-------|
| Student | `/student/dashboard` | `/student/login` |
| Lecturer | `/lecturer/dashboard` | `/lecturer/login` |
| Admin | `/admin/dashboard` | `/admin/login` |

### Key Pages

**Student Portal**
- `/student/dashboard` — Overview, today's classes, AI chat
- `/student/timetable` — Full weekly timetable grid + list view
- `/student/units` — Enrolled units with schedules
- `/student/materials` — Learning materials (enrolled units only)
- `/student/events` — Campus events and announcements
- `/student/chat` — Full-screen AI assistant
- `/student/appeals` — Submit disability accommodation appeals
- `/student/notifications` — System notifications

**Lecturer Portal**
- `/lecturer/dashboard` — Teaching overview + AI chat
- `/lecturer/materials` — Upload PDFs, videos, images, text, links
- `/lecturer/events` — Post real-time announcements
- `/lecturer/appeals` — Review student disability appeals
- `/lecturer/chat` — AI assistant

**Admin Portal**
- `/admin/dashboard` — Full analytics dashboard with charts
- `/admin/users` — Manage all users and enrollments
- `/admin/timetable` — Add/manage timetable entries
- `/admin/venues` — Buildings and accessibility overview
- `/admin/appeals` — Final decision on accessibility appeals
- `/admin/training` — Train AI with semester data
- `/admin/chat` — AI assistant with full system access

---

## 🤖 AI System

The NEXUS AI is powered by Claude and trained **per semester** by admins.

**Real-time data it accesses:**
- Student's enrolled units + timetable
- Today's classes with venue and lecturer info
- Building accessibility (lift availability per floor)
- Live events and announcements
- Admin-uploaded semester training data

**Example queries:**
- *"Do I have class today?"* → Checks timetable, returns time, room, lecturer
- *"Quiz me on CS302"* → Generates quiz questions from unit topic
- *"Is the Science Complex accessible?"* → Checks lift/floor data
- *"What events are happening this week?"* → Real-time events
- *"I'm on crutches — how do I get to MAB-301?"* → Accessibility guidance

**Semester Training (Admin)**
1. Go to `/admin/training`
2. Either auto-sync from DB (pulls all active timetable + units)
3. Or manually upload JSON with curriculum data
4. Activate the training session → AI will use it for all queries

---

## 🗄️ Database Schema

Key tables:
- `users` — Admin, lecturers, students (with disability fields)
- `buildings` — `has_lift`, `floors`, `accessibility_notes`
- `venues` — Rooms with `floor_number`, `is_accessible`
- `units` — Courses with `semester`, `year`, `lecturer_id`
- `timetable` — Unit schedule with venue and day/time
- `enrollments` — Student ↔ Unit registrations
- `materials` — Files/text with `unit_id` (students see enrolled only)
- `events` — Announcements with `is_urgent`, `target_role`
- `disability_appeals` — Multi-step appeal workflow
- `chat_messages` — AI conversation history
- `ai_training_sessions` — Semester knowledge base
- `notifications` — Per-user notification inbox

---

## ♿ Accessibility Features

- **Building lift info** visible everywhere (timetable, venue search, AI)
- **AI accessibility awareness**: Always mentions if room is on upper floor with no lift
- **Disability appeal workflow**: Student → Lecturer review → Admin decision
- **AI guides disabled students** to accessible routes and venues
- Appeals tracked with status: `pending` → `under_review` → `approved/rejected`

---

## 📁 Project Structure

```
mku-nexus/
├── app/
│   ├── student/       # Student portal pages
│   ├── lecturer/      # Lecturer portal pages
│   ├── admin/         # Admin portal pages
│   ├── api/           # All API routes
│   └── welcome/       # Landing/portal selection
├── components/
│   ├── shared/        # Sidebar, ChatBot, SessionProvider
│   └── admin/         # Admin-specific components
├── lib/
│   ├── ai.ts          # Claude AI integration
│   ├── auth.ts        # NextAuth helpers
│   └── supabase.ts    # Supabase clients
├── types/             # TypeScript types
├── database/
│   └── schema.sql     # Complete DB schema + seed data
└── .env.example       # Environment variable template
```

---

## 🔐 Security

- Role-based auth: Each portal validates role before rendering
- Server-side sessions via NextAuth JWT
- Supabase service role key only used server-side
- Students can only access materials for enrolled units (enforced in API)
- RLS (Row Level Security) enabled on sensitive tables

---

## 💰 Cost Estimate

- **Supabase Free tier**: Up to 500MB storage, 50,000 rows → Free for small deployments
- **Anthropic API**: ~$0.003 per 1K tokens (claude-sonnet) → Very low cost per chat
- **Vercel deployment**: Free hobby tier works fine

For 500 students with 10 AI queries/day = ~$1–2/month in API costs.
