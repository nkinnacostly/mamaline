import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { LANG_NAMES, type Lang } from '../content/i18n.js';
import { FAQ, TIPS } from '../content/messages.js';
import { toSms } from '../content/text.js';
import { LEVELS, type Level } from '../content/triage.js';

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

export type AiReply = { level: Level; text: string | null };

/**
 * Claude grades free-text messages and translates SMS. Every call is optional: when AI is
 * off, fails or declines, callers fall back to the safety rules and validated messages.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor(config: ConfigService<Env, true>) {
    const key = config.get('ANTHROPIC_API_KEY', { infer: true });
    this.client = config.get('AI_ENABLED', { infer: true }) && key ? new Anthropic({ apiKey: key }) : null;
    this.model = config.get('MAMALINE_MODEL', { infer: true });
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  /** Grades a message as EMERGENCY, SOON or ROUTINE and writes the reply. Null when AI is unavailable. */
  async respond({ text, lang, context }: { text: string; lang: Lang; context: string }): Promise<AiReply | null> {
    if (!this.client) return null;
    try {
      const raw = await this.ask(SYSTEM_PROMPT, `Reply in ${LANG_NAMES[lang]}. About her: ${context}.\nHer message: ${text}`, 'medium');
      const match = raw.match(/^\s*LEVEL:\s*(EMERGENCY|SOON|ROUTINE)\s*\n+([\s\S]+)$/i);
      if (!match) {
        this.logger.warn('Reply did not follow the LEVEL format; treating as SOON.');
        return { level: 'soon', text: null };
      }
      const level = match[1].toLowerCase() as Level;
      return { level: LEVELS.includes(level) ? level : 'soon', text: toSms(match[2]) };
    } catch (error) {
      this.logError(error, 'respond');
      return null;
    }
  }

  /**
   * Translates an English SMS into Hausa, Yoruba or Igbo (English and Pidgin are pre-written).
   * Falls back to the original after `timeoutMs`, so urgent messages are never held up.
   */
  async localize(text: string, lang: Lang, timeoutMs = 8000): Promise<string> {
    if (lang === 'en' || lang === 'pcm' || !this.client) return text;
    const translation = this.ask(TRANSLATE_PROMPT, `Language: ${LANG_NAMES[lang]}\nSMS: ${text}`, 'low')
      .then(toSms)
      .catch((error: unknown) => {
        this.logError(error, 'translate');
        return text;
      });
    const timeout = new Promise<string>((resolve) => setTimeout(() => resolve(text), timeoutMs).unref());
    return Promise.race([translation, timeout]);
  }

  private async ask(system: string, user: string, effort: 'low' | 'medium'): Promise<string> {
    const response = await this.client!.beta.messages.create({
      model: this.model,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default', // if the model declines, the API retries on Anthropic's recommended fallback model
      output_config: { effort },
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: user }],
    });
    if (response.stop_reason === 'refusal') throw new Error('model declined the request');
    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();
    if (!text) throw new Error(`empty reply (stop_reason: ${response.stop_reason})`);
    return text;
  }

  private logError(error: unknown, what: string) {
    if (error instanceof Anthropic.AuthenticationError) this.logger.error(`Invalid Anthropic API key (${what}).`);
    else if (error instanceof Anthropic.RateLimitError) this.logger.warn(`Rate limited (${what}).`);
    else if (error instanceof Anthropic.APIError) this.logger.error(`API error ${error.status} (${what}): ${error.message}`);
    else this.logger.error(`${what} failed: ${(error as Error).message}`);
  }
}
