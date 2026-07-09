// lib/ai/qualify.ts
//
// PURPOSE:
// Talks to Claude over the internet. Takes a lead, sends it to the AI, gets
// back a structured analysis: summary, urgency, suggested first message,
// and recommended next action.
//
// WHY THIS FILE EXISTS:
// Everything else in the backend is rules and plumbing. This file is the
// "AI" in the speed-to-lead flow. Without it, the demo is just a fancy
// contact form. With it, the demo can read a lead like a warm, attentive
// patient coordinator would.
//
// SAFETY NOTE — READ BEFORE EDITING:
// This file must never ask Claude to assess procedure suitability, give
// medical guidance, or imply a diagnosis. "Qualification" here means
// reading the patient's stated INTENT and READINESS to move forward — it
// is a sales/scheduling signal, not a clinical one. Both prompt builders
// below carry the same hard constraints for this reason; if you add a
// third builder, carry them forward too.
//
// SECURITY NOTE:
// This file MUST stay server-side. It uses the ANTHROPIC_API_KEY environment
// variable, which is a paid credential. If this code ran in the browser,
// anyone could see and steal the key. Next.js API routes are server-side
// by default — that's why we put this in lib/ and call it only from
// app/api/ route files.

import Anthropic from '@anthropic-ai/sdk';
import type { Lead, SpecificInterest, Timeline } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const MODEL = 'claude-haiku-4-5-20251001';   // Fast and cheap, perfect for lead qualification
const MAX_TOKENS = 600;                       // Plenty for a summary + short SMS reply
// ─────────────────────────────────────────────────────────────────────────────

// Create the Anthropic client once when the file loads.
// It automatically reads ANTHROPIC_API_KEY from process.env — we don't have
// to pass it manually. If the key is missing, calls will fail with a clear
// error, which is what we want.
const anthropic = new Anthropic();

// This is the shape of the data we ask Claude to return.
// We define it as a TypeScript type so the rest of our code knows what to
// expect after qualification runs. If we ever change what we ask Claude for,
// we change this type and TypeScript will flag every place that needs updating.
export interface LeadQualification {
  summary: string;                                     // Short description of stated intent/readiness — never a clinical read
  urgency_level: 'high' | 'medium' | 'low';            // How ready they are to move forward, NOT medical urgency
  first_message: string;                               // Personalized SMS to send back
  next_action: 'book_consultation' | 'send_info' | 'disqualify';
}

/**
 * qualifyLead — the main function. Send a lead to Claude, get back analysis.
 *
 * This is marked `async` because talking to Claude takes time — usually a
 * second or two. The function returns a Promise, which is JavaScript's way
 * of saying "the answer is coming, but not yet." Callers will `await` it.
 *
 * Throws an error if Claude can't be reached or returns something we can't
 * understand. The API route that calls this should catch those errors,
 * mark the lead as `status: 'qualifying'`, skip the SMS, and respond to the
 * user gracefully instead of crashing.
 */
export async function qualifyLead(lead: Lead): Promise<LeadQualification> {
  // Step 1: build the prompt — branch by procedure category. Surgical and
  // non-surgical patients are on different journeys (Rule 4), so they get
  // different prompt-builders, not just different field values.
  const prompt = buildPrompt(lead);

  // Step 2: call the Anthropic API.
  // `await` here means "pause this function until Claude replies."
  // While we're waiting, the server can still handle other requests.
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
  });

  // Step 3: pull the text out of Claude's response.
  // Claude can return multiple "content blocks" (text, tool use, etc).
  // For our simple case, we expect one text block. We find it and grab its text.
  const textBlock = response.content.find(block => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text content');
  }
  const rawText = textBlock.text;

  // Step 4: parse the JSON out of Claude's reply.
  // Sometimes models wrap JSON in markdown code fences (```json ... ```)
  // or add a sentence before/after. We extract just the JSON object.
  const parsed = extractJSON(rawText);

  // Step 5: validate that the parsed object has everything we need.
  // If Claude forgot a field or returned something weird, we fail loudly
  // here instead of letting bad data flow into the rest of the system.
  return validateQualification(parsed);
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * buildPrompt — routes to the right prompt-builder based on procedure_category.
 *
 * Two builders, one file (per the brief) — they share the constraint and
 * output-format text below so the hard safety rules can't drift apart, but
 * each one frames the role and tone for its own track.
 */
function buildPrompt(lead: Lead): string {
  return lead.procedure_category === 'surgical'
    ? buildSurgicalPrompt(lead)
    : buildNonSurgicalPrompt(lead);
}

/**
 * buildSurgicalPrompt — for breast, body, and facial surgical interest.
 *
 * Surgical inquiries are often someone's first real step toward a big
 * personal decision. The tone leans warm and reassuring, never salesy.
 */
