// lib/scoring/calculate.ts
//
// PURPOSE:
// Scores a Bombshelled Aesthetics lead from 0 to 100 based on three simple
// rules:
//   1. How ready is their timeline?
//   2. How specific is their procedure interest?
//   3. How complete is their submission?
//
// This file is a PURE FUNCTION — given the same lead, it always returns the
// same score. No database. No network calls. No randomness. Just math.
//
// Why we keep this separate from Claude:
//   - Speed: runs instantly, no API call
//   - Cost: nothing
//   - Predictable: the dashboard shows consistent numbers
//   - Transparent: you can explain exactly why a lead got an 85
//
// IMPORTANT — this score is a lead-readiness signal for the front-desk
// team only. It has no clinical meaning and must never be presented as a
// suitability or medical judgment.
//
// Total possible: 45 (timeline) + 30 (procedure specificity) +
// 10 (notes) + 10 (email) + 5 (out-of-town) = 100. We still keep the
// defensive Math.min(100, score) cap below in case factors are added later.

import type { Lead } from '@/types';

/**
 * scoreLead — main scoring function.
 *
 * Accepts a Partial<Lead> because newly-submitted leads may not have all
 * fields filled in. Missing fields just contribute 0 points — the function
 * never crashes on incomplete data.
 */
export function scoreLead(lead: Partial<Lead>): number {
  let score = 0;

  // ── Timeline points ──────────────────────────────────────────────────
  // Exact matching — assumes the form is a dropdown with these values.
  // If the value doesn't match one of these three, we award 0 points.
  switch (lead.timeline) {
    case 'ready-to-book':
      score += 45;
      break;
    case 'exploring':
      score += 25;
      break;
    case 'just-researching':
      score += 10;
      break;
  }

  // ── Procedure specificity points ─────────────────────────────────────
  // Surgical and non-surgical are scored on separate tracks (Rule 4 —
  // they're different journeys with different timelines and stakes), but
  // within each track we score by SPECIFICITY OF INTENT — did they name an
  // actual procedure, or pick "other"? — not by which procedure it is.
  // We deliberately do NOT rank facelift above filler, etc. That's a
  // brand-voice call: every patient's interest matters equally regardless
  // of procedure value, even though it departs from the roofing version's
  // job-size-based ranking.
  if (lead.procedure_category === 'surgical') {
    if (lead.specific_interest === 'other-surgical') {
      score += 24;
    } else if (lead.specific_interest) {
      score += 30;
    }
  } else if (lead.procedure_category === 'non-surgical') {
    if (lead.specific_interest === 'other-nonsurgical') {
      score += 15;
    } else if (lead.specific_interest) {
      score += 20;
    }
  }

  // ── Completeness & logistics bonuses ─────────────────────────────────
  // A patient who fills in notes is more invested than one who clicks
  // through with the bare minimum. Same for email — gives us a second
  // contact channel. Out-of-town patients get a bonus too: they've cleared
  // a bigger hurdle just to consider the practice, which makes them a
  // meaningfully different (and valuable) lead category — not a footnote
  // in a notes field (Rule 5).
  if (lead.notes && lead.notes.trim().length > 0) score += 10;
  if (lead.email && lead.email.trim().length > 0) score += 10;
  if (lead.patient_location === 'out-of-town') score += 5;

  // `consultation_preference` carries no scoring weight — it's a
  // logistics detail (in-person vs. virtual), not a signal of intent.

  // ── Cap at 100 ────────────────────────────────────────────────────────
  // Our max possible is already 100, but capping is defensive. If we add
  // factors later, we never accidentally return numbers above 100.
  return Math.min(100, score);
}
