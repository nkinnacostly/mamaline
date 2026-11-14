import type { Lang, Sign, SignGroup } from '../content/i18n.js';

/**
 * Work a USSD screen asks for. The screen is answered first; these run afterwards,
 * because the network closes a USSD session if the server takes more than a few seconds.
 */
export type Action =
  | {
      type: 'register';
      phone: string;
      lang: Lang;
      track: 'PREGNANCY' | 'BABY';
      /** Months pregnant (pregnancy) or baby's age in weeks (baby). */
      amount: number;
      location: string;
      registeredBy: 'SELF' | 'HEALTH_WORKER';
      healthWorkerId?: string;
    }
  | { type: 'consent'; phone: string; answer: 'yes' | 'no'; channel: 'USSD' | 'SMS' }
  | { type: 'emergency'; phone: string; lang: Lang; group: SignGroup; sign: Sign; location: string | null }
  | { type: 'respond'; phone: string; lang: Lang; isProblem: boolean; group?: SignGroup; text: string }
  | { type: 'sendClinic'; phone: string; lang: Lang }
  | { type: 'markDone'; phone: string; itemKey: string }
  | { type: 'setLanguage'; phone: string; lang: Lang }
  | { type: 'sendFollowups'; healthWorkerId: string }
  | { type: 'setPin'; healthWorkerId: string; pin: string };