function buildSurgicalPrompt(lead: Lead): string {
  return `You are a warm, attentive patient care coordinator for Bombshelled Aesthetics, Dr. Pamela Brownlee's plastic surgery practice in Frisco, TX. You help the patient care team triage incoming SURGICAL consultation requests quickly. For many patients, reaching out about a surgical procedure is a big, personal step — they should feel welcomed and taken care of, never sold to.

${HARD_CONSTRAINTS}

A new patient inquiry has just come in. Read their information and provide a structured analysis.

${formatLeadInfo(lead)}

${RESPONSE_FORMAT}

Rules:
- urgency_level reflects how READY they are to move forward — not a clinical urgency or medical severity rating. "high" = ready to book a consultation now. "medium" = exploring, genuinely interested but not committed yet. "low" = just researching, early in the process.
- next_action: "book_consultation" if they sound ready to schedule or are actively exploring with clear interest. "send_info" if they're just researching and want to learn more first. "disqualify" ONLY if the submission looks fake/spam or describes something this practice doesn't offer at all — never disqualify based on anything about the patient themselves.
- first_message: warm, empowering, patient-first — like welcoming someone into the practice family. Never urgent or transactional language like "act now" or "limited spots." Never mention price, financing, or any guaranteed outcome.
- Tone matters here especially: this person may be nervous or vulnerable about a major decision. Be kind and reassuring without minimizing or amplifying anything about their situation.

Return only the JSON object. No preamble, no explanation, no markdown code fences.`;
}

/**
 * buildNonSurgicalPrompt — for filler, skin, and other non-surgical interest.
 *
 * Non-surgical patients are often newer to the practice or exploring a
 * lower-commitment first step. Meet them where they are — light, friendly,
 * zero pressure.
 */
