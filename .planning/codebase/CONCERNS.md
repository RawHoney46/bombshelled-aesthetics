# Codebase Concerns

**Analysis Date:** 2026-07-14

## Tech Debt

**TypeScript strict mode disabled:**
- Issue: `"strict": false` in `tsconfig.json` disables type checking, allowing runtime errors that TypeScript could catch at compile time
- Files: `tsconfig.json`
- Impact: Type errors slip through to production, making refactoring dangerous. Any developer can accidentally pass wrong types without compiler warning.
- Fix approach: Enable `"strict": true` in tsconfig.json, then run `npm run build` to identify and fix type errors. Start with enabling individual strict flags (`noImplicitAny`, `strictNullChecks`) if the codebase is too large to fix all at once.

**Database initialization error handling missing:**
- Issue: `lib/db/client.ts` calls `initDb()` synchronously at module load with no try/catch. If schema creation fails, the error is unhandled.
- Files: `lib/db/client.ts` (lines 6-47)
- Impact: Application starts successfully even if database setup fails, leading to cryptic runtime errors when first query hits a missing table.
- Fix approach: Wrap `initDb()` in try/catch, log the error, and throw early to prevent startup with a broken database. Use `db.open()` verify or add a health check endpoint.

**No database migration system:**
- Issue: `lib/db/client.ts` uses inline `CREATE TABLE IF NOT EXISTS` statements at startup with no migration history tracking
- Files: `lib/db/client.ts`
- Impact: Schema changes can't be versioned or rolled back. Adding a column or changing constraints requires manual SQL and careful coordination. Difficult to test schema changes before production.
- Fix approach: Implement a simple migration system using a `migrations` table and numbered migration files (e.g., `001-initial-schema.sql`), or use a library like `better-sqlite3` with a migrations wrapper.

**No structured logging:**
- Issue: All errors logged via `console.error()`, no structured fields or timestamps
- Files: `app/api/appointments/route.ts` (line 90), `app/api/leads/route.ts` (lines 251, 276), `app/api/sms/send/route.ts` (line 53), all API routes
- Impact: Debugging production issues is difficult without log aggregation, timestamps, or correlation IDs. Hard to trace a single request through multiple logs.
- Fix approach: Replace `console.error()` with a structured logger (e.g., `winston`, `pino`, or even `console` with `JSON.stringify()`). Include request ID, timestamp, error code, and context in every log.

## Known Bugs

**Calendar slots don't check actual bookings:**
- Symptoms: All appointment slots always show as available, even if already booked
- Files: `lib/calendar/slots.ts` (lines 27-65)
- Trigger: Call `GET /api/calendar/slots` or visit the booking page
- Workaround: None. Dashboard shows all slots but database has the truth; user must manually verify availability.
- Root cause: `getAvailableSlots()` generates 10 dummy slots across the next 5 weekdays without querying the `appointments` table. The function comment acknowledges this: "demo-quality calendar" but it's unfinished for production.
- Fix approach: Query the `appointments` table and cross-reference each generated slot. Set `available: false` if any appointment exists for that date/time. Return only truly available slots.

**AI qualification endpoint returns confusing response on failure:**
- Symptoms: When Claude API fails, endpoint returns 200 OK with `{ qualification: null, first_sms: null }` instead of an error status
- Files: `app/api/leads/[id]/qualify/route.ts` (lines 44-59)
- Trigger: Call `POST /api/leads/[leadId]/qualify` when the Claude API is unreachable or rate-limited
- Root cause: The catch block (line 46) logs the error but then returns 200 (line 56). The client sees "success" but with null data, making it unclear whether qualification actually happened.
- Fix approach: Return 502 Bad Gateway when Claude fails (line 56: change `{ status: 200 }` to `{ status: 502 }`). This signals to the client that an upstream service failed, not that the operation succeeded with null results.

**Lead creation returns null qualification on Claude failure:**
- Symptoms: New lead created but `qualification` is null in the response if Claude API fails during the first qualification attempt
- Files: `app/api/leads/route.ts` (lines 214-235)
- Trigger: Submit a new lead via the form when Claude is unreachable
- Root cause: Step 6 (line 214) wraps Claude call in try/catch and returns a 201 with `qualification: null` if it fails. The lead is saved, but the frontend doesn't know whether qualification actually happened.
- Fix approach: Return a different shape on Claude failure. Either return 201 with a status field (`{ lead, qualification: null, status: 'partially_created' }`), or return 202 Accepted with a "try again" message so frontend can retry qualification separately.

## Security Considerations

**No input validation length limits at API level:**
- Risk: Large payloads could cause database issues or consume excessive memory
- Files: `app/api/leads/route.ts` (notes field allows up to 2000 chars, but no total payload limit), `app/api/sms/send/route.ts` (no message body length check)
- Current mitigation: Frontend validation exists, but API routes should not rely on it
- Recommendations: 
  - Add a max payload size check at the API route level (e.g., `if (Buffer.byteLength(JSON.stringify(body)) > 10000) return 400`)
  - Set max length constraints in database schema (e.g., `notes TEXT CHECK(length(notes) <= 2000)`)
  - Consider using middleware to reject oversized requests before they reach handlers

