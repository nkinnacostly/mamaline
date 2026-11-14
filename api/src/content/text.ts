/** Keeps an SMS GSM-safe (plain ASCII) and within two segments (306 characters). */
export function toSms(text: string, max = 306): string {
  const ascii = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\n]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return ascii.length <= max ? ascii : `${ascii.slice(0, max - 3).trimEnd()}...`;
}

/** Accepts 0803..., 234803..., +234 803 ... and returns +234803...; null if it is not a Nigerian mobile number. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  let national: string | null = null;
  if (digits.length === 11 && digits.startsWith('0')) national = digits.slice(1);
  else if (digits.length === 13 && digits.startsWith('234')) national = digits.slice(3);
  else if (digits.length === 10) national = digits;
  return national && /^[789]\d{9}$/.test(national) ? `+234${national}` : null;
}

/** Reads a reply to the consent request (or STOP), with common words in Pidgin, Hausa, Yoruba and Igbo. */
const YES = new Set(['yes', 'y', 'yeah', 'yep', 'ok', 'okay', 'agree', '1', 'eh', 'ee', 'ii', 'beeni', 'bee']);
const NO = new Set(['no', 'n', '2', 'stop', 'quit', 'cancel', 'unsubscribe', 'end', 'aa', 'rara', 'mba']);

export function parseReply(text: string): 'yes' | 'no' | null {
  const word = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)[0];
  if (!word) return null;
  if (YES.has(word) || (word === 'i' && /agree/i.test(text))) return 'yes';
  if (NO.has(word)) return 'no';
  return null;
}