function buildNonSurgicalPrompt(lead: Lead): string {
  return `You are a warm, attentive patient care coordinator for Bombshelled Aesthetics, Dr. Pamela Brownlee's plastic surgery practice in Frisco, TX. You help the patient care team triage incoming NON-SURGICAL treatment requests quickly. Non-surgical patients are often newer to the practice or just curious about a lower-commitment first step — keep things light, friendly, and completely pressure-free.

${HARD_CONSTRAINTS}

A new patient inquiry has just come in. Read their information and provide a structured analysis.

${formatLeadInfo(lead)}

${RESPONSE_FORMAT}

Rules:
- urgency_level reflects how READY they are to move forward — not a clinical urgency or medical severity rating. "high" = ready to book a consultation now. "medium" = exploring, genuinely interested but not committed yet. "low" = just researching, early in the process.
- next_action: "book_consultation" if they sound ready to schedule or are actively exploring with clear interest. "send_info" if they're just researching and want to learn more first. "disqualify" ONLY if the submission looks fake/spam or describes something this practice doesn't offer at all — never disqualify based on anything about the patient themselves.
- first_message: warm, friendly, low-key — like inviting someone in for a no-pressure chat. Never urgent or transactional language like "act now" or "limited spots." Never mention price, financing, or any guaranteed outcome.

Return only the JSON object. No preamble, no explanation, no markdown code fences.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED PROMPT FRAGMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * HARD_CONSTRAINTS — the non-negotiable safety rules, shared verbatim by
 * both prompt builders so they can never drift apart from each other.
 *
 * "Qualification" in this system means reading stated intent and
 * readiness — nothing more. It is explicitly NOT a clinical assessment.
 */
const HARD_CONSTRAINTS = `CRITICAL — these rules apply no matter what:
- You are not a medical provider and this is not a clinical evaluation. Never assess, suggest, rule in, or rule out whether a procedure or treatment is right for this patient. Never comment on candidacy, suitability, anatomy, health, or appearance. Never imply a diagnosis of any kind.
- Never promise or imply a specific result, outcome, or recovery timeline. Never use before/after language.
- Your only job is to read what the patient SAID about their own interest and readiness, and reflect that back — not to evaluate them.
- If anything about the patient's notes sounds like a medical question (a symptom, a complication, a "is this normal" type question), do not answer it. Treat it only as a sign of engagement/notes-completeness, nothing more.
- If you are ever unsure whether something crosses into clinical territory, leave it out.`;

/**
 * RESPONSE_FORMAT — the exact JSON shape we want back, shared by both
 * prompt builders. Keeping this in one place means the runtime validator
 * below only has to check for one shape.
 */
const RESPONSE_FORMAT = `Respond with ONLY a valid JSON object in this exact shape, no other text:

{
  "summary": "A 1-2 sentence summary of the patient's stated interest and readiness, in plain English. Describe what they told us, not an assessment of them.",
  "urgency_level": "high" | "medium" | "low",
  "first_message": "A warm, personalized SMS to send back to the patient. Keep it under 160 characters. Mention something specific from what they shared. Sign as 'Bombshelled Aesthetics'.",
  "next_action": "book_consultation" | "send_info" | "disqualify"
}`;

/**
 * formatLeadInfo — turns a Lead into the plain-text block Claude sees.
 * Out-of-town status and consultation preference are surfaced explicitly
 * (Rules 5 & 7) so the AI's first_message can acknowledge them naturally.
 */
function formatLeadInfo(lead: Lead): string {
  const locationLine =
    lead.patient_location === 'out-of-town'
      ? `Out of town${lead.travel_origin_city ? ` (traveling from ${lead.travel_origin_city})` : ''}`
      : 'Local to the Frisco, TX area';

  return `PATIENT INFORMATION:
- Name: ${lead.name}
- Phone: ${lead.phone}
- Email: ${lead.email || '(not provided)'}
- Interested in: ${formatInterestLabel(lead.specific_interest)}
- Timeline: ${formatTimelineLabel(lead.timeline)}
- Location: ${locationLine}
- Consultation preference: ${lead.consultation_preference === 'virtual' ? 'Virtual' : 'In-person'}
- Notes from patient: ${lead.notes || '(none)'}`;
}

/** formatTimelineLabel — plain-English version of the Timeline enum. */
function formatTimelineLabel(timeline: Timeline | undefined): string {
  switch (timeline) {
    case 'ready-to-book':
      return 'Ready to book a consultation';
    case 'exploring':
      return 'Exploring options, not ready to commit yet';
    case 'just-researching':
      return 'Just researching for now';
    default:
      return '(not specified)';
  }
}

/** formatInterestLabel — plain-English version of the SpecificInterest enum. */
function formatInterestLabel(interest: SpecificInterest | undefined): string {
  const labels: Record<SpecificInterest, string> = {
    'breast-augmentation': 'breast augmentation',
    'breast-lift': 'breast lift',
    'breast-reduction': 'breast reduction',
    'breast-revision': 'breast revision',
    'tummy-tuck': 'tummy tuck',
    liposuction: 'liposuction',
    bbl: 'BBL (Brazilian Butt Lift)',
    facelift: 'facelift',
    'eyelid-surgery': 'eyelid surgery',
    rhinoplasty: 'rhinoplasty',
    'body-contouring': 'body contouring',
    'other-surgical': 'a surgical procedure (not yet specified)',
    filler: 'filler',
    microdermabrasion: 'microdermabrasion',
    'skin-rejuvenation': 'skin rejuvenation',
    'other-nonsurgical': 'a non-surgical treatment (not yet specified)',
  };
  return interest ? labels[interest] : '(not specified)';
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPERS — parsing & validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * extractJSON — finds and parses a JSON object out of Claude's reply.
 *
 * We can't always trust the AI to return pure JSON. Sometimes it wraps the
 * response in markdown like ```json ... ```. Sometimes it adds "Here's the
 * analysis:" before the JSON. This function handles those cases by finding
 * the first { and the last } and parsing whatever's between them.
 */
function extractJSON(text: string): unknown {
  // Find the first opening brace and the last closing brace.
  // Whatever's between them is hopefully our JSON object.
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Claude returned no JSON object. Got: ${text.slice(0, 200)}`);
  }

  const jsonStr = text.slice(start, end + 1);

  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(`Claude returned invalid JSON: ${jsonStr.slice(0, 200)}`);
  }
}

/**
 * validateQualification — checks that the parsed object has all the right
 * fields with the right types and values. If anything's off, we throw.
 *
 * This is called "runtime validation." TypeScript checks types when we
 * compile the code, but at runtime, data coming from an AI (or any external
 * source) could be anything. We have to check it ourselves.
 */
function validateQualification(parsed: unknown): LeadQualification {
  // First, is it an object at all?
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Claude response is not an object');
  }
  const obj = parsed as Record<string, unknown>;

  // Check each required field one by one.
  if (typeof obj.summary !== 'string' || obj.summary.length === 0) {
    throw new Error('Claude response missing valid summary');
  }
  if (!['high', 'medium', 'low'].includes(obj.urgency_level as string)) {
    throw new Error(`Claude returned invalid urgency_level: ${obj.urgency_level}`);
  }
  if (typeof obj.first_message !== 'string' || obj.first_message.length === 0) {
    throw new Error('Claude response missing valid first_message');
  }
  if (!['book_consultation', 'send_info', 'disqualify'].includes(obj.next_action as string)) {
    throw new Error(`Claude returned invalid next_action: ${obj.next_action}`);
  }

  // Everything checks out — cast and return.
  return {
    summary: obj.summary,
    urgency_level: obj.urgency_level as LeadQualification['urgency_level'],
    first_message: obj.first_message,
    next_action: obj.next_action as LeadQualification['next_action'],
  };
}