**No API rate limiting:**
- Risk: Malicious actors could spam lead creation, SMS logging, or qualification endpoints, causing DoS and Anthropic API bill spikes
- Files: `app/api/leads/route.ts`, `app/api/sms/send/route.ts`, `app/api/leads/[id]/qualify/route.ts`
- Current mitigation: None
- Recommendations:
  - Implement rate limiting by IP or user ID (e.g., 10 leads per minute per IP)
  - Use a middleware library like `next-rate-limit` or implement a simple in-memory counter with TTL
  - Reject requests with 429 Too Many Requests once threshold is hit

**Claude API key security (fragile):**
- Risk: If `qualifyLead()` function from `lib/ai/qualify.ts` is accidentally imported into a client component, the API key could leak
- Files: `lib/ai/qualify.ts` (line 43 reads ANTHROPIC_API_KEY from process.env)
- Current mitigation: Function is only imported in API routes, which are server-side
- Recommendations:
  - Add an explicit comment or use a build-time check to prevent importing from client code
  - Consider using `"server-only"` directive at the top of `lib/ai/qualify.ts` (Next.js 13+) to make it a compile-time error to import in client components
  - Never log or return the API key in error messages

**CORS not explicitly configured:**
- Risk: If frontend runs on a different domain, requests will fail due to CORS policy
- Files: No CORS headers set in any route handler
- Current mitigation: Next.js default CORS allows same-origin
- Recommendations:
  - If frontend and API are on different domains, add explicit CORS headers or use Next.js `cors` middleware
  - Test with `curl -H "Origin: http://other-domain.com"` to verify CORS behavior

## Performance Bottlenecks

**Synchronous SQLite database limits concurrency:**
- Problem: `better-sqlite3` is synchronous and single-threaded. All database operations block the JavaScript event loop. Under high load, requests queue up waiting for database access.
- Files: `lib/db/client.ts` (line 1 imports better-sqlite3)
- Current capacity: ~10-20 requests/second before noticeable slowdown (rough estimate)
- Limit: Bottleneck hits around 50+ concurrent users. Beyond that, response times degrade linearly.
- Scaling path:
  - For low/medium traffic (demo, prototype): keep SQLite but add connection pooling/queuing to avoid blocking
  - For production: migrate to PostgreSQL + `pg` or `prisma`, which support async/await and connection pools
  - Intermediate: use Workers (e.g., Node.js worker threads) to run database queries off the main thread

**Claude API calls block request handler:**
- Problem: `qualifyLead()` is awaited synchronously in the lead creation flow. If Claude takes 2-3 seconds, the entire request blocks. Multiple concurrent requests stack up.
- Files: `app/api/leads/route.ts` (line 215 awaits qualifyLead)
- Current capacity: ~3-5 concurrent requests (if Claude takes 1 second each)
- Limit: Beyond 10 concurrent requests, frontend sees timeouts
- Scaling path:
  - Move Claude qualification to a background job queue (e.g., Bull, RabbitMQ, or Supabase queues)
  - Return 201 immediately after saving the lead, then qualify asynchronously
  - Use WebSocket or polling to notify frontend when qualification completes
  - This also decouples Claude failures from lead creation success

**No caching of qualification results:**
- Problem: If the same lead is re-qualified, Claude is called again with identical data, wasting API calls and time
- Files: `app/api/leads/[id]/qualify/route.ts`
- Impact: Refreshing a lead's qualification costs ~1 second and ~$0.0003 in API credits each time
- Improvement path: 
  - Cache qualification results in the database (add `ai_summary_cached_at` timestamp)
  - Only re-call Claude if the lead data has changed since last qualification
  - Allow manual "force refresh" with a separate endpoint

## Fragile Areas

**AI qualification depends on Claude returning valid JSON:**
- Files: `lib/ai/qualify.ts` (lines 276-293, extractJSON and validateQualification)
- Why fragile: If Claude returns malformed JSON or missing fields, `extractJSON()` or `validateQualification()` throws with a vague error like "Claude returned no JSON object". The calling route catches it as a generic 500, giving the client no way to distinguish "Claude crashed" from "invalid response format" from "network error".
- Safe modification: Add detailed error classification in `qualifyLead()` so the catch block can return specific HTTP status codes. Return 500 for network errors, 502 for invalid responses.
- Test coverage: No tests for edge cases like Claude returning `"high" | "medium"` instead of one value, or returning a string instead of object.

