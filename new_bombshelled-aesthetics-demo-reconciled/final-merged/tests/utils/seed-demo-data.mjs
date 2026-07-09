import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { scoreLead } from './lib/scoring/calculate.ts';

const db = new Database(path.join(process.cwd(), 'data', 'demo.db'));

console.log('=== SEEDING CLEAN DEMO DATA ===\n');

// Step 1: Delete existing data
console.log('Step 1: Clearing existing data...');
db.prepare('DELETE FROM sms_log').run();
db.prepare('DELETE FROM appointments').run();
db.prepare('DELETE FROM leads').run();
console.log('  ✓ Cleared all leads, appointments, and SMS logs\n');

// Step 2: Insert 4 leads with timestamps spread across 3 days
console.log('Step 2: Inserting leads...\n');

const now = new Date('2026-06-25T14:00:00Z');
const day1 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 3 days ago
const day2 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 2 days ago
const day3 = new Date(now.getTime() - 0.5 * 24 * 60 * 60 * 1000); // 12 hours ago

const leads = [
  {
    id: uuidv4(),
    name: 'Maria Gonzalez',
    phone: '214-555-0142',
    email: 'maria.gonzalez@email.com',
    damage_type: 'hail',
    urgency: 'immediate',
    notes: 'Roof leaking after last week\'s storm, water coming into the attic',
    status: 'new',
    created_at: new Date(day1.getTime() + 9 * 60 * 60 * 1000).toISOString(), // 9 AM
  },
  {
    id: uuidv4(),
    name: 'James Whitfield',
    phone: '214-555-0156',
    email: 'james.whitfield@email.com',
    damage_type: 'storm',
    urgency: 'this-week',
    notes: 'Several shingles missing after high winds',
    status: 'qualifying',
    created_at: new Date(day2.getTime() + 14 * 60 * 60 * 1000).toISOString(), // 2 PM
  },
  {
    id: uuidv4(),
    name: 'Patricia Reyes',
    phone: '214-555-0167',
    email: 'patricia.reyes@email.com',
    damage_type: 'full-replace',
    urgency: 'immediate',
    notes: '20 year old roof, insurance adjuster already came out, ready to move forward',
    status: 'qualified',
    ai_summary: 'Homeowner has completed insurance inspection and is ready to proceed with full roof replacement. High-priority project with confirmed insurance coverage and immediate timeline.',
    created_at: new Date(day2.getTime() + 11 * 60 * 60 * 1000).toISOString(), // 11 AM
  },
  {
    id: uuidv4(),
    name: 'Robert Kim',
    phone: '214-555-0178',
    email: 'robert.kim@email.com',
    damage_type: 'leak',
    urgency: 'this-week',
    notes: 'Small leak in the garage ceiling',
    status: 'booked',
    created_at: new Date(day3.getTime() + 10 * 60 * 60 * 1000).toISOString(), // 10 AM
  },
];

// Calculate scores for all except Maria (status: 'new' = no pre-qualification)
leads.forEach((lead, idx) => {
  if (idx > 0) { // Skip Maria (index 0)
    lead.score = scoreLead(lead);
  } else {
    lead.score = 0; // Maria hasn't been scored yet
  }
});

