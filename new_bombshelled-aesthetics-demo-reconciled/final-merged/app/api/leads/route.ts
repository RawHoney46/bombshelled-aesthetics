// app/api/leads/route.ts
//
// PURPOSE:
// This file handles the URL /api/leads. It exports two functions:
//   - POST — create a new lead (form submission)
//   - GET  — list all leads (dashboard view)
//
// Next.js routes requests to the right function based on the HTTP method.
// You don't write that routing logic yourself — just name the exports
// correctly and Next handles it.
//
// THE ORCHESTRATION:
// The POST handler is the busiest function in our whole backend. It uses
// every lib file we've written:
//   - lib/scoring   → calculate the lead's score
//   - lib/claude    → ask AI for qualification
//   - lib/sms       → send the first text message
//   - lib/db        → save everything
//
// This file is the CONDUCTOR. It doesn't do the work — it coordinates
// the workers (the lib functions) in the right order.

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db/client';
import { scoreLead } from '@/lib/scoring/calculate';
import { qualifyLead } from '@/lib/ai/qualify';
import { logSMS } from '@/lib/sms/send';
import type { Lead, ProcedureCategory, SurgicalInterest, NonSurgicalInterest } from '@/types';

/**
 * POST /api/leads
 *
 * Body (JSON):
 *   Required: name, phone, procedure_category, specific_interest, timeline, patient_location, consultation_preference
 *   Optional: email, notes, travel_origin_city, needs_travel_logistics (latter two only when patient_location === 'out-of-town')
 *
 * Response:
 *   201 Created — { lead, qualification, first_sms }
 *   400 Bad Request — { error } if validation fails
 *   500 Server Error — { error } if something blew up
 */

const SURGICAL_INTERESTS: SurgicalInterest[] = [
  'breast-augmentation', 'breast-lift', 'breast-reduction', 'breast-revision',
  'tummy-tuck', 'liposuction', 'bbl', 'facelift', 'eyelid-surgery',
  'rhinoplasty', 'body-contouring', 'other-surgical',
];

const NON_SURGICAL_INTERESTS: NonSurgicalInterest[] = [
  'filler', 'microdermabrasion', 'skin-rejuvenation', 'other-nonsurgical',
];

