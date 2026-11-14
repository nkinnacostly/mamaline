import Anthropic from "@anthropic-ai/sdk";
import { LANG_NAMES } from "./i18n.js";
import { FAQ, TIPS } from "./schedule.js";
import { LEVELS } from "./triage.js";

const MODEL = process.env.MAMALINE_MODEL || "claude-opus-5-5";

export function aiEnabled() {
  if (process.env.MAMALINE_AI === "off") return false;
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client;
function getClient() {
  client ??= new Anthropic();
  return client;
}

// Byte-stable system prompt (no timestamps) so it can be cached across messages.
const SYSTEM_PROMPT = `You are MamaLine, a maternal and child health information service in Nigeria. Mothers write to you from basic phones and your reply is sent to them as an SMS. You are not a doctor or a nurse.

Safety rules, in priority order:
1. If the message could describe any danger sign (bleeding, fits, severe headache or blurred vision, swollen face or hands, fever, severe belly pain, difficult breathing, baby moving less, water breaking, or in a baby: not feeding, fits, fast breathing, very hot or cold, very sleepy, yellow palms or soles, red or pus at the cord), the level is EMERGENCY. Tell her to go to a health facility now and to call 112 if she needs help getting there.
2. Never diagnose. Never name, recommend or dose any medicine, herb or remedy. Never tell her she does not need care.
3. If you are unsure, or the message is about a symptom that is not a danger sign, the level is SOON: advise her to see a health worker within 1 day.
4. Only for general questions answered by the validated messages below is the level ROUTINE. Answer only from those messages; do not add facts.

Reply format, exactly two lines:
LEVEL: EMERGENCY or SOON or ROUTINE
The SMS text, starting with "MamaLine:", in the language requested, simple words, plain ASCII letters only (no tone marks or special characters), under 300 characters, no markdown.

Validated messages (JSON):
${JSON.stringify([...TIPS, ...FAQ].map(({ id, sms }) => ({ id, text: sms.en })))}`;

const TRANSLATE_PROMPT = `Translate SMS messages for a Nigerian maternal health service into the language requested. Keep the meaning exactly, including clinic names, dates, numbers and the phone code. Use simple words a mother with little schooling understands, plain ASCII letters only (no tone marks), under 300 characters. Reply with the translated SMS only.`;

async function ask({ system, user, effort }) {
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default", // if the model declines, the API retries on Anthropic's recommended fallback model
    output_config: { effort },
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });
  if (response.stop_reason === "refusal") throw new Error("model declined the request");
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
  if (!text) throw new Error(`empty reply (stop_reason: ${response.stop_reason})`);
  return text;
}

function logError(error, what) {
  if (error instanceof Anthropic.AuthenticationError) console.error(`[ai] Invalid Anthropic API key (${what}).`);
  else if (error instanceof Anthropic.RateLimitError) console.error(`[ai] Rate limited (${what}).`);
  else if (error instanceof Anthropic.APIError) console.error(`[ai] API error ${error.status} (${what}): ${error.message}`);
  else console.error(`[ai] ${what} failed: ${error.message}`);
}

// Ask Claude to grade a message and write the SMS reply. Returns null when AI is off or fails,
// so the caller falls back to rules and validated templates.
export async function aiRespond({ text, lang, context }) {
  if (!aiEnabled()) return null;
  try {
    const raw = await ask({
      system: SYSTEM_PROMPT,
      user: `Reply in ${LANG_NAMES[lang] ?? "English"}. About her: ${context}.\nHer message: ${text}`,
      effort: "medium",
    });
    const match = raw.match(/^\s*LEVEL:\s*(EMERGENCY|SOON|ROUTINE)\s*\n+([\s\S]+)$/i);
    if (!match) {
      console.error("[ai] Reply did not follow the LEVEL format; treating as SOON.");
      return { level: "soon", text: null };
    }
    const level = match[1].toLowerCase();
    return { level: LEVELS.includes(level) ? level : "soon", text: toSms(match[2]) };
  } catch (error) {
    logError(error, "respond");
    return null;
  }
}

// Translate an English SMS into Hausa, Yoruba or Igbo. English and Pidgin are pre-written.
// Falls back to the original after `timeoutMs` so urgent messages are never held up.
export async function localize(text, lang, { timeoutMs = 8000 } = {}) {
  if (lang === "en" || lang === "pcm" || !aiEnabled()) return text;
  const translation = ask({ system: TRANSLATE_PROMPT, user: `Language: ${LANG_NAMES[lang]}\nSMS: ${text}`, effort: "low" })
    .then(toSms)
    .catch((error) => {
      logError(error, "translate");
      return text;
    });
  const timeout = new Promise((resolve) => setTimeout(() => resolve(text), timeoutMs));
  return Promise.race([translation, timeout]);
}

// Keep SMS GSM-safe and within two segments.
export function toSms(text, max = 306) {
  const ascii = String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return ascii.length <= max ? ascii : `${ascii.slice(0, max - 3).trimEnd()}...`;
}