// Insert leads
const insertLead = db.prepare(`
  INSERT INTO leads (id, name, phone, email, damage_type, urgency, notes, score, status, ai_summary, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

leads.forEach((lead, idx) => {
  insertLead.run(
    lead.id,
    lead.name,
    lead.phone,
    lead.email,
    lead.damage_type,
    lead.urgency,
    lead.notes,
    lead.score,
    lead.status,
    lead.ai_summary || null,
    lead.created_at
  );
  console.log(`  ✓ ${lead.name} (${lead.status}, score: ${lead.score})`);
});

console.log('\n');

// Step 3: Add SMS logs
console.log('Step 3: Adding SMS logs...\n');

const smsInsert = db.prepare(`
  INSERT INTO sms_log (id, lead_id, direction, body, sent_at)
  VALUES (?, ?, ?, ?, ?)
`);

// James Whitfield - degraded fallback SMS (soft message when AI failed)
const jamesSms = {
  id: uuidv4(),
  lead_id: leads[1].id,
  direction: 'outbound',
  body: 'Hi James! Thanks for reaching out about your roof damage. We\'d like to get someone out to inspect this week. When works best for you? - Dallas Elite Roofing',
  sent_at: new Date(leads[1].created_at).toISOString(),
};

smsInsert.run(jamesSms.id, jamesSms.lead_id, jamesSms.direction, jamesSms.body, jamesSms.sent_at);
console.log(`  ✓ James Whitfield: Degraded SMS (soft fallback message)`);

// Patricia Reyes - real AI-generated SMS
const patriciaSms = {
  id: uuidv4(),
  lead_id: leads[2].id,
  direction: 'outbound',
  body: 'Hi Patricia! Great to hear your insurance is ready. We can schedule your roof replacement this week. Our team will handle the claim coordination. When would you like us to start? - Dallas Elite Roofing',
  sent_at: new Date(leads[2].created_at).toISOString(),
};

smsInsert.run(patriciaSms.id, patriciaSms.lead_id, patriciaSms.direction, patriciaSms.body, patriciaSms.sent_at);
console.log(`  ✓ Patricia Reyes: Real AI-generated SMS`);

// Robert Kim - booking confirmation SMS
const robertSms = {
  id: uuidv4(),
  lead_id: leads[3].id,
  direction: 'outbound',
  body: 'Hi Robert! Your appointment is confirmed for Thursday, Jun 27 at 10:00 AM. Our inspector will assess the garage leak. See you then! - Dallas Elite Roofing',
  sent_at: new Date(leads[3].created_at).toISOString(),
};

smsInsert.run(robertSms.id, robertSms.lead_id, robertSms.direction, robertSms.body, robertSms.sent_at);
console.log(`  ✓ Robert Kim: Booking confirmation SMS`);

console.log('\n');

// Step 4: Add appointments
console.log('Step 4: Adding appointments...\n');

const appointmentInsert = db.prepare(`
  INSERT INTO appointments (id, lead_id, slot_date, slot_time, confirmed, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const robertAppointment = {
  id: uuidv4(),
  lead_id: leads[3].id,
  slot_date: 'Jun 27',
  slot_time: '10:00 AM',
  confirmed: 1,
  created_at: new Date(leads[3].created_at).toISOString(),
};

appointmentInsert.run(
  robertAppointment.id,
  robertAppointment.lead_id,
  robertAppointment.slot_date,
  robertAppointment.slot_time,
  robertAppointment.confirmed,
  robertAppointment.created_at
);

console.log(`  ✓ Robert Kim: Appointment booked for ${robertAppointment.slot_date} at ${robertAppointment.slot_time}`);

console.log('\n');

// Step 5: Verify
console.log('Step 5: Verification\n');

const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
const newCount = db.prepare('SELECT COUNT(*) as count FROM leads WHERE status = ?').get('new').count;
const qualifyingCount = db.prepare('SELECT COUNT(*) as count FROM leads WHERE status = ?').get('qualifying').count;
const qualifiedCount = db.prepare('SELECT COUNT(*) as count FROM leads WHERE status = ?').get('qualified').count;
const bookedCount = db.prepare('SELECT COUNT(*) as count FROM leads WHERE status = ?').get('booked').count;

console.log(`Total leads: ${totalLeads}`);
console.log(`  • New: ${newCount}`);
console.log(`  • Qualifying: ${qualifyingCount}`);
console.log(`  • Qualified: ${qualifiedCount}`);
console.log(`  • Booked: ${bookedCount}`);

const smsCount = db.prepare('SELECT COUNT(*) as count FROM sms_log').get().count;
const appointmentCount = db.prepare('SELECT COUNT(*) as count FROM appointments').get().count;

console.log(`\nSMS messages: ${smsCount}`);
console.log(`Appointments: ${appointmentCount}`);

console.log('\n✅ DEMO DATA SEEDED SUCCESSFULLY');
console.log('\nReady for client demo!');

db.close();
