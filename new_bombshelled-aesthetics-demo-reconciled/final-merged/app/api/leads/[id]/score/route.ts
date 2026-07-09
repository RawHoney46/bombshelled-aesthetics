// app/api/leads/[id]/score/route.ts
//
// PURPOSE:
// Re-runs the deterministic scoring function on an existing lead and
// saves the new score. Useful when scoring weights change and you want
// to refresh all existing leads, or when a lead's data has been updated.
//
// URL: POST /api/leads/abc123/score
//
// This is fast — no AI call, just math.

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/client';
import { scoreLead } from '@/lib/scoring/calculate';
import type { Lead } from '@/types';

/**
 * POST /api/leads/[id]/score
 *
 * Response: 200 with { lead, score } on success
 *           404 if the lead doesn't exist
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;

    // Find the lead
    const lead = db
      .prepare('SELECT * FROM leads WHERE id = ?')
      .get(leadId) as Lead | undefined;

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Recalculate the score
    const newScore = scoreLead(lead);

    // Save the new score
    db.prepare('UPDATE leads SET score = ? WHERE id = ?').run(newScore, lead.id);

    lead.score = newScore;

    return NextResponse.json({ lead, score: newScore }, { status: 200 });

  } catch (err) {
    console.error('POST /api/leads/[id]/score failed:', err);
    return NextResponse.json({ error: 'Failed to score lead' }, { status: 500 });
  }
}
