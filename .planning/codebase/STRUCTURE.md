# Codebase Structure

**Analysis Date:** 2026-07-14

## Directory Layout

```
bombshelled-aesthetics-main/
└── new_bombshelled-aesthetics-demo-reconciled/
    └── final-merged/                    # Root of Next.js application
        ├── app/                         # Next.js App Router (pages, layouts, API routes)
        │   ├── page.tsx                 # Home page (lead capture form)
        │   ├── layout.tsx               # Root layout with metadata and fonts
        │   ├── globals.css              # Global styles (Tailwind, custom CSS)
        │   ├── api/                     # API routes (server-side endpoints)
        │   │   ├── leads/
        │   │   │   ├── route.ts         # GET all leads, POST create lead
        │   │   │   └── [id]/
        │   │   │       ├── qualify/route.ts   # POST re-run AI qualification
        │   │   │       └── score/route.ts     # POST re-score lead
        │   │   ├── appointments/route.ts      # POST book appointment
        │   │   ├── calendar/
        │   │   │   └── slots/route.ts    # GET available appointment slots
        │   │   └── sms/
        │   │       └── send/route.ts     # POST send SMS to lead
        │   ├── dashboard/
        │   │   ├── layout.tsx            # Dashboard wrapper layout
        │   │   └── page.tsx              # Dashboard main page (lead list view)
        │   └── book/
        │       └── [leadId]/
        │           └── page.tsx          # Appointment booking page for lead
        │
        ├── components/                  # React components (UI elements, reusable)
        │   ├── leads/
        │   │   ├── LeadForm.tsx          # Capture form with validation
        │   │   ├── LeadCard.tsx          # Individual lead summary card
        │   │   └── ScoreBadge.tsx        # Score display badge (color-coded)
        │   ├── booking/
        │   │   └── CalendarPicker.tsx    # Appointment calendar UI
        │   └── sms/
        │       └── SMSThread.tsx         # SMS conversation history display
        │
        ├── lib/                         # Business logic, utilities, integrations
        │   ├── api.ts                   # Frontend HTTP fetch wrapper (apiFetch)
        │   ├── ai/
        │   │   └── qualify.ts           # Claude API integration for lead qualification
        │   ├── db/
        │   │   └── client.ts            # SQLite database wrapper and schema init
        │   ├── scoring/
        │   │   └── calculate.ts         # Lead scoring algorithm (0–100)
        │   ├── sms/
        │   │   └── send.ts              # SMS logging to database
        │   ├── calendar/
        │   │   └── slots.ts             # Generate available appointment slots
        │   └── validation/
        │       └── lead.ts              # Input validation predicates
        │
        ├── types/
        │   └── index.ts                 # TypeScript type definitions (Lead, Appointment, etc.)
        │
        ├── data/
        │   ├── demo.db                  # SQLite database (file-based)
        │   └── .gitkeep                 # Placeholder for git tracking
        │
        ├── tests/                       # Test files (if any)
        │
        ├── .next/                       # Next.js build output (generated, not committed)
        │
        ├── public/                      # Static assets (if any)
        │
        ├── node_modules/                # Dependencies (not committed)
        │
        ├── package.json                 # NPM dependencies and scripts
        ├── package-lock.json            # Locked versions
        ├── tsconfig.json                # TypeScript compiler options
        ├── next.config.js               # Next.js configuration
        ├── postcss.config.js            # PostCSS (for Tailwind)
        ├── tailwind.config.js           # Tailwind CSS config (if separate)
        ├── README.md                    # Project documentation
        └── .gitignore                   # Git ignore rules
```

## Directory Purposes

