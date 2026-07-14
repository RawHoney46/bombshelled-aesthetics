# Coding Conventions

**Analysis Date:** 2026-07-14

## Naming Patterns

**Files:**
- React components: PascalCase, match component name (e.g., `ScoreBadge.tsx`, `LeadForm.tsx`)
- Utility/library files: camelCase (e.g., `calculate.ts`, `client.ts`, `qualify.ts`)
- Route handlers: `route.ts` in Next.js app directory structure
- Types/interfaces: Located in `types/index.ts`, exported as type aliases

**Functions:**
- React components: PascalCase (e.g., `ScoreBadge`, `LeadForm`, `LeadCard`)
- Utility functions: camelCase (e.g., `scoreLead()`, `logSMS()`, `getScoreTone()`)
- Constants within functions: camelCase (e.g., `sizeClasses`, `tone`)

**Variables:**
- State variables: camelCase (e.g., `procedureCategory`, `needsTravelLogistics`, `submitting`)
- Form state setters: `set` + camelCase (e.g., `setProcedureCategory()`)
- Destructured from props/API responses: camelCase matching API field names

**Types:**
- Interfaces (component props): PascalCase ending with `Props` (e.g., `ScoreBadgeProps`, `LeadCardProps`, `LeadFormProps`)
- Type unions: camelCase (e.g., `ProcedureCategory`, `SpecificInterest`, `SurgicalInterest`)
- Database/API fields: snake_case (e.g., `procedure_category`, `patient_location`, `travel_origin_city`, `ai_summary`)
- Status/enum-like types: lowercase with hyphens (e.g., `'ready-to-book'`, `'in-person'`, `'out-of-town'`)

## Code Style

**Formatting:**
- No automatic formatter configured (no Prettier config)
- Code is hand-formatted with clear visual structure
- Spacing: 2-space indentation (inferred from source files)
- Line lengths: Practical limits observed, no hard rule

**Linting:**
- No ESLint configured
- TypeScript in non-strict mode (`"strict": false` in tsconfig.json)
- Type checking performed but relaxed

**Import Organization:**

Order observed:
1. Client directive (if needed): `"use client"`
2. External framework/React imports: `import { useState } from "react"`
3. Next.js imports: `import Link from "next/link"`, `import type { Metadata } from "next"`
4. Internal lib/utils imports: `import db from '@/lib/db/client'`
5. Type imports: `import type { Lead, ProcedureCategory } from '@/types'`

**Path Aliases:**
- `@/*` maps to project root for clean imports: `import { apiFetch } from '@/lib/api'`

## Error Handling

**API Routes:**
```typescript
// Try-catch with specific error handling
export async function POST(request: NextRequest) {
  try {
    // Step 1: Parse & validate
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
    }
    
    // Step 2-N: Process...
    
    return NextResponse.json({ /* success */ }, { status: 201 });
  } catch (err) {
    console.error('POST /api/leads failed:', err);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}
```

**Client-Side (React):**
```typescript
// Try-catch with error state management
try {
  const lead = await apiFetch<Lead>("/api/leads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setSuccess(true);
} catch (err) {
  setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
} finally {
  setSubmitting(false);
}
```

**Validation:**
- Input validation happens at boundaries: LeadForm component checks before API call, API route checks again independently
- Shared validation functions in `lib/validation/lead.ts` imported by both client and server
- Status codes: 400 for validation failures, 404 for not found, 500 for server errors

## Logging

**Framework:** Native `console.error()` for error logging

**Patterns:**
- Errors logged to console with context: `console.error('POST /api/leads failed:', err)`
- No info/warn logging observed in application code
- Database operations not explicitly logged

## Comments

**When to Comment:**
- Top of file: "PURPOSE" section explaining the file's role and why it exists separate from other files
- Before major code sections: Visual dividers with `// ───────────────────────────` and step labels
- Complex logic: Explanatory comments (e.g., "We save BEFORE calling Claude so that...")
- Design rationale: Comments explaining "why" not "what" (e.g., why scores are calculated separately from AI)

