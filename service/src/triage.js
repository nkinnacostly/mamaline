// Rule-based safety net for free-text messages.
// These rules run on every message, before and independently of the AI. The AI can raise
// the urgency level but can never lower it below what these rules find.

export const LEVELS = ["routine", "soon", "emergency"];

export function maxLevel(a, b) {
  return LEVELS.indexOf(a) >= LEVELS.indexOf(b) ? a : b;
}

// Words in English, Pidgin and some common Hausa (ha), Yoruba (yo) and Igbo (ig) terms.
const EMERGENCY_RULES = [
  // "blood" counts unless it is about a test, blood pressure, group or tonic.
  { sign: "bleeding", pattern: /\b(bleed\w*|spotting|blood(?!\s*(test|level|pressure|group|tonic|count|sugar))|jini|eje|obara)\b/ },
  { sign: "fits", pattern: /\b(fits?|convuls\w*|seizure\w*|jerk\w*|faint\w*|unconscious|collapsed?|farfadiya|giri)\b/ },
  { sign: "headache", pattern: /\b(headache|head ache|head dey pain|blurr?ed|blurry|eye no clear|can'?t see|cannot see)\b/ },
  // Swollen face, hands or eyes (possible pre-eclampsia). Swollen feet alone is handled as "soon".
  { sign: "swelling", pattern: /\b(face|hands?|eyes?|body)\W+(\w+\W+){0,3}(swell\w*|swollen)|\b(swell\w*|swollen)\W+(\w+\W+){0,3}(face|hands?|eyes?|body)\b/ },
  { sign: "fever", pattern: /\b((?<!yellow\s)fever\w*|hot body|body hot|high temperature|zazzabi|iba)\b/ },
  { sign: "bellypain", pattern: /\b((belly|stomach|abdominal|abdomen|tummy) (pain|dey pain)|strong pain|severe pain|serious pain)\b/ },
  { sign: "breathing", pattern: /\b(breath\w*|cannot breathe|chest indrawing)\b/ },
  { sign: "movement", pattern: /(not moving|no dey move|stopped moving|stop moving|moving less|no move|not kicking|no dey kick)/ },
  { sign: "water", pattern: /(water (broke|break|don break|has broken|is leaking)|leaking (water|fluid)|fluid (is )?leaking)/ },
  { sign: "feeding", pattern: /(not (feeding|sucking|breastfeeding|eating)|no dey (suck|feed|chop)|refus\w* (to )?(feed|suck|breast))/ },
  { sign: "yellow", pattern: /\b(yellow(?!\s*fever)\w*|jaundice)\b/ },
  { sign: "cord", pattern: /\b(pus|cord (is )?(red|smell\w*|swollen))\b/ },
  { sign: "sleepy", pattern: /(very sleepy|too sleepy|sleep too much|floppy|very weak|not responding|cold body|body cold)/ },
];

const SOON_RULES = [
  /\b(pain\w*|ache\w*|vomit\w*|diarrh?o?e?a\w*|stooling|cough\w*|rash\w*|itch\w*|dizz\w*|weak\w*|tired|discharge|burning|sick|ill|catarrh|malaria|swell\w*|swollen|blood pressure|temperature)\b/,
];

export function ruleTriage(text) {
  const lower = ` ${text.toLowerCase()} `;
  const signs = EMERGENCY_RULES.filter((r) => r.pattern.test(lower)).map((r) => r.sign);
  if (signs.length) return { level: "emergency", signs };
  if (SOON_RULES.some((p) => p.test(lower))) return { level: "soon", signs: [] };
  return { level: "routine", signs: [] };
}
