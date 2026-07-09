# Speed-to-Lead AI Booking Demo

> Dallas Elite Roofing — capture leads instantly, qualify them with AI, score them, and book appointments without missing a beat.

A demonstration of how an AI-augmented backend can convert inbound roofing leads in seconds: instant SMS reply, automatic qualification, deterministic priority scoring, and a one-click appointment booking flow.

---

## What this project is

When a homeowner submits an interest form, this system:

1. **Captures** the lead and saves it to a database
2. **Scores** it from 0-100 based on urgency, damage type, and submission completeness
3. **Qualifies** it using Claude AI — generating a summary, urgency rating, suggested first response, and recommended next action
4. **Texts** the homeowner back automatically with a personalized message
5. **Tracks** the conversation in a unified message log
6. **Offers** appointment booking through a simple slot picker

It's a working demo of the "Speed-to-Lead" principle: the longer a roofing company waits to respond to a lead, the lower the conversion rate. AI lets you respond in seconds instead of hours.

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
- An Anthropic API key (optional — system runs without AI if not provided)

### Setup

```bash
# Install dependencies
npm install

# Create your environment file
# Then add your Anthropic API key (or leave the placeholder for AI-free mode):
# ANTHROPIC_API_KEY=sk-ant-api03-...

# Start the dev server
npm run dev
```

Visit `http://localhost:3000` once it's running.

---

## Project structure

```
.
├── app/                          # Next.js App Router
│   ├── api/                      # Backend API routes
│   │   ├── leads/
│   │   │   ├── route.ts          # POST: create lead | GET: list leads
│   │   │   └── [id]/
│   │   │       ├── qualify/      # POST: re-run AI qualification
│   │   │       └── score/        # POST: re-run scoring
│   │   ├── calendar/slots/       # GET: available booking slots
│   │   ├── appointments/         # POST: book | GET: list
│   │   └── sms/send/             # POST: log message | GET: conversation
│   ├── dashboard/                # Admin dashboard (frontend)
│   ├── book/[leadId]/            # Lead booking page (frontend)
│   ├── layout.tsx
│   └── page.tsx                  # Landing page with lead form
├── components/                   # React components
│   ├── LeadForm.tsx
│   ├── LeadCard.tsx
│   ├── ScoreBadge.tsx
│   └── CalendarPicker.tsx
├── lib/                          # Server-side utilities
│   ├── db.ts                     # SQLite connection + table init
│   ├── scoring.ts                # Deterministic 0-100 lead scoring
│   ├── claude.ts                 # Anthropic API integration
│   ├── sms.ts                    # Simulated SMS log writer/reader
│   └── calendar.ts               # Slot generator
├── types/
│   └── index.ts                  # Lead, Appointment, SMSLog, CalendarSlot
├── data/                         # SQLite database lives here
│   └── demo.db
└── .env.local                    # Environment variables (gitignored)
```

---

## API reference

All endpoints return JSON. Errors include an `error` field; successful responses include the relevant data.

### `POST /api/leads`
Create a new lead. Triggers scoring, AI qualification, and the first outbound SMS.

**Body**
```json
{
  "name": "Jane Smith",
  "phone": "214-555-1234",
  "email": "jane@example.com",
  "damage_type": "hail",
  "urgency": "immediate",
  "notes": "Storm last week"
}
```

**Response** `201 Created`
```json
{
  "lead": { "id": "...", "score": 80, "status": "qualified", ... },
  "qualification": { "summary": "...", "urgency_level": "high", "first_message": "...", "next_action": "book_inspection" },
  "first_sms": { "id": "...", "body": "...", ... }
}
```

If AI qualification fails (e.g., no API credits), the lead is still saved and returned. `qualification` and `first_sms` will be `null`.

---

### `GET /api/leads`
List all leads, newest first.

**Response** `200 OK`
```json
{ "leads": [Lead, Lead, ...] }
```

---

### `POST /api/leads/[id]/qualify`
Re-run AI qualification on an existing lead.

**Response** `200` on success, `404` if lead not found, `502` if AI service is down.

---

### `POST /api/leads/[id]/score`
Recalculate the deterministic score for an existing lead. Useful after scoring rules change.

**Response** `200 OK`
```json
{ "lead": Lead, "score": 80 }
```

---

### `GET /api/calendar/slots`
Returns 10 available appointment slots — 2 per day across the next 5 weekdays.

**Response** `200 OK`
```json
{ "slots": [{ "date": "2026-06-22", "time": "10:00", "available": true }, ...] }
```

---

### `POST /api/appointments`
Book an appointment. Marks the lead's status as `booked` and logs a confirmation SMS.

**Body**
```json
{
  "lead_id": "...",
  "slot_date": "2026-06-22",
  "slot_time": "10:00"
}
```

**Response** `201 Created` with `{ appointment, lead }`.

---

### `GET /api/appointments`
List all appointments. Optional filter: `?lead_id=...`

