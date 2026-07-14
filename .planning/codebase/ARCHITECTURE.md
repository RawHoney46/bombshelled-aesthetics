<!-- refreshed: 2026-07-14 -->
# Architecture

**Analysis Date:** 2026-07-14

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Frontend UI Layer                         │
│  Pages: Home, Dashboard, Booking                             │
│  Components: LeadForm, LeadCard, CalendarPicker, SMSThread   │
│  `app/`, `components/`                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP JSON (REST)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Route Layer (Next.js)                  │
│  POST /api/leads           (create lead + orchestrate)       │
│  GET /api/leads            (list all leads)                  │
│  POST /api/leads/[id]/qualify  (re-run AI qualification)     │
│  POST /api/leads/[id]/score    (re-score lead)               │
│  GET /api/calendar/slots   (fetch available slots)           │
│  POST /api/appointments    (book appointment)                │
│  POST /api/sms/send        (send SMS to lead)                │
│  `app/api/`                                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ (Calls)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Business Logic & Library Layer                  │
│  lib/scoring/calculate.ts      (deterministic lead scoring)  │
│  lib/ai/qualify.ts             (Claude API integration)      │
│  lib/sms/send.ts               (SMS logging)                 │
│  lib/calendar/slots.ts         (available appointment slots) │
│  lib/db/client.ts              (SQLite database access)      │
│  lib/validation/lead.ts        (input validation rules)      │
│  lib/api.ts                    (fetch wrapper for frontend)  │
│  `lib/`, `types/`                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────┬──────────────────────────┐
│  SQLite Database                 │  Anthropic Claude API    │
│  `data/demo.db`                  │  (AI Qualification)      │
│  - leads                         │  claude-haiku-4.5        │
│  - appointments                  │                          │
│  - sms_log                       │                          │
└──────────────────────────────────┴──────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **LeadForm** | Capture new lead inquiry with client-side validation | `components/leads/LeadForm.tsx` |
| **LeadCard** | Display individual lead summary with score and status | `components/leads/LeadCard.tsx` |
| **ScoreBadge** | Visual indicator of lead score (color-coded) | `components/leads/ScoreBadge.tsx` |
| **CalendarPicker** | Calendar UI for appointment slot selection | `components/booking/CalendarPicker.tsx` |
| **SMSThread** | Display SMS conversation history for a lead | `components/sms/SMSThread.tsx` |
| **Dashboard** | Main page listing all leads with filters and stats | `app/dashboard/page.tsx` |
| **Home** | Public-facing lead capture form | `app/page.tsx` |
| **Book Page** | Appointment booking flow for a specific lead | `app/book/[leadId]/page.tsx` |
| **Lead Scoring** | Pure function scoring leads 0-100 based on intent signals | `lib/scoring/calculate.ts` |
| **AI Qualification** | Claude API integration for lead analysis | `lib/ai/qualify.ts` |
| **SMS Logging** | Record SMS messages sent/received | `lib/sms/send.ts` |
| **Database Client** | SQLite wrapper with schema initialization | `lib/db/client.ts` |
| **Lead Validation** | Input validation rules for form and API | `lib/validation/lead.ts` |

## Pattern Overview

**Overall:** Layered Client-Server Architecture with AI Orchestration

**Key Characteristics:**
- **API-Centric:** Frontend communicates exclusively via HTTP to backend routes
- **Stateless Routes:** Each API route is self-contained; no session/auth state in this demo
- **Orchestration at Entrypoint:** `POST /api/leads` is the "conductor" — it coordinates scoring, DB write, AI call, and SMS logging in sequence
- **Graceful Degradation:** AI failures (e.g., API outage) don't crash lead creation; lead is saved first
- **Separation of Concerns:** Business logic lives in `lib/`, not in route handlers
- **Type Safety:** Full TypeScript with shared type definitions (`types/index.ts`) across frontend and backend

## Layers

**Presentation Layer (Frontend):**
- Purpose: React components and Next.js pages for UI
- Location: `app/`, `components/`
- Contains: `.tsx` files with React hooks (useState, useEffect), form handling, data display
- Depends on: `lib/api.ts` (HTTP client), types, styling (Tailwind CSS)
- Used by: End users (leads and staff)

**API Route Layer (Backend Entrypoints):**
- Purpose: HTTP request handlers that orchestrate business logic
- Location: `app/api/`
- Contains: Next.js route files (`route.ts`) organized by resource (leads, appointments, SMS, calendar)
- Depends on: `lib/` functions (scoring, AI, DB, validation)
- Used by: Frontend via `apiFetch()`, external callers (webhooks, integrations)