**SMS logging has no atomicity guarantees:**
- Files: `lib/sms/send.ts` (logSMS function at line 31)
- Why fragile: `logSMS()` is called AFTER lead creation in `app/api/leads/route.ts` (line 230). If logging fails, the lead exists without a first message. No rollback.
- Safe modification: Wrap both operations in a database transaction, or make SMS logging a background task so lead creation success is independent.
- Test coverage: No tests for the case where logSMS throws an exception.

**Lead status transitions are not validated:**
- Files: `app/api/leads/route.ts` (line 225 sets status to 'qualified'), `app/api/leads/[id]/qualify/route.ts` (line 52 sets status to 'qualifying'), `app/api/appointments/route.ts` (line 80 sets status to 'booked')
- Why fragile: Any route can set any status value. There's no validation that transitions are legal (e.g., you can transition from 'booked' back to 'new'). Over time, leads end up in impossible states.
- Safe modification: Implement a state machine with allowed transitions. Example:
  ```typescript
  const VALID_TRANSITIONS = {
    'new': ['qualifying', 'disqualified'],
    'qualifying': ['qualified', 'qualifying'],
    'qualified': ['booked', 'lost'],
    'booked': ['lost'],
    'lost': [],
  };
  ```
- Test coverage: No tests for status transitions.

## Scaling Limits

**Database file-system bottleneck:**
- Current capacity: ~100,000 leads on a single SQLite database before file I/O becomes the bottleneck
- Limit: Beyond 500,000 leads, query times degrade significantly (milliseconds → seconds). Backups and maintenance become difficult.
- Scaling path: Migrate to PostgreSQL or other hosted database (Supabase, AWS RDS, etc.) as data grows.

**Anthropic API quota:**
- Current capacity: 1 month free tier gives ~5,000-10,000 API calls (rough estimate at ~$0.15/1M tokens). Each qualification uses ~200 tokens (~$0.00003).
- Limit: Free tier will be exhausted after ~50,000 leads created. Production would need a paid account with appropriate quota management.
- Scaling path: Switch to a paid Anthropic account and implement quota tracking/alerts. Monitor token usage and adjust Claude model if needed (e.g., use Haiku for cheaper operations).

## Test Coverage Gaps

**No unit tests for lead creation:**
- What's not tested: The entire POST /api/leads flow — validation, database insert, scoring, Claude qualification, SMS logging
- Files: `app/api/leads/route.ts`
- Risk: Regression in lead validation, scoring logic, or error handling goes undetected
- Priority: High — this is the core business flow

**No tests for AI qualification:**
- What's not tested: Claude prompt builders, JSON parsing, validation of qualification responses
- Files: `lib/ai/qualify.ts`
- Risk: Claude prompt changes or API response format changes break qualification silently
- Priority: High — AI is central to product value

**No tests for calendar slot availability:**
- What's not tested: Slot generation, weekday filtering, date formatting
- Files: `lib/calendar/slots.ts`
- Risk: Off-by-one errors or timezone issues in slot dates go undetected
- Priority: Medium — affects user experience but doesn't break core flow

**No tests for SMS logging:**
- What's not tested: Message persistence, retrieval order, thread history
- Files: `lib/sms/send.ts`, `app/api/sms/send/route.ts`
- Risk: Message loss or ordering issues in conversation history
- Priority: Medium

**No integration tests:**
- What's not tested: End-to-end flows like lead creation → qualification → SMS sending → appointment booking
- Impact: Breaking changes in the API contract between frontend and backend go undetected
- Priority: High for production, Medium for demo

**No error scenario tests:**
- What's not tested: Claude API failures, database errors, invalid input, rate limiting
- Impact: Error paths are untested and fragile
- Priority: High for production

## Dependencies at Risk

**Next.js 14.2.35:**
- Risk: Version is relatively recent (as of knowledge cutoff Feb 2025). May have undiscovered bugs. Future minor versions could break app directory API.
- Impact: Major refactor needed if Next.js introduces breaking changes to server components or API routes
- Migration plan: Keep up with patch versions (14.2.36+). Subscribe to Next.js security advisories. Test major version upgrades in a separate branch before deploying.

**@anthropic-ai/sdk 0.102.0:**
- Risk: SDK version may become outdated if Anthropic makes breaking changes to the API. Current model `claude-haiku-4-5-20251001` may be deprecated.
- Impact: Model may stop being available, requiring code changes to use a newer model
- Migration plan: Regularly check Anthropic docs for model deprecation notices. Have a plan to switch models if needed. Use a configuration file for the model ID so it can be changed without code redeploy.

**better-sqlite3 12.10.0:**
- Risk: Pure SQLite is not suitable for high-concurrency production systems. Migration to PostgreSQL will require significant refactoring.
- Impact: Scaling beyond single-server deployment is difficult
- Migration plan: Plan a PostgreSQL migration early. Use an ORM like Prisma to abstract away SQL so the switch is less painful.

---

*Concerns audit: 2026-07-14*
