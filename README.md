# ⚡ RosterFlow — Smart Workforce & Operations Management

> A production-grade web application for managing employee rosters, brands, processes, pods, tasks, leave, and scheduling — built as a technical internship assessment.

[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Tests](https://img.shields.io/badge/tests-13%20passed-brightgreen)]()
[![Stack](https://img.shields.io/badge/stack-React%20%2B%20Supabase-blue)]()
[![License](https://img.shields.io/badge/license-MIT-lightgrey)]()

---

## 📋 Problem Statement

Operations companies managing multiple brands, processes, and 30+ employees across pods face a core scheduling problem: generating a monthly roster that satisfies mandatory constraints (approved leaves, comp-offs, weekly offs, holiday rules, minimum staffing), while identifying coverage gaps instantly and notifying employees of schedule changes via email.

Spreadsheet-based rosters cannot detect conflicts, cannot automatically redistribute work when an employee is unavailable, and cannot notify employees. RosterFlow solves all of this.

---

## ✨ Features

### Core
- **Dashboard** — Real-time statistics, today's workforce status, pending leaves, coverage warnings, recent activity
- **Roster Engine** — Deterministic rule-based scheduling algorithm generating monthly rosters with conflict detection
- **Coverage & Conflicts** — Automatic detection of coverage gaps, understaffing, and scheduling violations
- **Manual Override** — Manager can edit any cell; re-validation runs automatically after changes

### People Management
- **Employee Management** — Full CRUD, pod assignment, brand/process assignments, weekly off configuration
- **Pod & Team Management** — Pod leads, member assignments, pod-level statistics
- **Brand Management** — 10 brands with configurable operating rules (365-day, Sunday off, holiday rules)
- **Process Management** — CS, ACC, NDR, Retention, Order Management per brand, with min staffing

### Scheduling
- **Leave Management** — Request, approve, reject; automatic roster revalidation on approval
- **Comp-Off Management** — Track earned and assigned comp-offs, auto-block dates
- **Holiday Management** — National/regional/company holidays with per-brand override rules
- **Weekly Off Rules** — Configurable primary + secondary weekly off per employee

### Collaboration
- **Task Management** — Assign tasks with priority, due dates, brands/processes; track completion
- **In-App Notifications** — Real-time notification center with unread counts
- **Email Notifications** — Resend-powered emails for task assignment, leave decisions, roster publish

### Auth & Security
- **4 Roles** — Admin, Operations Manager, Pod Lead, Employee
- **Row Level Security** — Every table protected with Supabase RLS policies
- **No secrets in frontend** — Email keys live only in Edge Function environment

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 + custom design system |
| Routing | React Router v7 |
| Server State | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| State | Zustand |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Email | Resend API (via Supabase Edge Function) |
| Testing | Vitest + jsdom |
| Deployment | Vercel (frontend) + Supabase (backend) |

---

## 🗄️ Database Schema Overview

```
profiles          → Linked to auth.users; stores role, name, phone
pods              → Operational pods with pod_lead_id → employees
brands            → Brands with operating calendar rules
processes         → Processes per brand with staffing requirements
employees         → Full employee record with weekly_off_day
employee_brand_assignments    → Many-to-many: employees ↔ brands
employee_process_assignments  → Many-to-many: employees ↔ processes
pod_brand_assignments         → Many-to-many: pods ↔ brands
holidays          → Public/company holidays
brand_holiday_rules           → Per-brand holiday override rules
leave_requests    → Employee leave with approval workflow
comp_offs         → Earned and assigned comp-off tracking
roster_periods    → Monthly roster (draft → published → archived)
roster_entries    → Per-employee, per-day schedule status
scheduling_conflicts → Detected conflicts with severity + suggestion
tasks             → Assigned tasks with priority and status
task_comments     → Comments on tasks
notifications     → In-app notification records
email_logs        → Email delivery audit log
activity_logs     → System-wide audit trail
app_settings      → Key-value configuration store
```

**Key design decisions:**
- UUID primary keys throughout
- `updated_at` auto-maintained via trigger on all mutable tables
- Many-to-many relationships via proper junction tables (never comma-separated strings)
- RLS enabled on all tables; policies enforce role-based access

---

## 🧠 Scheduling Algorithm

The scheduler (`src/lib/scheduler.ts`) is a **deterministic, rule-based greedy algorithm** with three passes:

### Pass 1 — Mark Unavailability
For every employee × every date:
- If the employee has an **approved leave** covering that date → mark `leave`
- If the employee has an **assigned comp-off** on that date → mark `comp_off`
- Both are **hard constraints** — they cannot be overridden

### Pass 2 — Assign Coverage
For every active brand → every active process → every date:
1. Check if brand is operational on this date (respects `operates_365`, `operates_on_sundays`, `operates_on_holidays`, per-brand holiday rules)
2. Check if process is operational on this date
3. Find eligible employees (assigned to this process, `active`, not on leave, not on comp-off, not on weekly-off)
4. Sort by fewest working days this month → **fair distribution**
5. Assign the first `min_daily_staff` eligible employees as `working`
6. If `available < required` → record a `SchedulingConflict` with severity `critical` (zero) or `warning` (partial)

### Pass 3 — Fill Gaps
Any employee/date without an entry yet gets:
- `public_holiday` if the date is in the holidays list
- `weekly_off` if the date matches their configured weekly off day(s)
- `not_required` otherwise

### Mandatory vs Soft Constraints

| Constraint | Type | Behaviour |
|-----------|------|-----------|
| Approved leave | **Mandatory** | Never scheduled as working |
| Assigned comp-off | **Mandatory** | Never scheduled as working |
| Brand not operational | **Mandatory** | No slot created |
| Weekly off preference | **Soft** | Respected unless employee is the only resource |
| Fair distribution | **Soft** | Best-effort via sort |

### Explainability
Every assignment produces an explanation:
> *"Priya was assigned to GlowCart CS on 2026-11-12 because: required coverage, assigned to process, available, selected for fair distribution (8 days this month)."*

---

## 🔍 Conflict Detection

`validateRoster()` scans all `working` entries and flags:

| Conflict | Severity | Trigger |
|---------|----------|---------|
| Employee on approved leave but marked working | Critical | Leave dates overlap entry date |
| Employee on weekly-off day but marked working | Warning | Weekly off day matches date's day-of-week |
| Employee on comp-off but marked working | Critical | CompOff.assigned_date === entry date |
| Working on public holiday | Info | Date in holidays list |
| No coverage for required slot | Critical | zero available employees |
| Understaffed slot | Warning | available < min_daily_staff |

Conflicts are stored in `scheduling_conflicts` and surfaced on the Coverage & Conflicts page with suggested actions.

---

## 📧 Email Notification Workflow

```
Manager action (approve leave, assign task, publish roster)
  ↓
Frontend calls supabase.functions.invoke('send-email', payload)
  ↓
Edge Function (supabase/functions/send-email/index.ts)
  ↓
Checks RESEND_API_KEY env var
  ↓ (configured)              ↓ (not configured)
POST resend.com/emails    Log "skipped" to email_logs
  ↓                           ↓
Record in email_logs      App still works normally
(status: 'sent'/'failed')
```

**Safety guardrails:**
- API key stored only as Supabase Edge Function secret — never in frontend bundle
- Demo email addresses (`.demo`, `example.com`) are silently skipped
- Failed sends are logged with error message — no silent failures

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+
- Supabase account (free tier works)
- Resend account (optional — app works without it)

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/smart-roster-management-system.git
cd smart-roster-management-system/rosterflow
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

`.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=http://localhost:5173
```

### 3. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in the Supabase Dashboard
3. Run the migration:
```sql
-- Copy and run: supabase/migrations/001_initial_schema.sql
```
4. Run seed data:
```sql
-- Copy and run: supabase/seed.sql
```
5. Go to **Authentication → Users** and create 4 demo users:
   - `admin@rosterflow.demo` / `demo123456` → role: `admin`
   - `manager@rosterflow.demo` / `demo123456` → role: `operations_manager`
   - `podlead@rosterflow.demo` / `demo123456` → role: `pod_lead`
   - `employee@rosterflow.demo` / `demo123456` → role: `employee`
6. After creating each user, run in SQL Editor:
```sql
INSERT INTO profiles (id, email, full_name, role) VALUES
  ('<user-id-from-auth>', 'admin@rosterflow.demo', 'Admin User', 'admin');
```

### 4. Run Locally
```bash
npm run dev
# → http://localhost:5173
```

### 5. Run Tests
```bash
npm test
# 13 tests, all passing
```

---

## 📧 Resend Email Setup (Optional)

1. Create account at [resend.com](https://resend.com)
2. Add and verify your domain
3. Generate an API key
4. In Supabase Dashboard → **Edge Functions → Secrets**:
   ```
   RESEND_API_KEY = re_your_key_here
   EMAIL_FROM = RosterFlow <noreply@yourdomain.com>
   APP_URL = https://your-app.vercel.app
   ```
5. Deploy the Edge Function:
   ```bash
   supabase functions deploy send-email
   ```
6. Use **Settings → Email Configuration → Send Test Email** to verify

> **Without Resend configured:** The app works fully. Email sends are logged as "skipped" in the email_logs table. No errors are shown to users.

---

## 🌐 Deployment (Vercel + Supabase)

### Frontend → Vercel
```bash
npm run build          # Verify build passes
# Push to GitHub, then:
# Vercel Dashboard → Import repo → Set env vars → Deploy
```

Required Vercel environment variables:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_APP_URL
```

### Database → Supabase (already hosted)
No additional deployment — Supabase is a managed service.

### Edge Functions → Supabase
```bash
supabase login
supabase link --project-ref your-project-ref
supabase functions deploy send-email
supabase secrets set RESEND_API_KEY=re_xxx EMAIL_FROM="..." APP_URL="https://..."
```

---

## 🎭 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rosterflow.demo | demo123456 |
| Operations Manager | manager@rosterflow.demo | demo123456 |
| Pod Lead | podlead@rosterflow.demo | demo123456 |
| Employee | employee@rosterflow.demo | demo123456 |

---

## 🧪 Test Results

```
✓ tests/scheduler.test.ts (13 tests) 24ms
  ✓ should not schedule employee on approved leave as working
  ✓ should respect employee weekly off day
  ✓ should detect coverage gap for 365-day brand on Sunday with no available employee
  ✓ should not require coverage on holiday if brand does not operate on holidays
  ✓ should detect critical coverage gap for single-resource brand when employee is on leave
  ✓ should maintain coverage when second employee is available
  ✓ should detect understaffed when min_daily_staff is 2 but only 1 available
  ✓ should not schedule employee as working on comp-off day
  ✓ mandatory constraint: leave takes priority over working requirement
  ✓ should generate an entry for every employee for every day
  ✓ should flag employee working while on approved leave (validateRoster)
  ✓ should warn when employee is working on weekly off day (validateRoster)
  ✓ should flag employee working on comp-off day (validateRoster)

Test Files: 1 passed
Tests:      13 passed ✓
```

---

## 🏗️ Architecture

```
rosterflow/
├── src/
│   ├── App.tsx                      # Routes + auth guard
│   ├── main.tsx                     # Entry point
│   ├── index.css                    # Tailwind + design system
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx          # Collapsible nav
│   │   │   ├── Header.tsx           # Top bar + user menu
│   │   │   └── AppLayout.tsx        # Shell (sidebar + header + outlet)
│   │   └── shared/
│   │       ├── Toast.tsx            # Context-based toast system
│   │       ├── Modal.tsx            # Reusable modal + ConfirmDialog
│   │       ├── EmptyState.tsx       # Empty state widget
│   │       └── LoadingSpinner.tsx   # Skeletons + loaders
│   ├── pages/
│   │   ├── Dashboard.tsx            # Stats, today's status, activity
│   │   ├── Employees.tsx            # Full CRUD employee management
│   │   ├── Brands.tsx               # Brand + process management (tabs)
│   │   ├── Pods.tsx                 # Pod cards + member management
│   │   ├── Roster.tsx               # Roster grid + scheduler integration
│   │   ├── Tasks.tsx                # Task management + completion
│   │   ├── Leave.tsx                # Leave requests + approval workflow
│   │   ├── Holidays.tsx             # Holiday calendar management
│   │   ├── Coverage.tsx             # Conflict viewer + revalidation
│   │   ├── Notifications.tsx        # In-app notification center
│   │   ├── Settings.tsx             # Email/app/user configuration
│   │   └── LoginPage.tsx            # Auth + demo account selector
│   ├── lib/
│   │   ├── scheduler.ts             # 🧠 Core scheduling engine
│   │   ├── supabase.ts              # Supabase client
│   │   └── utils.ts                 # Helpers, color maps, formatters
│   ├── store/
│   │   └── authStore.ts             # Zustand auth state
│   ├── services/
│   │   └── notifications.ts         # In-app + email notification helpers
│   └── types/
│       └── database.ts              # Full TypeScript type definitions
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql   # Complete DB schema + RLS
│   ├── seed.sql                     # 30 employees, 10 brands, sample data
│   └── functions/
│       └── send-email/
│           └── index.ts             # Deno Edge Function (Resend)
├── tests/
│   ├── setup.ts
│   └── scheduler.test.ts            # 13 unit tests
├── .env.example
├── .gitignore
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## 📐 Assessment Q&A

**1. How did you model employees, brands, processes, pods and relationships?**

Each entity has its own normalized table. Many-to-many relationships (employees↔brands, employees↔processes, pods↔brands) use explicit junction tables (`employee_brand_assignments`, `employee_process_assignments`, `pod_brand_assignments`). An employee can belong to multiple brands and processes simultaneously. No comma-separated strings or JSON arrays for relational data.

**2. How does the system generate a roster and determine whether constraints are satisfied?**

The `RosterScheduler` class runs a 3-pass algorithm: (1) mark unavailable employees from leaves/comp-offs, (2) for each required brand/process/date slot, find eligible & available employees and assign greedily by fewest working days, (3) fill remaining slots with public_holiday/weekly_off/not_required. Constraints are checked as filters — an employee failing any hard constraint is excluded from the eligible pool for that slot.

**3. How did you handle single-resource brands and multi-employee brands?**

Both are handled identically by the algorithm. If `min_daily_staff = 1` and only one employee is assigned to the process, that employee is selected. If they are unavailable, a `critical` conflict is raised. For multi-employee brands, the algorithm assigns up to `min_daily_staff` employees sorted by fairness, and raises a `warning` if fewer than required are available.

**4. What happens when an employee managing all processes for a brand is unavailable?**

The scheduler detects that zero eligible employees exist for the required slot and records a `critical` conflict: "No coverage for BrandX — ProcessY on YYYY-MM-DD". The suggested action lists all assigned employees and their current unavailability reason. The roster is marked with the conflict and cannot be published without an explicit manager override acknowledgment.

**5. How does the system handle conflicting requirements or insufficient staffing?**

Conflicts are recorded (never hidden) with severity, affected brand/process/date, and a suggested action. The roster is generated with the best possible coverage and all unresolved issues listed. The manager must review conflicts before publishing. The UI refuses to publish silently if critical conflicts exist.

**6. Which parts are automated and which remain under human control? Why?**

Automated: slot identification, eligibility filtering, greedy assignment, conflict detection, email dispatch, notification creation. Human: leave approval (requires managerial judgment), roster publish (requires conflict review), manual overrides (business context the algorithm lacks), comp-off decisions. This boundary is intentional — mandatory business decisions need a human signature.

**7. If the company doubled in size, what would you change?**

Switch from greedy to a constraint-satisfaction solver (e.g., OR-Tools) for better optimality at scale. Add database-level scheduling via PostgreSQL functions instead of client-side computation. Implement roster caching and incremental revalidation rather than full regeneration. Add team-level shift patterns.

**8. What would you improve given one additional week?**

(a) Drag-and-drop roster editing grid, (b) bulk employee import from CSV, (c) roster export to Excel/PDF, (d) shift pattern templates, (e) manager announcement email with preview, (f) employee self-service comp-off requests, (g) mobile-responsive roster view.

---

## ⚠️ Limitations

- Scheduling runs client-side (suitable for ≤100 employees; larger deployments should move to Edge Function)
- No offline support
- Email delivery depends on Resend account and domain verification
- Demo auth users must be manually created in Supabase Auth dashboard

---

## 📄 License

MIT © 2026 RosterFlow
