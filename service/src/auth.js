import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Health worker PINs: 4 digits, stored only as a salted scrypt hash.
export const PIN_PATTERN = /^\d{4}$/;
export const MAX_PIN_FAILURES = 3;
export const LOCKOUT_MS = 15 * 60 * 1000;

export function hashPin(pin) {
  const salt = randomBytes(16).toString("hex");
  return { salt, hash: scryptSync(pin, salt, 32).toString("hex") };
}

export function verifyPin(pin, record) {
  if (!record || !PIN_PATTERN.test(pin)) return false;
  const expected = Buffer.from(record.hash, "hex");
  const actual = scryptSync(pin, record.salt, expected.length);
  return timingSafeEqual(actual, expected);
}

// Rejects PINs that are easy to guess: one digit repeated (1111) or a run (1234, 9876).
export function weakPin(pin) {
  if (!PIN_PATTERN.test(pin)) return true;
  const d = [...pin].map(Number);
  const steps = d.slice(1).map((n, i) => n - d[i]);
  return steps.every((s) => s === 0) || steps.every((s) => s === 1) || steps.every((s) => s === -1);
}
