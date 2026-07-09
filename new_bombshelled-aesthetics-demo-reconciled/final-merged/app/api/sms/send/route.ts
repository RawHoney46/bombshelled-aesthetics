// app/api/sms/send/route.ts
//
// PURPOSE:
// Logs a simulated SMS message. The dashboard uses this to:
//   1. Send manual outbound messages ("Reply to this lead")
//   2. Simulate inbound replies (a "Pretend they replied" button)
//
// URL: POST /api/sms/send
//
// Body: { lead_id, direction, body }

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/client';
import { logSMS, getSMSForLead } from '@/lib/sms/send';
import type { Lead } from '@/types';

/**
 * POST /api/sms/send — log a new message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate
    if (!body.lead_id || typeof body.lead_id !== 'string') {
      return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
    }
    if (body.direction !== 'inbound' && body.direction !== 'outbound') {
      return NextResponse.json(
        { error: 'direction must be "inbound" or "outbound"' },
        { status: 400 }
      );
    }
    if (!body.body || typeof body.body !== 'string' || body.body.trim().length === 0) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 });
    }

    // Verify the lead exists
    const lead = db
      .prepare('SELECT id FROM leads WHERE id = ?')
      .get(body.lead_id) as Pick<Lead, 'id'> | undefined;

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Log it
    const sms = logSMS(body.lead_id, body.direction, body.body.trim());

    return NextResponse.json({ sms }, { status: 201 });

  } catch (err) {
    console.error('POST /api/sms/send failed:', err);
    return NextResponse.json({ error: 'Failed to log SMS' }, { status: 500 });
  }
}

/**
 * GET /api/sms/send?lead_id=... — fetch conversation history for a lead
 *
 * Returns all messages for one lead, oldest first.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');

    if (!leadId) {
      return NextResponse.json({ error: 'lead_id query param is required' }, { status: 400 });
    }

    const messages = getSMSForLead(leadId);
    return NextResponse.json({ messages }, { status: 200 });

  } catch (err) {
    console.error('GET /api/sms/send failed:', err);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
