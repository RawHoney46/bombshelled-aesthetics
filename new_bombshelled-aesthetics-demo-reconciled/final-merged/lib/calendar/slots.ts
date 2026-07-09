// lib/calendar.ts
//
// PURPOSE:
// Generates available appointment slots for the demo. No real conflict
// checking — every slot returned is marked available: true.
//
// SPEC:
//   - 10 slots total
//   - Spread across the next 5 weekdays (Mon-Fri only)
//   - 2 slots per day: 10:00 AM and 2:00 PM
//   - All marked available: true
//
// This is a "demo-quality" calendar. A production version would check the
// appointments table for conflicts and mark booked slots as available: false.

import type { CalendarSlot } from '@/types';

/**
 * getAvailableSlots — returns 10 slots across the next 5 weekdays.
 *
 * Slot times:
 *   10:00 AM (morning) and 2:00 PM (afternoon) on each day
 *
 * Weekdays only — skips Saturday (6) and Sunday (0). If today is Friday,
 * we'll roll into next Monday for the remaining slots.
 */
export function getAvailableSlots(): CalendarSlot[] {
  const slots: CalendarSlot[] = [];
  const today = new Date();

  // Walk forward day by day until we have 5 weekdays. We start tomorrow
  // (skip today — same-day bookings usually need a phone call).
  let dayOffset = 1;
  let weekdaysFound = 0;

  while (weekdaysFound < 5) {
    const date = new Date(today);
    date.setDate(today.getDate() + dayOffset);

    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;

    if (isWeekday) {
      const dateStr = formatDate(date);

      // Two slots for this weekday: morning + afternoon
      slots.push({
        date: dateStr,
        time: '10:00',
        available: true,
      });
      slots.push({
        date: dateStr,
        time: '14:00',
        available: true,
      });

      weekdaysFound++;
    }

    dayOffset++;
  }

  return slots;
}

/**
 * formatDate — converts a Date to "YYYY-MM-DD" string.
 * This is the ISO date format, what databases and APIs expect.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
