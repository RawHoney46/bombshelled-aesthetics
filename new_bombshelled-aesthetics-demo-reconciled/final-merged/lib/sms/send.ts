// lib/sms.ts
//
// PURPOSE:
// Simulates a text-messaging system. Nothing actually gets sent to a phone.
// Every "message" is just a row in the sms_log database table.
//
// This file is the WRITER and READER for that table. The conductor (API routes)
// decides WHEN to log messages; this file just handles HOW.
//
// TWO JOBS:
//   1. logSMS — write a new message row (outbound or inbound)
//   2. getSMSForLead — read all messages for one lead, oldest first
//
// REAL-WORLD UPGRADE:
// To make this real, swap the database insert in logSMS for a call to
// Twilio's API. The rest of the code wouldn't need to change.

import db from '../db/client';
import { v4 as uuidv4 } from 'uuid';
import type { SMSLog } from '@/types';

/**
 * logSMS — record a single message in the sms_log table.
 *
 * @param lead_id   The lead this message belongs to
 * @param direction 'outbound' = we sent it, 'inbound' = they sent it
 * @param body      The message text
 *
 * Returns the SMSLog row that was just inserted.
 */
export function logSMS(
  lead_id: string,
  direction: 'inbound' | 'outbound',
  body: string
): SMSLog {
  // Build the row we're about to insert. We generate id and timestamp here
  // (not in the database) so we have them in memory to return to the caller.
  const log: SMSLog = {
    id: uuidv4(),
    lead_id,
    direction,
    body,
    sent_at: new Date().toISOString(),
  };

  // Insert using parameterized SQL — the `?` placeholders prevent
  // people from breaking the database by typing weird characters
  // in their messages.
  db.prepare(
    `INSERT INTO sms_log (id, lead_id, direction, body, sent_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(log.id, log.lead_id, log.direction, log.body, log.sent_at);

  return log;
}

/**
 * getSMSForLead — fetch all messages for one lead, oldest first.
 *
 * Oldest-first means the dashboard renders the conversation top-to-bottom
 * like a normal text thread (early messages at top, latest at bottom).
 */
export function getSMSForLead(lead_id: string): SMSLog[] {
  return db
    .prepare('SELECT * FROM sms_log WHERE lead_id = ? ORDER BY sent_at ASC')
    .all(lead_id) as SMSLog[];
}