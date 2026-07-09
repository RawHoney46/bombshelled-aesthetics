// app/api/calendar/slots/route.ts
//
// PURPOSE:
// Returns the list of available appointment slots that the booking page
// will display as clickable buttons.
//
// URL: GET /api/calendar/slots
//
// This is the simplest route in the project. Call the lib, return the result.
// No validation, no database, no AI — the lib does everything.

import { NextResponse } from 'next/server';
import { getAvailableSlots } from '@/lib/calendar/slots';

/**
 * GET /api/calendar/slots
 *
 * Response: 200 with { slots: CalendarSlot[] }
 */
export async function GET() {
  try {
    const slots = getAvailableSlots();
    return NextResponse.json({ slots }, { status: 200 });
  } catch (err) {
    console.error('GET /api/calendar/slots failed:', err);
    return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 });
  }
}
