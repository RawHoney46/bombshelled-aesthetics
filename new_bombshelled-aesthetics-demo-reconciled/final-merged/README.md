# Speed-to-Lead AI Booking Demo

> Bombshelled Aesthetics — welcome every patient inquiry instantly, understand their readiness with AI, and guide them gently toward a consultation.

A demonstration of an AI-augmented patient inquiry flow for Dr. Pamela Brownlee's plastic surgery practice in Frisco, TX: instant simulated SMS reply, automatic intent qualification, transparent priority scoring, and a simple consultation booking flow.

**Demonstration only — every lead, message, and appointment in this system is fictional. No real patient data (PHI) is collected, stored, or transmitted anywhere.**

---

## What this project does

When a prospective patient submits the interest form, this system:

1. **Captures** the inquiry and saves it to a local database
2. **Scores** it from 0–100 based on stated timeline, specificity of interest, and submission completeness — never on procedure value
3. **Qualifies** it using Claude AI — generating a short summary of the patient's stated intent, a readiness rating, a warm suggested first message, and a recommended next step
4. **Texts** the patient back automatically (simulated) with a personalized, pressure-free message
5. **Tracks** the conversation in a unified message log
6. **Offers** consultation booking — in-person or virtual — through a simple slot picker

It demonstrates the "speed-to-lead" principle applied with a patient-first tone: responding within minutes, without ever feeling urgent or transactional.

### What the AI does — and deliberately does not do

The AI reads the patient's **stated interest and readiness** and reflects it back. It is hard-constrained (in `lib/ai/qualify.ts`) to never:

- assess or imply whether a procedure is suitable for a patient
- give medical guidance or imply any diagnosis
- promise or imply results, outcomes, or recovery timelines
- answer medical questions found in a patient's notes
- mention price or financing

Clinical judgment belongs to the doctor. The AI is a scheduling and triage assistant, nothing more.

---

## Tech stack

- **Next.js 14** (App Router) — full-stack React framework
- **TypeScript** — type-safe code throughout
- **Tailwind CSS** — utility-first styling
- **better-sqlite3** — fast, embedded SQLite database
- **@anthropic-ai/sdk** — Claude AI integration
- **uuid** — server-side ID generation

---

## Quick start

### Prerequisites
- Node.js 18 or higher
- An Anthropic API key (optional — the system degrades gracefully without AI: leads still save and score, they just don't get an instant AI reply)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file at the project root:
#    .env.local
# containing one line:
#    ANTHROPIC_API_KEY=sk-ant-api03-...

# 3. (Optional) load fictional demo leads
node tests/utils/seed-demo-data.mjs

# 4. Run it
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) — the patient inquiry form — and [http://localhost:3000/dashboard](http://localhost:3000/dashboard) — the practice's lead dashboard.

> **Upgrading from an older version?** Delete `data/demo.db` before starting. The schema uses `CREATE TABLE IF NOT EXISTS`, which won't add new columns to an existing database.

---

## How the pieces fit

```
app/page.tsx            Patient inquiry form (public-facing)
app/dashboard/          Practice dashboard — all leads, filters, stats
app/book/[leadId]/      Lead detail: SMS thread, scoring, booking

app/api/leads/          Create + list leads (create also scores, qualifies, and sends the first SMS)
app/api/leads/[id]/     Re-run scoring or AI qualification for one lead
app/api/appointments/   Book a consultation (requires in-person or virtual)
app/api/calendar/       Simulated available slots
app/api/sms/            Simulated SMS log

lib/scoring/            Deterministic 0–100 lead score (pure function, no AI)
lib/ai/                 Claude qualification — separate surgical / non-surgical prompts
lib/db/                 SQLite schema + connection
types/                  Shared TypeScript types
tests/utils/            Fictional demo-data seed script
```

### Scoring, in one breath

Timeline is worth up to 40 (ready-to-book > exploring > just-researching), specificity of interest up to 30 (naming a procedure > "other" — surgical and non-surgical are scored on separate tracks, and procedures are never ranked against each other by value), plus +10 each for leaving notes, providing an email, and being an out-of-town patient (they've already committed to travel). Consultation preference (in-person vs. virtual) carries no score — it's logistics, not intent.

---

## Simulation notice

The SMS thread and calendar are **simulated** — nothing leaves this app. No real messages are sent, no real scheduling system is touched, and no real patient contact occurs. Swapping in a real SMS provider (e.g., Twilio) and a real calendar would be a post-demo integration exercise.