**JSDoc/TSDoc:**
```typescript
/**
 * scoreLead — main scoring function.
 *
 * Accepts a Partial<Lead> because newly-submitted leads may not have all
 * fields filled in. Missing fields just contribute 0 points — the function
 * never crashes on incomplete data.
 */
export function scoreLead(lead: Partial<Lead>): number { ... }

/**
 * Name: at least 2 characters, must contain at least one letter, and may
 * only contain letters, spaces, hyphens, apostrophes, and periods.
 */
export function isValidName(name: string): boolean { ... }

/**
 * POST /api/leads
 *
 * Body (JSON): Required: name, phone, procedure_category...
 * Response: 201 Created — { lead, qualification, first_sms }
 */
export async function POST(request: NextRequest) { ... }
```

## Function Design

**Size:** Functions are concise, typically 10-40 lines
- Small, focused utility functions: 5-10 lines (e.g., `getScoreTone()`, `formatInterestLabel()`)
- API handlers: Longer, 100-150+ lines but organized into clear STEP sections with comments
- Components: 20-100+ lines, split between setup logic and JSX

**Parameters:**
- Explicit parameters preferred over props destructuring in function signatures
- React hooks used for state management (useState, useCallback)
- API routes receive destructured `{ params }` for URL params: `{ params }: { params: { id: string } }`

**Return Values:**
- Functions either return data or throw errors (no null-returning stubs)
- React components return JSX
- API routes return `NextResponse.json()`
- Validation functions return boolean

## Module Design

**Exports:**
- Default export for main component/function per file
- Named exports for utility functions and constants
- TypeScript type exports: `export type ProcedureCategory = ...`
- Interface exports: `export interface Lead { ... }`

**Barrel Files:**
- `types/index.ts` exports all domain types
- No other barrel files observed; lib modules are imported directly

**File Organization:**
```
lib/
  ├── ai/
  │   └── qualify.ts          # AI qualification logic
  ├── calendar/
  │   └── slots.ts            # Calendar slot helpers
  ├── db/
  │   └── client.ts           # Database connection & initialization
  ├── scoring/
  │   └── calculate.ts        # Lead scoring algorithm
  ├── sms/
  │   └── send.ts             # SMS logging helpers
  ├── validation/
  │   └── lead.ts             # Input validation rules (shared client/server)
  └── api.ts                  # API client helper for frontend

components/
  ├── booking/
  │   └── CalendarPicker.tsx  # Calendar component
  ├── leads/
  │   ├── LeadCard.tsx        # Lead display card
  │   ├── LeadForm.tsx        # Lead creation form
  │   └── ScoreBadge.tsx      # Score display badge
  └── sms/
      └── [...components]     # SMS/messaging components

app/
  ├── api/
  │   ├── leads/route.ts      # Create/list leads (POST/GET)
  │   ├── leads/[id]/score/route.ts    # Recalculate lead score
  │   ├── leads/[id]/qualify/route.ts  # AI qualification endpoint
  │   ├── sms/send/route.ts   # SMS sending endpoint
  │   ├── appointments/route.ts        # Appointment management
  │   └── calendar/slots/route.ts      # Calendar slots
  ├── dashboard/
  │   ├── layout.tsx          # Dashboard layout
  │   └── page.tsx            # Leads dashboard
  ├── book/[leadId]/
  │   └── page.tsx            # Booking detail page
  ├── layout.tsx              # Root layout
  └── page.tsx                # Home/form page

types/
  └── index.ts                # All domain types & interfaces
```

## Key Patterns

**Separation of Concerns:**
- API route files are "conductors" — they orchestrate calls to lib functions
- Lib functions are "workers" — they do the actual work (scoring, database, SMS)
- Components handle UI state only
- Validation rules shared between client and server

**Constants at Top:**
```typescript
const SURGICAL_INTERESTS: SurgicalInterest[] = [
  'breast-augmentation', 'breast-lift', ...
];

const STATUS_STYLES: Record<string, { bg: string; text: string; ... }> = {
  new: { ... },
  qualified: { ... },
  // ...
};
```

**Defensive Checks:**
- Optional chaining for API responses: `onSuccess?.(lead)`
- Type guards before casting: `db.prepare(...).get(leadId) as Lead | undefined`
- Error instance checks: `err instanceof Error ? err.message : "..."`

---

*Convention analysis: 2026-07-14*
