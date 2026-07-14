# Testing Patterns

**Analysis Date:** 2026-07-14

## Test Framework

**Status:** Not configured

**Missing Infrastructure:**
- No test runner installed (Jest, Vitest, Cypress not in `package.json`)
- No test configuration files (`jest.config.js`, `vitest.config.ts`, `cypress.config.ts`)
- No test files in codebase (no `*.test.ts`, `*.spec.ts` files)

**Relevant npm scripts:**
```bash
"dev": "next dev"              # Run dev server
"build": "next build"          # Build for production
"start": "next start"          # Start production server
"lint": "next lint"            # Run linting (TypeScript only)
```

No test script defined.

## Test Utilities

**Data Seeding Script:**
- Location: `tests/utils/seed-demo-data.mjs`
- Purpose: Wipes the demo database and re-populates with fictional test data
- Run: `node tests/utils/seed-demo-data.mjs` from project root
- Creates: 5 fictional leads across different statuses (new, qualifying, qualified, booked, lost)
- Includes: SMS conversation history, appointment examples
- Covers: surgical + non-surgical, local + out-of-town, in-person + virtual scenarios

**Data in Script:**
```javascript
const leads = [
  {
    id: uuidv4(),
    name: 'Jasmine Carter',
    phone: '(972) 555-0142',
    // ... fictional lead data
    score: 95,
    status: 'qualified',
    created_at: hoursAgo(2),
  },
  // ... more fictional leads
];

// Insert leads, appointments, and SMS records
```

**Notes:**
- All data is intentionally fictional (no real PHI)
- Scores are pre-computed by hand, not calculated
- Script includes comments explaining score calculations
- Can be re-run to reset database to clean state

## Current Testing Approach

**Manual Testing:**
- Developer runs `npm run dev` to start development server
- Manual testing via browser at `http://localhost:3000`
- Admin dashboard at `/dashboard` to view leads
- Seed script `tests/utils/seed-demo-data.mjs` provides consistent test data

**No Automated Testing:**
- Unit tests: Not implemented
- Integration tests: Not implemented
- E2E tests: Not implemented
- API tests: Not implemented
- Component tests: Not implemented

## Testing Gaps

**What's Not Covered:**
- Validation functions (`lib/validation/lead.ts`) — no unit tests for regex patterns or edge cases
- Scoring algorithm (`lib/scoring/calculate.ts`) — no tests for point calculations
- API routes (`app/api/*/route.ts`) — no tests for request/response handling, error cases
- React components (`components/`) — no tests for rendering, state management, user interactions
- Database operations (`lib/db/client.ts`) — no tests for queries or schema
- AI integration (`lib/ai/qualify.ts`) — no tests for Claude API calls

**Risk Areas:**
- Form validation bypassed if JavaScript disabled (no server-side enforcement of client checks)
- Scoring algorithm changes could silently break seed data calculations
- API error paths not exercised (only success path is manually tested)
- Component edge cases (empty states, error states, loading states) not tested

## Where to Add Tests

**If Starting Testing:**

1. **Add test framework to package.json:**
   ```bash
   npm install --save-dev vitest @vitest/ui happy-dom @testing-library/react
   ```

2. **Create vitest.config.ts:**
   ```typescript
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';
   
   export default defineConfig({
     plugins: [react()],
     test: {
       globals: true,
       environment: 'happy-dom',
       setupFiles: [],
     },
   });
   ```

3. **Add test scripts to package.json:**
   ```json
   "test": "vitest",
   "test:ui": "vitest --ui",
   "test:coverage": "vitest --coverage"
   ```

4. **Co-locate test files with source:**
   ```
   lib/validation/lead.ts
   lib/validation/lead.test.ts
   
   lib/scoring/calculate.ts
   lib/scoring/calculate.test.ts
   
   components/leads/LeadForm.tsx
   components/leads/LeadForm.test.tsx
   ```

## Recommended Test Patterns (When Implementing)