**Business Logic Layer:**
- Purpose: Implement core rules and integrations
- Location: `lib/` subdirectories
- Contains:
  - `scoring/calculate.ts` — deterministic lead scoring (pure function)
  - `ai/qualify.ts` — Claude API calls for lead analysis (async, may fail)
  - `sms/send.ts` — SMS logging to database
  - `calendar/slots.ts` — appointment slot generation/availability
  - `validation/lead.ts` — input validation predicates
  - `db/client.ts` — SQLite initialization and access
  - `api.ts` — HTTP fetch wrapper for frontend
- Depends on: External services (Anthropic API), database, types
- Used by: API routes, frontend (validation only)

**Data Access Layer:**
- Purpose: Persist and retrieve data
- Location: `lib/db/client.ts`, `data/demo.db` (SQLite file)
- Contains: Database schema (leads, appointments, sms_log tables), prepared statements
- Depends on: better-sqlite3 driver
- Used by: All layers that need to read/write leads or logs

**External Integrations:**
- Anthropic Claude API (`lib/ai/qualify.ts`) — Lead qualification analysis
- better-sqlite3 — Local SQLite database

## Data Flow

### Primary Request Path: Create Lead (POST /api/leads)

1. **User submits form** → `LeadForm` component (`components/leads/LeadForm.tsx`)
   - Validates client-side (name, phone, email, etc.)
   - Calls `apiFetch('/api/leads', { method: 'POST', body: JSON.stringify(formData) })`

2. **API receives POST** → `app/api/leads/route.ts` (POST handler)
   - Parses JSON body
   - Re-validates all fields (server-side, independent of client)
   - Builds Lead object with id, timestamp, etc.

3. **Score the lead** → `lib/scoring/calculate.ts`
   - Pure function: no side effects, same input = same output
   - Assigns score based on timeline, procedure specificity, completeness
   - Returns 0–100

4. **Save to database** → `lib/db/client.ts`
   - Inserts lead row with `status: 'new'`
   - Happens BEFORE AI call so lead is never lost

5. **Qualify with AI** → `lib/ai/qualify.ts` (async)
   - Calls Anthropic API with Claude model `claude-haiku-4-5-20251001`
   - Sends formatted lead info + safety constraints + expected JSON shape
   - Returns: summary, urgency_level, first_message, next_action
   - Wrapped in try/catch; if it fails, lead remains saved with `status: 'new'`

6. **Log first SMS** → `lib/sms/send.ts`
   - Creates SMSLog record with AI-suggested message
   - Records `direction: 'outbound'`, timestamp, body

7. **Update lead** → `app/api/leads/route.ts`
   - Updates lead `status: 'qualified'` and `ai_summary` in DB
   - Returns 201 with { lead, qualification, first_sms }

8. **Frontend receives response** → `LeadForm` callback
   - Shows success message or error
   - Optionally calls `onSuccess()` callback to navigate/refresh

### Secondary Flow: View Dashboard (GET /api/leads)

1. **User visits /dashboard** → `app/dashboard/page.tsx`
2. **Component mounts** → `useEffect` calls `apiFetch('/api/leads')`
3. **API route** `app/api/leads/route.ts` (GET handler)
   - Queries all leads from database sorted by `created_at DESC`
   - Returns 200 with { leads: Lead[] }
4. **Frontend renders** LeadCard list with filtering/sorting by status and search

### Tertiary Flow: Re-Qualify Lead (POST /api/leads/[id]/qualify)

1. **User clicks "Re-qualify" on a lead** (dashboard or lead card)
2. **Frontend calls** `apiFetch(`/api/leads/${leadId}/qualify`, { method: 'POST' })`
3. **API route** `app/api/leads/[id]/qualify/route.ts`
   - Looks up lead by ID
   - Calls `qualifyLead(lead)` again
   - If AI succeeds: updates lead, logs new SMS, returns 200
   - If AI fails: sets status to 'qualifying' (waiting state), returns 200 with null qualification

**State Management:**
- **Frontend:** React local state (useState) in each page/component; no Redux or context
- **Backend:** All state is in SQLite database; API routes are stateless
- **Persistence:** Database is file-based (`data/demo.db`); survives process restarts

## Key Abstractions

**Lead:** 
- Purpose: Represents a patient inquiry with demographics, procedure interest, timeline, and qualification status
- Examples: `types/index.ts`, `app/api/leads/route.ts`, `components/leads/LeadCard.tsx`
- Pattern: Single source of truth in database; read into memory as needed; updated via prepared statements

**Qualification:**
- Purpose: Encapsulates AI analysis result (summary, urgency, suggested message, next action)
- Examples: `lib/ai/qualify.ts` (LeadQualification interface)
- Pattern: Immutable output of Claude API call; used to update Lead and log SMS

**CalendarSlot:**
- Purpose: Represents a single available appointment time
- Examples: `types/index.ts`, `lib/calendar/slots.ts`, `components/booking/CalendarPicker.tsx`
- Pattern: Generated on-demand; not persisted until appointment is booked

