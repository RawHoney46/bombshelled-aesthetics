// lib/validation/lead.ts
//
// PURPOSE:
// Input-validation rules for the lead capture flow, shared by the LeadForm
// client component and the POST /api/leads handler. Both layers enforce the
// same rules — the form for friendly inline errors, the API because it can
// be called directly without the form. Importing from one place keeps the
// two from drifting apart.
//
// These checks are deliberately lenient — catch obvious garbage, don't
// over-restrict. This is a demo capturing fictional patient data.

// A "letter" here includes common accented Latin characters so names like
// "Renée" or "José" pass. (\p{L} would be broader, but requires an ES2018+
// compile target — this project targets ES2017.)
const LETTER = /[A-Za-zÀ-ÖØ-öø-ÿ]/;

/**
 * Name: at least 2 characters, must contain at least one letter, and may
 * only contain letters, spaces, hyphens, apostrophes, and periods.
 * Rejects digits-only or symbol-only entries.
 */
export function isValidName(name: string): boolean {
  const trimmed = name.trim();
  return (
    trimmed.length >= 2 &&
    LETTER.test(trimmed) &&
    /^[A-Za-zÀ-ÖØ-öø-ÿ\s'’.-]+$/.test(trimmed)
  );
}

/**
 * Phone: US-format. Strips spaces, dashes, dots, and parentheses, allows an
 * optional +1 (or bare 1) country prefix, then requires exactly 10 digits.
 * Anything containing letters fails.
 *
 * US-only is intentional: the practice serves DFW plus out-of-town US
 * patients. If they ever take international destination patients, this
 * rule needs loosening.
 */
export function isValidPhone(phone: string): boolean {
  const stripped = phone.replace(/[\s.\-()]/g, '');
  return /^(\+?1)?\d{10}$/.test(stripped);
}

/**
 * Email: standard "looks like an email" shape — something@something.tld.
 * Only call this when an email was actually provided; the field is optional.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/**
 * Travel city: just needs at least one letter — rejects digits-only or
 * symbols-only entries without being picky about city-name formats.
 */
export function isValidTravelCity(city: string): boolean {
  return LETTER.test(city);
}
