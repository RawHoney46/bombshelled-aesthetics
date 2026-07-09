// app/api/leads/[id]/qualify/route.ts
//
// PURPOSE:
// Re-runs Claude's AI qualification on an existing lead. Useful when the
// original qualification failed (e.g., no API credits at the time) or when
// you want to manually re-qualify a lead after editing it.
//
// URL: POST /api/leads/abc123/qualify  (where abc123 is the lead's id)
//
// The [id] in the folder name means "this part of the URL is a variable."
// Next.js extracts it and passes it via the params object.

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/client';
import { qualifyLead } from '@/lib/ai/qualify';
import { logSMS } from '@/lib/sms/send';
import type { Lead } from '@/types';

/**
 * POST /api/leads/[id]/qualify
 *
 * Response: 200 with { lead, qualification, first_sms } on success
 *           404 if the lead doesn't exist
 *           502 if Claude fails (Bad Gateway — upstream service unhappy)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;

    // Step 1: Find the lead in the database
    const lead = db
      .prepare('SELECT * FROM leads WHERE id = ?')
      .get(leadId) as Lead | undefined;

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Step 2: Ask Claude to qualify (this is the part that might fail)
    let qualification;
    try {
      qualification = await qualifyLead(lead);
    } catch (aiError) {
      console.error('AI qualification failed:', aiError instanceof Error ? aiError.message : String(aiError));
      // AI failed: set status to 'qualifying' but don't write ai_summary
      // (since we have no real summary), and don't log an SMS yet
      db.prepare(
        `UPDATE leads SET status = ? WHERE id = ?`
      ).run('qualifying', lead.id);
      lead.status = 'qualifying';
      // Return 200 with null qualification and first_sms to match success shape
      return NextResponse.json(
        { lead, qualification: null, first_sms: null },
        { status: 200 }
      );
    }

    // Step 3: Update the lead with AI summary and mark as qualified
    db.prepare(
      `UPDATE leads SET ai_summary = ?, status = ? WHERE id = ?`
    ).run(qualification.summary, 'qualified', lead.id);

    lead.ai_summary = qualification.summary;
    lead.status = 'qualified';

    // Step 4: Log the suggested first message as an outbound SMS
    const firstSms = logSMS(lead.id, 'outbound', qualification.first_message);

    return NextResponse.json(
      { lead, qualification, first_sms: firstSms },
      { status: 200 }
    );

  } catch (err) {
    console.error('POST /api/leads/[id]/qualify failed:', err);
    return NextResponse.json({ error: 'Failed to qualify lead' }, { status: 500 });
  }
}
