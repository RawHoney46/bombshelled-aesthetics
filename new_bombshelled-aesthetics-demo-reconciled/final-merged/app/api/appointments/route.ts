// app/api/appointments/route.ts
//
// PURPOSE:
// Books an appointment by saving it to the appointments table. Also marks
// the lead's status as "booked" so the dashboard knows this lead converted.
//
// URL: POST /api/appointments
//
// Body: { lead_id, slot_date, slot_time, consultation_type }
// Response: 201 with { appointment, lead }
//
// We also log an SMS to confirm the booking — so the conversation history
// shows the booking happened.

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db/client';
import { logSMS } from '@/lib/sms/send';
import type { Appointment, Lead } from '@/types';

/**
 * POST /api/appointments — create a new appointment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.lead_id || typeof body.lead_id !== 'string') {
      return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
    }
    if (!body.slot_date || typeof body.slot_date !== 'string') {
      return NextResponse.json({ error: 'slot_date is required' }, { status: 400 });
    }
    if (!body.slot_time || typeof body.slot_time !== 'string') {
      return NextResponse.json({ error: 'slot_time is required' }, { status: 400 });
    }
    if (!body.consultation_type || typeof body.consultation_type !== 'string') {
      return NextResponse.json({ error: 'consultation_type is required' }, { status: 400 });
    }
    if (!['in-person', 'virtual'].includes(body.consultation_type)) {
      return NextResponse.json({ error: 'consultation_type must be "in-person" or "virtual"' }, { status: 400 });
    }

    // Verify the lead exists
    const lead = db
      .prepare('SELECT * FROM leads WHERE id = ?')
      .get(body.lead_id) as Lead | undefined;

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Build the appointment object
    const appointment: Appointment = {
      id: uuidv4(),
      lead_id: body.lead_id,
      slot_date: body.slot_date,
      slot_time: body.slot_time,
      consultation_type: body.consultation_type,
      confirmed: 1, // SQLite stores booleans as 0/1
      created_at: new Date().toISOString(),
    };

    // Save the appointment
    db.prepare(
      `INSERT INTO appointments (id, lead_id, slot_date, slot_time, consultation_type, confirmed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      appointment.id,
      appointment.lead_id,
      appointment.slot_date,
      appointment.slot_time,
      appointment.consultation_type,
      appointment.confirmed ? 1 : 0, // SQLite stores booleans as 0/1
      appointment.created_at
    );

    // Update the lead's status to "booked"
    db.prepare('UPDATE leads SET status = ? WHERE id = ?').run('booked', lead.id);
    lead.status = 'booked';

    // Log a confirmation SMS so the conversation shows the booking
    const confirmationMsg = `Booking confirmed for ${appointment.slot_date} at ${appointment.slot_time}. We'll see you then!`;
    logSMS(lead.id, 'outbound', confirmationMsg);

    return NextResponse.json({ appointment, lead }, { status: 201 });

  } catch (err) {
    console.error('POST /api/appointments failed:', err);
    return NextResponse.json({ error: 'Failed to book appointment' }, { status: 500 });
  }
}

/**
 * GET /api/appointments — list all appointments, newest first
 * Optional query param: ?lead_id=... to filter by lead
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');

    let appointments;
    if (leadId) {
      appointments = db
        .prepare('SELECT * FROM appointments WHERE lead_id = ? ORDER BY created_at DESC')
        .all(leadId) as Appointment[];
    } else {
      appointments = db
        .prepare('SELECT * FROM appointments ORDER BY created_at DESC')
        .all() as Appointment[];
    }

    return NextResponse.json({ appointments }, { status: 200 });
  } catch (err) {
    console.error('GET /api/appointments failed:', err);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}
