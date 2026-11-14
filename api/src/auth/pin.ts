import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Health worker PINs: 4 digits, stored only as a salted scrypt hash.
// Same format as the original service, so existing hashes carry over.
export const PIN_PATTERN = /^\d{4}$/;
export const MAX_PIN_FAILURES = 3;
export const LOCKOUT_MS = 15 * 60 * 1000;

export function hashPin(pin: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString('hex');
  return { salt, hash: scryptSync(pin, salt, 32).toString('hex') };
}

export function verifyPin(pin: string, stored: { salt: string | null; hash: string | null }): boolean {
  if (!stored.salt || !stored.hash || !PIN_PATTERN.test(pin)) return false;
  const expected = Buffer.from(stored.hash, 'hex');
  const actual = scryptSync(pin, stored.salt, expected.length);
  return timingSafeEqual(actual, expected);
}

/** Rejects PINs that are easy to guess: one digit repeated (1111) or a run (1234, 9876). */
export function isWeakPin(pin: string): boolean {
  if (!PIN_PATTERN.test(pin)) return true;
  const digits = Array.from(pin, Number);
  const steps = digits.slice(1).map((d, i) => d - digits[i]);
  return steps.every((s) => s === 0) || steps.every((s) => s === 1) || steps.every((s) => s === -1);
}
