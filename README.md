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

# Tell Us How I Think

### 1. How did you model employees, brands, processes, pods, and their relationships?

I kept employees, brands, processes, and pods as separate entities instead of combining everything into one table. An employee can be associated with one or more brands or processes, and a brand can have multiple processes with different staffing requirements. Pods help organize employees into teams and provide a way to manage roster operations at a team level. I used these relationships to make the system flexible enough to handle different team structures without duplicating employee data.

### 2. How does your system generate a roster and determine whether it satisfies the required constraints?

The roster generator considers the selected month, employee assignments, working calendars, weekly offs, holidays, approved leaves, and staffing requirements. It generates assignments based on employee availability and the coverage required for each brand or process. After generation, the system validates the roster and identifies issues such as uncovered processes, insufficient staffing, or employees being assigned on unavailable days. The manager can review the generated roster, make changes, and validate it again before publishing.

### 3. How did you handle the difference between single-resource brands and brands with multiple employees?

I handled these two cases differently because their staffing requirements are not the same. For single-resource brands, the assigned employee is primarily responsible for covering the required work, so their availability becomes especially important. For multi-resource brands, the system has more flexibility because work can be distributed among multiple assigned employees. I used the staffing requirements of each brand or process to determine the required coverage and validate the assignments accordingly.

### 4. What happens when an employee manages all processes for a brand but is unavailable on a required working day?

The system checks the employee's availability before assigning work. If the employee is on leave, has a weekly off, or is otherwise unavailable on a required working day, the system identifies the resulting coverage gap. If another eligible employee is available and can handle the required process, the manager can assign them as a replacement. If no suitable replacement is available, the system flags the day as understaffed instead of silently generating an incomplete roster.

### 5. How does your system handle conflicting requirements or insufficient staffing?

I separated scheduling rules into requirements that must be satisfied and situations that may need managerial decisions. For example, assigning an employee on approved leave or leaving a required process uncovered are treated as issues that need to be flagged. When there isn't enough staff to satisfy all requirements, the system highlights the conflict rather than forcing an invalid assignment. This makes the problem visible to the manager, who can decide whether to arrange a replacement or make an operational adjustment.

### 6. Which parts of the process did you automate, and which did you leave under human control? Why?

I automated repetitive tasks such as roster generation, availability checks, coverage validation, and conflict detection because these are time-consuming and can be handled using predefined rules. I kept roster review, manual adjustments, leave approvals, and final publishing under managerial control. I felt this balance was important because the system can handle routine scheduling efficiently, but real-world situations may require decisions that cannot always be handled by fixed rules.

### 7. If the company doubled its team and brand count, what would you change about your solution?

If the system had to support twice as many employees and brands, I would focus on making the roster generation logic more efficient and improving how data is fetched and processed. I would also look at database indexing, reducing unnecessary requests, and handling roster generation in the background if it started taking longer. I would keep the data model flexible so that adding new brands, processes, or pods would not require major changes to the application.

### 8. If you had one additional week to work on this, what would you improve first?

If I had one more week, I would focus first on improving the roster generation and validation logic, especially for cases where employees handle multiple processes or where a single-resource brand has no available employee. I would also spend more time testing edge cases, improving the clarity of conflict messages, and making it easier for managers to understand why a particular assignment was made or why a coverage gap occurred. I think making the system more reliable and easier to use would be more valuable than adding more features at this stage.

---

## ⚠️ Limitations

- Scheduling runs client-side (suitable for ≤100 employees; larger deployments should move to Edge Function)
- No offline support
- Email delivery depends on Resend account and domain verification
- Demo auth users must be manually created in Supabase Auth dashboard

---

## 📄 License

MIT © 2026 RosterFlow