**app/**
- Purpose: Next.js App Router structure; contains all pages, layouts, and API routes
- Contains: `.tsx` (React), `.ts` (API handlers), `.css` files
- Key files: `page.tsx` (public home), `dashboard/page.tsx` (staff view), API route handlers

**components/**
- Purpose: Reusable React components organized by feature/domain
- Contains: `.tsx` files (functional components with hooks)
- Subdirectories: `leads/` (lead-related UI), `booking/` (appointment UI), `sms/` (messaging UI)
- Pattern: Each component is self-contained; imports types from `@/types`, utilities from `@/lib`

**lib/**
- Purpose: Business logic, external service integrations, utilities
- Contains: `.ts` files with functions, classes, constants (no JSX)
- Subdirectories organized by concern: `ai/`, `db/`, `scoring/`, `sms/`, `calendar/`, `validation/`
- Pattern: Pure functions where possible; async functions for I/O (API calls, database)

**types/**
- Purpose: Single source of truth for TypeScript interfaces and enums
- Contains: `index.ts` with Lead, Appointment, SMSLog, CalendarSlot interfaces
- Pattern: Imported by both frontend (components) and backend (API routes, lib)

**data/**
- Purpose: Application data storage
- Contains: SQLite database file (`demo.db`) and placeholder file (`.gitkeep`)
- Note: `.gitkeep` ensures git tracks the empty directory; `demo.db` is generated on first run

## Key File Locations

**Entry Points:**
- `app/page.tsx` — Public home page with LeadForm
- `app/dashboard/page.tsx` — Staff dashboard with lead list
- `app/book/[leadId]/page.tsx` — Lead appointment booking flow
- `app/layout.tsx` — Root layout (metadata, fonts, global CSS)

**Configuration:**
- `package.json` — NPM dependencies, scripts (dev, build, start, lint)
- `tsconfig.json` — TypeScript compiler options, path aliases (`@/*`)
- `next.config.js` — Next.js framework options
- `postcss.config.js` — CSS post-processing (autoprefixer, Tailwind)
- `tailwind.config.js` — Tailwind CSS theme, plugins (if separate file exists)

**Core Logic:**
- `lib/ai/qualify.ts` — Claude API calls; prompt builders; response parsing
- `lib/scoring/calculate.ts` — Lead scoring algorithm
- `lib/db/client.ts` — SQLite schema, prepared statements
- `lib/sms/send.ts` — SMS logging to database
- `lib/validation/lead.ts` — Input validation rules

**Testing:**
- `tests/` — Test files (currently empty; would contain `.test.ts`, `.spec.ts`)

## Naming Conventions

**Files:**
- `route.ts` — Next.js API route handler (HTTP methods are functions inside)
- `page.tsx` — Next.js page component (renders a route)
- `layout.tsx` — Next.js layout wrapper
- `[param].tsx` or `[param]/route.ts` — Dynamic segment (e.g., `[leadId]` → URL `:leadId`)
- Components: `PascalCase.tsx` (e.g., `LeadForm.tsx`)
- Utilities: `camelCase.ts` (e.g., `calculate.ts`, `qualify.ts`)

**Directories:**
- Feature-based: `leads/`, `booking/`, `sms/` group related concerns
- Function-based: `api/`, `lib/` contain handlers and utilities
- No `utils/` or `helpers/` — use subdirectories for specificity

**Functions:**
- `isValid*` — Validation predicates (e.g., `isValidName`, `isValidPhone`)
- `*Lead` — Lead-related functions (e.g., `scoreLead`, `qualifyLead`)
- `calculate*`, `format*` — Transformation functions (e.g., `calculateScore`, `formatTimelineLabel`)
- Async functions: `await` at call site (e.g., `await qualifyLead(lead)`)

**Variables:**
- `camelCase` — Local variables, parameters, state (e.g., `leadId`, `procedureCategory`)
- `SCREAMING_SNAKE_CASE` — Constants (e.g., `SURGICAL_INTERESTS`, `MAX_TOKENS`)
- Prefixed: `is*` for booleans (e.g., `isLoading`, `isValid`)

**Types:**
- `PascalCase` for interfaces and type aliases (e.g., `Lead`, `LeadQualification`, `Timeline`)
- Discriminated unions: `status: 'new' | 'qualifying' | 'qualified' | 'booked' | 'lost'`
- Imported from `@/types` throughout codebase

## Where to Add New Code

**New Feature (e.g., SMS reply handling):**
- Primary code: `lib/sms/` (handler, validation, etc.)
- API endpoint: `app/api/sms/` (new route file)
- Component: `components/sms/` (if UI needed)
- Tests: `tests/sms.test.ts`

**New Component (e.g., LeadStatusTimeline):**
- Implementation: `components/leads/LeadStatusTimeline.tsx`
- Styling: Inline Tailwind or `app/globals.css`
- Types: Update `types/index.ts` if needed
- Import in parent: `import LeadStatusTimeline from '@/components/leads/LeadStatusTimeline'`

**New Utility Function (e.g., format phone for display):**
- Implementation: `lib/validation/lead.ts` or new subdirectory (e.g., `lib/formatting/phone.ts`)
- Export: Named export so it can be imported: `export function formatPhoneForDisplay(phone: string): string`
- Use: Import in components/pages: `import { formatPhoneForDisplay } from '@/lib/formatting/phone'`

**New API Endpoint (e.g., GET /api/leads/[id]):**
- File: `app/api/leads/[id]/route.ts`
- Handler: Export async function `GET(request, { params })` 
- Response: Use `NextResponse.json({ ... }, { status: 200 })`
- Validation: Call validation functions from `lib/validation/`
- Database: Use prepared statements from `lib/db/client.ts`

**Database Schema Change (e.g., add column to leads):**
- Location: `lib/db/client.ts` in the `initDb()` function
- Approach: Add `ALTER TABLE` or modify `CREATE TABLE IF NOT EXISTS` 
- Migration: Not versioned; schema is recreated on each app start (OK for demo; production needs proper migrations)

**New Lead Qualification Logic:**
- Location: `lib/ai/qualify.ts` (prompt builders)
- Pattern: Update `buildSurgicalPrompt()` or `buildNonSurgicalPrompt()` with new constraints/rules
- Output: Keep LeadQualification interface consistent; add fields if needed and update validator

**New Integration (e.g., Twilio SMS):**
- Location: New subdirectory `lib/twilio/` with client setup and functions
- Implementation: Import Twilio SDK, wrap in functions that match current interface (e.g., `sendSMS`)
- API route: Call lib function from `app/api/sms/send/route.ts`
- Environment: Add env var (e.g., `TWILIO_AUTH_TOKEN`) to `.env.local`

## Special Directories

**node_modules/**
- Purpose: NPM dependencies (installed via `npm install`)
- Generated: Yes
- Committed: No (listed in `.gitignore`)
- Update: Run `npm install` after `package-lock.json` changes

**.next/**
- Purpose: Next.js build output (compiled JavaScript, static files)
- Generated: Yes (by `npm run build`)
- Committed: No (listed in `.gitignore`)
- Regenerate: Run `npm run build`

**data/**
- Purpose: Application data (SQLite database)
- Generated: Yes (created on first app start if missing)
- Committed: No (`.gitkeep` is committed; `demo.db` is not)
- Backup: Copy `data/demo.db` to external storage before app reset

## Import Aliases

The `tsconfig.json` defines:
```json
"paths": { "@/*": ["./*"] }
```

This means:
- `@/components/leads/LeadForm` → `./components/leads/LeadForm`
- `@/lib/ai/qualify` → `./lib/ai/qualify`
- `@/types` → `./types`

All imports in the codebase use `@/` prefix for absolute imports (not relative `../../../`).

## Key File Patterns

**API Route Files:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/client';  // Database
import { scoreLead } from '@/lib/scoring/calculate';  // Business logic
import type { Lead } from '@/types';  // Types

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Validate
    // Process
    return NextResponse.json({ ... }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: '...' }, { status: 500 });
  }
}

export async function GET() {
  // ...
}
```

**Component Files:**
```typescript
"use client";  // Marks as Client Component (can use hooks)
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import type { Lead } from '@/types';

export default function ComponentName() {
  const [state, setState] = useState<Lead[]>([]);
  
  useEffect(() => {
    apiFetch<{ leads: Lead[] }>('/api/leads').then(data => setState(data.leads));
  }, []);
  
  return <div>...</div>;
}
```

**Library Files:**
```typescript
import type { Lead } from '@/types';
import db from '@/lib/db/client';

export function scoreLead(lead: Partial<Lead>): number {
  // Pure function or business logic
  return score;
}

export async function qualifyLead(lead: Lead): Promise<Qualification> {
  // Async function, may call external APIs
  return result;
}
```

---

*Structure analysis: 2026-07-14*
