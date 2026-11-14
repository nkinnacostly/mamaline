import { readFileSync } from "node:fs";

const DIR = JSON.parse(readFileSync(new URL("../knowledge/directory.json", import.meta.url), "utf8"));
export const facilities = DIR.facilities;
export const healthWorkers = DIR.healthWorkers;

const normalize = (s) => ` ${String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
const mentions = (location, place) => normalize(location).includes(normalize(place));

export function matchFacility(location) {
  return facilities.find((f) => f.places.some((p) => mentions(location, p))) ?? null;
}

export function getFacility(id) {
  return facilities.find((f) => f.id === id) ?? null;
}

export function matchHealthWorker(location) {
  return healthWorkers.find((w) => w.places.some((p) => mentions(location, p))) ?? null;
}

export function getHealthWorker(id) {
  return healthWorkers.find((w) => w.id === id) ?? null;
}

export function healthWorkerByPhone(phone) {
  return healthWorkers.find((w) => w.phone === phone) ?? null;
}

// Accepts 0803..., 234803..., +234 803 ... and returns +234803...; null if it is not a Nigerian mobile number.
export function normalizePhone(input) {
  const digits = String(input ?? "").replace(/[^\d]/g, "");
  let national = null;
  if (digits.length === 11 && digits.startsWith("0")) national = digits.slice(1);
  else if (digits.length === 13 && digits.startsWith("234")) national = digits.slice(3);
  else if (digits.length === 10) national = digits;
  return national && /^[789]\d{9}$/.test(national) ? `+234${national}` : null;
}