function isValidSpecificInterest(category: ProcedureCategory, interest: string): boolean {
  if (category === 'surgical') {
    return SURGICAL_INTERESTS.includes(interest as SurgicalInterest);
  }
  if (category === 'non-surgical') {
    return NON_SURGICAL_INTERESTS.includes(interest as NonSurgicalInterest);
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // ───────────────────────────────────────────────────────────────────
    // STEP 1: Parse the request body
    // ───────────────────────────────────────────────────────────────────
    const body = await request.json();

    // ───────────────────────────────────────────────────────────────────
    // STEP 2: Validate
    // ───────────────────────────────────────────────────────────────────
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!body.phone || typeof body.phone !== 'string' || body.phone.trim().length === 0) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
    }
    if (!body.procedure_category || !['surgical', 'non-surgical'].includes(body.procedure_category)) {
      return NextResponse.json({ error: 'Valid procedure_category is required' }, { status: 400 });
    }
    if (!body.specific_interest || typeof body.specific_interest !== 'string') {
      return NextResponse.json({ error: 'Valid specific_interest is required' }, { status: 400 });
    }
    if (!isValidSpecificInterest(body.procedure_category, body.specific_interest)) {
      return NextResponse.json(
        { error: 'specific_interest must belong to the chosen procedure_category' },
        { status: 400 }
      );
    }
    if (!body.timeline || !['ready-to-book', 'exploring', 'just-researching'].includes(body.timeline)) {
      return NextResponse.json({ error: 'Valid timeline is required' }, { status: 400 });
    }
    if (!body.patient_location || !['local', 'out-of-town'].includes(body.patient_location)) {
      return NextResponse.json({ error: 'Valid patient_location is required' }, { status: 400 });
    }
    if (!body.consultation_preference || !['in-person', 'virtual'].includes(body.consultation_preference)) {
      return NextResponse.json({ error: 'Valid consultation_preference is required' }, { status: 400 });
    }
    if (body.patient_location === 'out-of-town' && !body.travel_origin_city) {
      return NextResponse.json({ error: 'travel_origin_city is required for out-of-town leads' }, { status: 400 });
    }

    // ───────────────────────────────────────────────────────────────────
    // STEP 3: Build the lead object
    // ───────────────────────────────────────────────────────────────────
    const lead: Lead = {
      id: uuidv4(),
      name: body.name.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim(),
      procedure_category: body.procedure_category,
      specific_interest: body.specific_interest,
      timeline: body.timeline,
      patient_location: body.patient_location,
      travel_origin_city: body.patient_location === 'out-of-town' ? body.travel_origin_city?.trim() : undefined,
      needs_travel_logistics: body.patient_location === 'out-of-town' ? (body.needs_travel_logistics ? 1 : 0) : undefined,
      consultation_preference: body.consultation_preference,
      notes: body.notes?.trim(),
      score: 0,
      status: 'new',
      ai_summary: undefined,
      created_at: new Date().toISOString(),
    };

    // ───────────────────────────────────────────────────────────────────
    // STEP 4: Score the lead (instant, deterministic)
    // ───────────────────────────────────────────────────────────────────
    lead.score = scoreLead(lead);

    // ───────────────────────────────────────────────────────────────────
    // STEP 5: Save the lead to the database
    // ───────────────────────────────────────────────────────────────────
    // We save BEFORE calling Claude so that even if Claude fails, we still
    // captured the lead. Losing a lead because the AI hiccupped is worse
    // than having a lead without AI analysis.
    db.prepare(
      `INSERT INTO leads (id, name, phone, email, procedure_category, specific_interest, timeline, patient_location, travel_origin_city, needs_travel_logistics, consultation_preference, notes, score, status, ai_summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
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

    // ───────────────────────────────────────────────────────────────────
    // STEP 6: Ask Claude to qualify the lead (slow, 1-3 seconds)
    // ───────────────────────────────────────────────────────────────────
    // Wrapped in its own try/catch so that if Claude fails, we still return
    // the lead to the frontend instead of crashing the whole request.
    let qualification = null;
    let firstSms = null;

    try {
      qualification = await qualifyLead(lead);

      // ─────────────────────────────────────────────────────────────────
      // STEP 7: Update the lead with the AI summary
      // ─────────────────────────────────────────────────────────────────
      db.prepare(
        `UPDATE leads SET ai_summary = ?, status = ? WHERE id = ?`
      ).run(qualification.summary, 'qualified', lead.id);

      lead.ai_summary = qualification.summary;
      lead.status = 'qualified';

      // ─────────────────────────────────────────────────────────────────
      // STEP 8: Log the first SMS using Claude's suggested message
      // ─────────────────────────────────────────────────────────────────
      firstSms = logSMS(lead.id, 'outbound', qualification.first_message);
    } catch (aiError) {
      // Claude failed, but the lead is saved. Log it for debugging.
      // The dashboard can show this lead as "needs manual qualification."
      console.error('AI qualification failed:', aiError);
    }

    // ───────────────────────────────────────────────────────────────────
    // STEP 9: Respond
    // ───────────────────────────────────────────────────────────────────
    // 201 = Created. This is the right status code when a POST creates
    // a new resource.
    return NextResponse.json(
      { lead, qualification, first_sms: firstSms },
      { status: 201 }
    );

  } catch (err) {
    // Catch-all for unexpected errors (bad JSON, database issues, etc).
    // We log the real error server-side, but return a generic message to
    // the client — never leak internal details to the outside world.
    console.error('POST /api/leads failed:', err);
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/leads
 *
 * Returns all leads, newest first. Used by the dashboard.
 *
 * Response:
 *   200 OK — { leads: Lead[] }
 *   500 Server Error — { error }
 */
export async function GET() {
  try {
    const leads = db
      .prepare('SELECT * FROM leads ORDER BY created_at DESC')
      .all() as Lead[];

    return NextResponse.json({ leads }, { status: 200 });
  } catch (err) {
    console.error('GET /api/leads failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
