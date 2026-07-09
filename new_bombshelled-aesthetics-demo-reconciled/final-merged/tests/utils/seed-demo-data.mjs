// tests/utils/seed-demo-data.mjs
//
// PURPOSE:
// Wipes the demo database and re-populates it with a small, clean set of
// FICTIONAL Bombshelled Aesthetics leads for demoing or manual testing.
//
// Rule 1 — no real PHI, ever: every name, phone number, email, note, and
// message below is invented. Do not replace any of it with real patient
// information, even "just for testing."
//
// HOW TO RUN (from the project root):
//   node tests/utils/seed-demo-data.mjs
//
// NOTE ON SCORES:
// Scores below are hardcoded, pre-computed by hand using the exact same
// rules as lib/scoring/calculate.ts (the math is shown next to each lead).
// We don't import the TS scoring file here because plain `node` can't load
// TypeScript without extra tooling — and a seed script should stay
// zero-dependency simple. If you change the scoring weights, update these
// numbers (or just click "Recalculate score" in the UI, which uses the
// real function).

import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const dbPath = path.join(process.cwd(), 'data', 'demo.db');
const db = new Database(dbPath);

// ── Ensure the demo schema exists before seeding ───────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    procedure_category TEXT NOT NULL,
    specific_interest TEXT NOT NULL,
    timeline TEXT NOT NULL,
    patient_location TEXT NOT NULL,
    travel_origin_city TEXT,
    needs_travel_logistics INTEGER,
    consultation_preference TEXT NOT NULL,
    notes TEXT,
    score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'new',
    ai_summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    lead_id TEXT REFERENCES leads(id),
    slot_date TEXT NOT NULL,
    slot_time TEXT NOT NULL,
    consultation_type TEXT NOT NULL,
    confirmed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sms_log (
    id TEXT PRIMARY KEY,
    lead_id TEXT REFERENCES leads(id),
    direction TEXT,
    body TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ── Wipe existing data ──────────────────────────────────────────────────
db.exec(`
  DELETE FROM sms_log;
  DELETE FROM appointments;
  DELETE FROM leads;
`);

// ── Fictional leads ─────────────────────────────────────────────────────
// Covers: surgical + non-surgical, local + out-of-town, in-person +
// virtual, and all five statuses (new / qualifying / qualified / booked /
// lost) so every dashboard filter has something to show.

const now = Date.now();
const hoursAgo = (h) => new Date(now - h * 60 * 60 * 1000).toISOString();

const leads = [
  {
    // Score: ready-to-book 45 + named surgical 30 + notes 10 + email 10 = 95
    id: uuidv4(),
    name: 'Jasmine Carter',
    phone: '(972) 555-0142',
    email: 'jasmine.c.demo@example.com',
    procedure_category: 'surgical',
    specific_interest: 'tummy-tuck',
    timeline: 'ready-to-book',
    patient_location: 'local',
    travel_origin_city: null,
    needs_travel_logistics: null,
    consultation_preference: 'in-person',
    notes: 'Been thinking about this for two years and I am finally ready. Would love a morning appointment if possible.',
    score: 95,
    status: 'qualified',
    ai_summary:
      'Jasmine says she has been considering a tummy tuck for two years and is ready to book now. Prefers an in-person morning consultation.',
    created_at: hoursAgo(2),
  },
  {
    // Score: exploring 25 + named surgical 30 + notes 10 + email 10 + out-of-town 5 = 80
    id: uuidv4(),
    name: 'Madison Blake',
    phone: '(405) 555-0173',
    email: 'madison.b.demo@example.com',
    procedure_category: 'surgical',
    specific_interest: 'breast-augmentation',
    timeline: 'exploring',
    patient_location: 'out-of-town',
    travel_origin_city: 'Oklahoma City, OK',
    needs_travel_logistics: 1,
    consultation_preference: 'virtual',
    notes: 'I would be traveling from OKC. Would like to start with a virtual consult and learn how the travel process works.',
    score: 80,
    status: 'qualifying',
    ai_summary:
      'Madison is exploring breast augmentation and would travel from Oklahoma City. Wants to start with a virtual consultation and asked how travel arrangements work.',
    created_at: hoursAgo(5),
  },
  {
    // Score: ready-to-book 45 + named non-surgical 20 + email 10 = 75
    id: uuidv4(),
    name: 'Brianna Torres',
    phone: '(214) 555-0119',
    email: 'brianna.t.demo@example.com',
    procedure_category: 'non-surgical',
    specific_interest: 'filler',
    timeline: 'ready-to-book',
    patient_location: 'local',
    travel_origin_city: null,
    needs_travel_logistics: null,
    consultation_preference: 'in-person',
    notes: null,
    score: 75,
    status: 'booked',
    ai_summary:
      'Brianna is ready to book a filler appointment and prefers coming in person. First-time patient at the practice.',
    created_at: hoursAgo(26),
  },
  {
    // Score: just-researching 10 + named non-surgical 20 = 30
    id: uuidv4(),
    name: 'Olivia Nguyen',
    phone: '(469) 555-0186',
    email: null,
    procedure_category: 'non-surgical',
    specific_interest: 'skin-rejuvenation',
    timeline: 'just-researching',
    patient_location: 'local',
    travel_origin_city: null,
    needs_travel_logistics: null,
    consultation_preference: 'virtual',
    notes: null,
    score: 30,
    status: 'new',
    ai_summary: null,
    created_at: hoursAgo(0.5),
  },
  {
    // Score: exploring 25 + other-surgical 24 + email 10 + notes 10 = 69
    id: uuidv4(),
    name: 'Hannah Price',
    phone: '(817) 555-0157',
    email: 'hannah.p.demo@example.com',
    procedure_category: 'surgical',
    specific_interest: 'other-surgical',
    timeline: 'exploring',
    patient_location: 'local',
    travel_origin_city: null,
    needs_travel_logistics: null,
    consultation_preference: 'in-person',
    notes: 'Not sure yet which procedure is the right fit for what I want — hoping to talk it through.',
    score: 69,
    status: 'lost',
    ai_summary:
      'Hannah was exploring surgical options and wanted to discuss which procedure fit her goals. She later let us know she has decided to wait until next year.',
    created_at: hoursAgo(96),
  },
];

const insertLead = db.prepare(`
  INSERT INTO leads (
    id, name, phone, email,
    procedure_category, specific_interest, timeline,
    patient_location, travel_origin_city, needs_travel_logistics,
    consultation_preference, notes, score, status, ai_summary, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const lead of leads) {
  insertLead.run(
    lead.id,
    lead.name,
    lead.phone,
    lead.email,
    lead.procedure_category,
    lead.specific_interest,
    lead.timeline,
    lead.patient_location,
    lead.travel_origin_city,
    lead.needs_travel_logistics,
    lead.consultation_preference,
    lead.notes,
    lead.score,
    lead.status,
    lead.ai_summary,
    lead.created_at
  );
}

// ── Appointment for the booked lead ─────────────────────────────────────
const bookedLead = leads[2]; // Brianna
const tomorrow = new Date(now + 24 * 60 * 60 * 1000);
const slotDate = tomorrow.toISOString().slice(0, 10);

const insertAppointment = db.prepare(`
  INSERT INTO appointments (id, lead_id, slot_date, slot_time, consultation_type, confirmed, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
insertAppointment.run(
  uuidv4(),
  bookedLead.id,
  slotDate,
  '11:00 AM',
  'in-person',
  1,
  hoursAgo(25)
);

// ── SMS history ─────────────────────────────────────────────────────────
// A believable (fictional) thread per lead: the AI's warm first text, and
// for some leads a reply, so the SMS view isn't empty in the demo.

const insertSMS = db.prepare(`
  INSERT INTO sms_log (id, lead_id, direction, body, sent_at)
  VALUES (?, ?, ?, ?, ?)
`);

const smsRows = [
  // Jasmine (qualified, ready to book)
  [leads[0].id, 'outbound', "Hi Jasmine! Thank you for reaching out — two years of thought means you know what you want. We'd love to find you a morning consultation time. - Bombshelled Aesthetics", hoursAgo(2)],
  [leads[0].id, 'inbound', 'Thank you!! Yes, mornings are best for me. What do you have next week?', hoursAgo(1.8)],

  // Madison (qualifying, out-of-town)
  [leads[1].id, 'outbound', "Hi Madison! We love welcoming patients from Oklahoma City — a virtual consult is a perfect first step, and we'll walk you through travel when you're ready. - Bombshelled Aesthetics", hoursAgo(5)],

  // Brianna (booked)
  [leads[2].id, 'outbound', "Hi Brianna! We'd be happy to get you in for filler — let's find a time that works for you. - Bombshelled Aesthetics", hoursAgo(26)],
  [leads[2].id, 'outbound', `Your in-person consultation is confirmed for ${slotDate} at 11:00 AM. We can't wait to meet you! - Bombshelled Aesthetics`, hoursAgo(25)],

  // Hannah (lost)
  [leads[4].id, 'outbound', "Hi Hannah! Talking it through is exactly what a consultation is for — no pressure, just answers. We'd love to help you explore your options. - Bombshelled Aesthetics", hoursAgo(96)],
  [leads[4].id, 'inbound', "Thank you so much. I've thought about it and I'm going to wait until next year — I'll be back in touch!", hoursAgo(72)],
];

for (const [leadId, direction, body, sentAt] of smsRows) {
  insertSMS.run(uuidv4(), leadId, direction, body, sentAt);
}

// ── Summary ─────────────────────────────────────────────────────────────
const totalLeads = db.prepare('SELECT COUNT(*) AS count FROM leads').get().count;
const byStatus = db
  .prepare('SELECT status, COUNT(*) AS count FROM leads GROUP BY status')
  .all();
const smsCount = db.prepare('SELECT COUNT(*) AS count FROM sms_log').get().count;
const apptCount = db.prepare('SELECT COUNT(*) AS count FROM appointments').get().count;

console.log(`Seeded ${totalLeads} fictional leads:`);
for (const row of byStatus) console.log(`  • ${row.status}: ${row.count}`);
console.log(`SMS messages: ${smsCount}`);
console.log(`Appointments: ${apptCount}`);
console.log('\n✅ Demo data ready — all patient data is fictional.');

db.close();