---

### `POST /api/sms/send`
Log a simulated SMS message. Used for manual outbound messages or simulated inbound replies.

**Body**
```json
{
  "lead_id": "...",
  "direction": "outbound",
  "body": "Hi Jane, just checking in!"
}
```

**Response** `201 Created` with `{ sms }`.

---

### `GET /api/sms/send?lead_id=...`
Fetch the full conversation history for a lead, oldest first.

**Response** `200 OK`
```json
{ "messages": [SMSLog, SMSLog, ...] }
```

---

## How the scoring works

Each lead gets a 0-100 score based on three categories:

| Factor | Possible points |
|---|---|
| Urgency | 40 (`immediate`) / 25 (`this-week`) / 10 (`planning`) |
| Damage type | 30 (`full-replace`) / 20 (`storm` or `hail`) / 15 (`leak`) |
| Notes filled in | +10 bonus |
| Email filled in | +10 bonus |

Capped at 100. The dashboard color-codes leads: 80+ is "hot," 50-79 is "warm," below 50 is "cold."

Why deterministic scoring (instead of letting AI score)? Speed, cost, predictability, and transparency. The dashboard shows consistent numbers and you can always explain why a lead got an 85 vs a 60.

---

## How AI qualification works

When a lead is created, the system sends the lead's info to Claude (`claude-haiku-4-5`) with structured output instructions. Claude returns JSON with:

- `summary` — short description of the situation
- `urgency_level` — high/medium/low (separate from the numeric score)
- `first_message` — personalized SMS to text back
- `next_action` — `book_inspection`, `send_info`, or `disqualify`

The system then:
1. Saves the AI summary to the lead's `ai_summary` field
2. Updates the lead's status to `qualified`
3. Logs the suggested first message as an outbound SMS

**If the AI call fails** (no credits, network issue, malformed response), the lead is still saved — it just doesn't get an `ai_summary` or first SMS. The dashboard can show these leads as "needs manual qualification."

---

## Design decisions

A few choices worth calling out:

**Save before AI.** Every lead is committed to the database before the AI call runs. Losing a lead because an external API hiccupped would be worse than having a lead without AI analysis.

**Parameterized SQL everywhere.** All database queries use `?` placeholders instead of string concatenation. This prevents SQL injection and handles odd characters in user input.

**Server-controlled IDs and timestamps.** Every UUID and timestamp is generated server-side. The client can't spoof these fields.

**Resilience pattern.** Every API route wraps its logic in try/catch, logs errors with `console.error`, and returns generic error messages to the client. Internal error details never leak.

**Simulated, not real, SMS.** Every "message" is just a row in the `sms_log` table. Swapping in real SMS via Twilio would be a one-file change in `lib/sms.ts`.

**Lib layer separation.** The `lib/` folder contains all the actual logic. API routes are thin conductors that validate input, call lib functions, and shape responses. This keeps routes readable and lib functions testable.

---

## Limitations & future work

This is a demo. Some things that would need to change for production:

- **Authentication.** There is none. Anyone can hit any endpoint.
- **Rate limiting.** Nothing prevents someone from submitting 10,000 leads in a minute.
- **Real SMS.** Twilio integration in place of the simulated log.
- **Real calendar conflict checking.** The slot generator marks everything available; a production version would check the appointments table.
- **Background AI processing.** Currently the homeowner waits 1-3 seconds for Claude to respond. Production should queue AI work in the background.
- **Monitoring & alerts.** AI failures are logged to console; production would need real alerting.
- **Tests.** No automated test suite yet.

---

## Testing the API

Quick smoke test in PowerShell (Windows):

```powershell
# Create a lead
$body = @{
    name = "Test Lead"
    phone = "214-555-9999"
    email = "test@example.com"
    damage_type = "hail"
    urgency = "immediate"
    notes = "Big storm last weekend"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/leads" `
    -Method POST -ContentType "application/json" -Body $body
$response | ConvertTo-Json -Depth 10

# Get available slots
Invoke-RestMethod -Uri "http://localhost:3000/api/calendar/slots" |
    ConvertTo-Json -Depth 10

# Book an appointment (use the lead ID from above)
$bookBody = @{
    lead_id = $response.lead.id
    slot_date = "2026-06-22"
    slot_time = "10:00"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/appointments" `
    -Method POST -ContentType "application/json" -Body $bookBody |
    ConvertTo-Json -Depth 10
```

Or with curl (Mac/Linux):

```bash
# Create a lead
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Lead",
    "phone": "214-555-9999",
    "email": "test@example.com",
    "damage_type": "hail",
    "urgency": "immediate",
    "notes": "Big storm last weekend"
  }'

# Get slots
curl http://localhost:3000/api/calendar/slots
```

---

## License

This is a demo project. Use it as a reference for your own work.
#   d a l l a s - e l i t e - r o o f i n g - d e m o  
 