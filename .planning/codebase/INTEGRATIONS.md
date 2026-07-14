# External Integrations

**Analysis Date:** 2026-07-14

## APIs & External Services

**AI/LLM:**
- Anthropic Claude - Lead qualification and intent analysis
  - SDK/Client: @anthropic-ai/sdk 0.102.0
  - Model: claude-haiku-4-5-20251001 (fast, cost-effective model)
  - Auth: ANTHROPIC_API_KEY environment variable
  - Usage: `lib/ai/qualify.ts` → POST /api/leads, POST /api/leads/[id]/qualify
  - Max tokens per request: 600
  - Failures degrade gracefully - leads still save without AI summary

**Third-party Fonts:**
- Google Fonts - Playfair Display font
  - Integrated: `app/layout.tsx` via next/font/google
  - No external API calls required (fonts downloaded at build time)

## Data Storage

**Databases:**
- SQLite (embedded, local file)
  - Location: `data/demo.db` (created automatically on first run)
  - Client: better-sqlite3 12.10.0
  - Connection: `lib/db/client.ts` - singleton instance created once per app startup
  - Tables:
    - `leads` - Patient inquiries with qualification status, score, and AI summary
    - `appointments` - Booked consultation slots
    - `sms_log` - Simulated conversation history
  - Schema: Created automatically via `db.exec()` in `lib/db/client.ts`

**File Storage:**
- Local filesystem only - SQLite database file (`data/demo.db`)
- No cloud storage, S3, or CDN integration

**Caching:**
- None - Every request hits the database or AI API directly
- Session storage: None
- Persistent cache: None

## Authentication & Identity

**Auth Provider:**
- None - No user authentication system
- Practice operates read/write access to `/dashboard` without login
- Patient inquiry form (public) is unauthenticated
- Simulated environment only - no real patient identity management

**API Authentication:**
- Internal APIs: No authentication (Next.js App Router routes are same-origin only)
- External: Only Anthropic SDK requires authentication via ANTHROPIC_API_KEY

## Monitoring & Observability

**Error Tracking:**
- None - No external error tracking service
- Console logging: `console.error()` at route handlers and utilities
- Errors logged to server stdout/stderr only

**Logs:**
- Approach: Console logging only
- Key logging points:
  - `app/api/leads/route.ts` - Lead creation and AI qualification failures
  - `lib/ai/qualify.ts` - AI response parsing and validation errors
  - All API routes - 500 errors logged before responding

**Debugging:**
- TypeScript strict mode disabled (set to `false` in tsconfig.json)
- Allows gradual type migration

## CI/CD & Deployment

**Hosting:**
- No deployment integration configured
- Ready to deploy to: Vercel (native), Docker, self-hosted Node.js servers

**CI Pipeline:**
- None configured
- Linting available: `npm run lint` (Next.js built-in)
- No automated testing pipeline

**Build Process:**
- `npm run build` - Compiles TypeScript, bundles React/Next.js, optimizes for production
- Output: `.next/` directory
- Production mode: `npm start` runs the optimized server

## Environment Configuration

**Required env vars:**
- `ANTHROPIC_API_KEY` - Anthropic API key (optional - system degrades gracefully without it)
  - Format: `sk-ant-...`
  - Used by: `lib/ai/qualify.ts` → qualifyLead() function
  - When missing: Leads save and score, but AI qualification returns null and status = 'qualifying'

**Optional env vars:**
- None identified beyond ANTHROPIC_API_KEY

**Secrets location:**
- `.env.local` file at project root (gitignored)
- Loaded automatically by Next.js
- Never committed to repository

**Configuration files:**
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration
- `postcss.config.js` - CSS processing pipeline

## Webhooks & Callbacks

**Incoming:**
- None - This is a demo application, not a production system receiving webhooks

**Outgoing:**
- None - SMS and calendar are simulated locally
- No real SMS provider integration (e.g., Twilio)
- No real calendar system (e.g., Google Calendar)
- No webhook callbacks to external services

## Simulated Services

**SMS (Simulated):**
- No actual SMS provider integrated
- Messages logged to local `sms_log` table in SQLite
- API endpoint: POST `/api/sms/send` accepts lead_id, direction, body
- Conversation history available via: GET `/api/sms/send?lead_id=...`
- Persistence: SQL database only

**Calendar Slots (Simulated):**
- No real calendar system (e.g., Google Calendar, Calendly)
- Available slots generated deterministically by `lib/calendar/slots.ts`
- Returns mock slots via: GET `/api/calendar/slots`
- Appointments booked to local `appointments` table in SQLite

## Data Flow

**Lead Creation:**
1. Patient submits inquiry form → POST `/api/leads`
2. Validation in route handler (`app/api/leads/route.ts`)
3. Lead scored via `lib/scoring/calculate.ts` (deterministic, no external calls)
4. Lead saved to SQLite `leads` table
5. AI qualification requested via `lib/ai/qualify.ts` → Anthropic API
6. If AI succeeds: Summary saved, status updated, first SMS logged
7. If AI fails: Lead saved with status='qualifying', no summary, client notified

**Consultation Booking:**
1. Patient selects slot → POST `/api/appointments`
2. Appointment saved to SQLite `appointments` table
3. Lead status updated to 'booked'
4. Confirmation SMS logged to `sms_log` table (simulated)

**Dashboard Access:**
1. Practice staff views `/dashboard`
2. GET `/api/leads` returns all leads from SQLite (newest first)
3. Staff can view lead detail, SMS thread, score, AI summary
4. Staff can re-run scoring or AI qualification via POST `/api/leads/[id]/score` and `/api/leads/[id]/qualify`

## Security Notes

**ANTHROPIC_API_KEY:**
- Must stay server-side only - stored in `.env.local`, never exposed to browser
- All AI calls made from Next.js API routes (`app/api/*`), not client-side code
- SDK initialization in `lib/ai/qualify.ts` reads from `process.env` automatically
- Failure to protect key = paid API exposed to all users

**Data Sensitivity:**
- Demo uses fictional data only - no real patient information (PHI)
- SQLite database file (`data/demo.db`) stored unencrypted on filesystem
- No encryption, authentication, or access control on database
- Suitable only for demonstration/development

**No Real Patient Data:**
- This is explicitly a demonstration system
- Never run with real patient information
- No HIPAA compliance, audit logging, or regulatory alignment

---

*Integration audit: 2026-07-14*