## Entry Points

**User-Facing:**
- `app/page.tsx` — Home page with LeadForm (public)
- `app/dashboard/page.tsx` — Dashboard (staff view)
- `app/book/[leadId]/page.tsx` — Booking flow for a lead

**API Entry Points:**
- `POST /api/leads` — Create new lead (form submission or direct API call)
- `GET /api/leads` — List all leads (dashboard, admin tools)
- `POST /api/leads/[id]/qualify` — Re-run AI qualification
- `POST /api/leads/[id]/score` — Re-calculate lead score
- `GET /api/calendar/slots` — Fetch available appointment slots
- `POST /api/appointments` — Book an appointment
- `POST /api/sms/send` — Send SMS to lead

## Architectural Constraints

- **Threading:** Single-threaded event loop (Node.js default); better-sqlite3 uses serialized access (one statement at a time)
- **Global state:** `lib/db/client.ts` creates a singleton `db` instance on module load; `lib/ai/qualify.ts` creates singleton Anthropic client
- **Circular imports:** None observed; imports follow a clear dependency direction (API routes → lib → types → no imports)
- **Transaction handling:** Each API request is a logical transaction; no multi-step transactions across routes (lead creation coordinates multiple steps serially)
- **Scalability:** SQLite is file-based and not suitable for high-concurrency scenarios; 10+ concurrent writes may block; designed for demo/single-office use
- **API Credentials:** ANTHROPIC_API_KEY is read from `process.env` on server startup; must be set before app launches
- **Lead ID:** Uses UUID v4 (random); no sequential IDs; no schema versioning

## Anti-Patterns

### Unseparated Concerns in Single Route

**What happens:** All business logic (validation, scoring, DB, AI, SMS) lives in `app/api/leads/route.ts` POST handler
**Why it's wrong:** Makes the route file hard to test; concerns are entangled; difficult to reuse logic elsewhere
**Do this instead:** Each lib file (`lib/scoring/`, `lib/ai/`, `lib/sms/`) is independently testable; route is a thin orchestrator. To add a new flow that needs scoring, import `scoreLead()` instead of duplicating code.

### Validation Repeated Client & Server

**What happens:** Form validation in `LeadForm.tsx` and API validation in `app/api/leads/route.ts` are similar but separate
**Why it's wrong:** Inconsistency risk; drift over time; developers may trust client-side validation
**Do this instead:** Validation rules live in `lib/validation/lead.ts` (isValidName, isValidPhone, etc.); imported by both. Form calls them. API calls them. Single source of truth.

### Database Queries Scattered

**What happens:** Many routes use `db.prepare(...).run()` or `.get()` inline
**Why it's wrong:** SQL strings are duplicated; no abstraction; hard to refactor schema
**Do this instead:** Abstract repeated queries into functions in `lib/db/` (e.g., `getLeadById()`, `updateLeadStatus()`). Routes call functions, not raw SQL. Query logic is testable independently.

## Error Handling

**Strategy:** 
- **API routes:** Return 400 for client errors (bad input), 404 for not found, 500 for server errors. Log errors server-side; return generic message to client.
- **AI failures:** Wrapped in try/catch; lead is saved first; if Claude fails, status remains 'new' and front-desk can re-trigger qualification.
- **Validation:** Happens at API entrypoint; malformed JSON is 400; validation failures (invalid name format) are 400; schema mismatches are 500.
- **Database failures:** Would be 500; database is file-based and assumed to be available (no retry logic).

**Patterns:**
- `app/api/leads/route.ts` — Validates input, returns 400 with error message if invalid
- `lib/ai/qualify.ts` — Throws Error with descriptive message; caller decides whether to propagate or handle
- API routes — Catch-all `catch (err)` at end; log full error server-side; return generic 500 message to client

## Cross-Cutting Concerns

**Logging:** 
- Console.error() for failures in `app/api/leads/route.ts`, `app/api/leads/[id]/qualify/route.ts`, `lib/ai/qualify.ts`
- No structured logging (Bunyan, Winston, etc.); suitable for demo
- SMS messages are logged to `sms_log` table as structured data (not console)

**Validation:** 
- Predicates in `lib/validation/lead.ts` (isValidName, isValidPhone, etc.)
- Used by form (client-side) and API (server-side)
- Regex patterns for phone (10 digits), email (basic), name (2+ chars, letters)

**Authentication:** 
- Not implemented in this demo
- Dashboard is public (no access control)
- Production version would add: session middleware, role-based route guards, API key for third-party calls

**Internationalization (i18n):** 
- Not implemented
- Hardcoded English text in components and prompts
- Tailwind CSS and Google Font (Playfair Display) assume global use

---

*Architecture analysis: 2026-07-14*