**Validation Function Tests:**
```typescript
import { describe, it, expect } from 'vitest';
import { isValidName, isValidPhone, isValidEmail } from '@/lib/validation/lead';

describe('Lead Validation', () => {
  describe('isValidName', () => {
    it('accepts valid names', () => {
      expect(isValidName('John Doe')).toBe(true);
      expect(isValidName('María García')).toBe(true);
    });
    
    it('rejects names with only digits', () => {
      expect(isValidName('123')).toBe(false);
    });
    
    it('rejects names under 2 characters', () => {
      expect(isValidName('A')).toBe(false);
    });
  });
  
  describe('isValidPhone', () => {
    it('accepts US phone numbers in various formats', () => {
      expect(isValidPhone('2125551234')).toBe(true);
      expect(isValidPhone('(212) 555-1234')).toBe(true);
      expect(isValidPhone('+1 212-555-1234')).toBe(true);
    });
    
    it('rejects non-US numbers', () => {
      expect(isValidPhone('+44 20 7946 0958')).toBe(false);
    });
  });
});
```

**Scoring Algorithm Tests:**
```typescript
import { describe, it, expect } from 'vitest';
import { scoreLead } from '@/lib/scoring/calculate';
import type { Lead } from '@/types';

describe('Lead Scoring', () => {
  it('scores ready-to-book leads highest', () => {
    const lead: Partial<Lead> = {
      timeline: 'ready-to-book',
      procedure_category: 'surgical',
      specific_interest: 'tummy-tuck',
    };
    expect(scoreLead(lead)).toBeGreaterThan(65);
  });
  
  it('scores just-researching leads lowest', () => {
    const lead: Partial<Lead> = {
      timeline: 'just-researching',
      procedure_category: 'non-surgical',
      specific_interest: 'other-nonsurgical',
    };
    expect(scoreLead(lead)).toBeLessThan(35);
  });
  
  it('awards bonus points for email', () => {
    const leadWithEmail: Partial<Lead> = {
      timeline: 'exploring',
      procedure_category: 'surgical',
      specific_interest: 'facelift',
      email: 'test@example.com',
    };
    
    const leadWithoutEmail: Partial<Lead> = {
      timeline: 'exploring',
      procedure_category: 'surgical',
      specific_interest: 'facelift',
    };
    
    expect(scoreLead(leadWithEmail)).toBeGreaterThan(scoreLead(leadWithoutEmail));
  });
});
```

**Component Tests:**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScoreBadge from '@/components/leads/ScoreBadge';

describe('ScoreBadge', () => {
  it('displays score rounded to nearest integer', () => {
    render(<ScoreBadge score={85.4} />);
    expect(screen.getByText('85')).toBeInTheDocument();
  });
  
  it('uses green color for high scores (>=85)', () => {
    const { container } = render(<ScoreBadge score={90} />);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-[#EAF3DE]');
  });
  
  it('uses red color for low scores (<65)', () => {
    const { container } = render(<ScoreBadge score={30} />);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-[#FCEBEB]');
  });
});
```

**API Route Tests:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/leads/route';
import type { NextRequest } from 'next/server';

describe('POST /api/leads', () => {
  it('returns 400 for invalid name', async () => {
    const request = new NextRequest('http://localhost:3000/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        name: '123',  // digits only
        phone: '2125551234',
        procedure_category: 'surgical',
        specific_interest: 'facelift',
        timeline: 'ready-to-book',
        patient_location: 'local',
        consultation_preference: 'in-person',
      }),
    });
    
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
  
  it('returns 201 and creates lead for valid input', async () => {
    const request = new NextRequest('http://localhost:3000/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        phone: '2125551234',
        email: 'john@example.com',
        procedure_category: 'surgical',
        specific_interest: 'facelift',
        timeline: 'ready-to-book',
        patient_location: 'local',
        consultation_preference: 'in-person',
      }),
    });
    
    const response = await POST(request);
    expect(response.status).toBe(201);
    
    const data = await response.json();
    expect(data.lead).toBeDefined();
    expect(data.lead.name).toBe('John Doe');
  });
});
```

## Coverage Recommendation

**Priority:**
1. **High:** Validation functions (blocking data quality) → target 90%+ coverage
2. **High:** Scoring algorithm (affects business logic) → target 95%+ coverage
3. **Medium:** API routes (core functionality) → target 80%+ coverage
4. **Medium:** Components (UI correctness) → target 70%+ coverage
5. **Low:** Utility functions (low risk) → target 50%+ coverage

**Target Overall:** 70% code coverage minimum, 80% for business logic

---

*Testing analysis: 2026-07-14*
