import { SIGN_GROUPS, sms, type SmsKey } from './i18n.js';
import { FAQ, TIPS } from './messages.js';
import { birthDateFromWeeks, DAY, dueDateFromMonths, dueEvents, findContent, nextItem, type CareSubject } from './schedule.js';
import { normalizePhone, parseReply, toSms } from './text.js';
import { ruleTriage } from './triage.js';

const SMS_MAX = 306;
const NOW = Date.UTC(2026, 10, 14, 9);
const WEEK = 7 * DAY;

const subject = (over: Partial<CareSubject> & { gestation?: number; babyWeeks?: number } = {}): CareSubject => {
  const { gestation = 29, babyWeeks, ...rest } = over;
  const baby = babyWeeks !== undefined;
  return {
    track: baby ? 'BABY' : 'PREGNANCY',
    expectedDueDate: baby ? null : new Date(NOW + (40 - gestation) * WEEK),
    babyBirthDate: baby ? new Date(NOW - babyWeeks * WEEK) : null,
    trackStartedAt: new Date(NOW),
    done: new Set(),
    sent: new Set(),
    ...rest,
  };
};

describe('SMS text', () => {
  it('every template fits two segments with the longest real values', () => {
    const vars = { weeks: 38, next: 'antenatal visit (week 40), Wed 30 Dec', facility: 'Dawakin Kudu General Hospital (sample)', code: '*384*2#', week: 40, label: '15-month', names: 'Penta 3, PCV 3, OPV 3, IPV, Rota 3', date: 'Wed 30 Dec', sign: 'Fever or bad-smelling discharge', worker: 'Ngozi (sample CHEW)', lga: 'Dawakin Kudu', state: 'Kano', services: 'emergency obstetric care, caesarean section, blood' };
    const keys: SmsKey[] = ['consentRequest', 'optedOut', 'welcomePregnant', 'welcomeBaby', 'ancPre', 'ancDue', 'ancMissed', 'vaccinePre', 'vaccineDue', 'vaccineMissed', 'emergencyMother', 'emergencyBaby', 'soon', 'noAnswer', 'clinic'];
    for (const lang of ['en', 'pcm'] as const) {
      for (const key of keys) {
        const text = sms(lang, key, vars);
        expect(text.length, `${lang}/${key}`).toBeLessThanOrEqual(SMS_MAX);
        expect(text, `${lang}/${key}`).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it('every validated message is ASCII and fits two segments', () => {
    for (const entry of [...TIPS, ...FAQ]) {
      for (const text of [entry.sms.en, entry.sms.pcm]) {
        expect(text.length, entry.id).toBeLessThanOrEqual(SMS_MAX);
        expect(text, entry.id).toMatch(/^[\x20-\x7E]+$/);
      }
    }
  });

  it('toSms strips special characters and caps length', () => {
    expect(toSms('Ẹ ṣé — “thanks”')).toBe('E se - "thanks"');
    expect(toSms('a'.repeat(500)).length).toBeLessThanOrEqual(SMS_MAX);
  });

  it('every danger-sign group fits the 1-9 keypad', () => {
    for (const signs of Object.values(SIGN_GROUPS)) expect(signs.length).toBeLessThanOrEqual(9);
  });
});

describe('safety rules', () => {
  it('catch danger signs in plain words and Pidgin', () => {
    for (const text of ['I dey see blood small small', 'my baby no dey suck breast since morning', 'my face and hands are swollen', 'water broke this morning', 'pikin body hot well well', 'baby eyes yellow']) {
      expect(ruleTriage(text).level, text).toBe('emergency');
    }
  });

  it('do not raise false alarms for common questions', () => {
    expect(ruleTriage('when is the yellow fever vaccine').level).toBe('routine');
    expect(ruleTriage('what does my blood test result mean').level).toBe('routine');
    expect(ruleTriage('what food should I eat').level).toBe('routine');
    expect(ruleTriage('my feet are swollen').level).toBe('soon');
    expect(ruleTriage('I have back pain').level).toBe('soon');
  });

  it('offline answers come from validated content', () => {
    expect(findContent('can I take agbo')?.id).toBe('faq-herbs');
    expect(findContent('what food should I eat')?.id).toBe('preg-16');
    expect(findContent('how do I prevent malaria')?.id).toBe('preg-12');
  });
});

describe('schedules', () => {
  it('send visit reminders before, on and after the due date, once each', () => {
    const s = subject({ gestation: 29 });
    const visit = nextItem(s, NOW)!;
    expect(visit.key).toBe('anc-30');
    const at = (ms: number, sent: string[] = []) =>
      dueEvents({ ...s, sent: new Set(sent) }, ms)
        .filter((e) => e.type === 'reminder')
        .map((e) => e.key);
    expect(at(visit.due - 3 * DAY)).toEqual([]);
    expect(at(visit.due - DAY)).toEqual(['anc-30:pre']);
    expect(at(visit.due + DAY)).toEqual(['anc-30:due']);
    expect(at(visit.due + 8 * DAY)).toEqual(['anc-30:missed']);
    expect(at(visit.due + 9 * DAY, ['anc-30:missed'])).toEqual([]);
    expect(nextItem({ ...s, done: new Set(['anc-30']) }, visit.due + 9 * DAY)?.key).toBe('anc-34');
  });

  it('give babies reminders from the national schedule', () => {
    const next = nextItem(subject({ babyWeeks: 5 }), NOW);
    expect(next?.key).toBe('vx-6w');
    expect(next?.kind === 'vaccine' && next.names).toMatch(/Penta 1/);
  });

  it('do not chase visits due before she joined', () => {
    expect(nextItem(subject({ gestation: 33 }), NOW)?.key).toBe('anc-34');
  });

  it('work out dates from months and weeks', () => {
    expect(Math.round((dueDateFromMonths(9, NOW).getTime() - NOW) / WEEK)).toBe(1);
    expect(Math.round((NOW - birthDateFromWeeks(6, NOW).getTime()) / WEEK)).toBe(6);
  });
});

describe('phone numbers and replies', () => {
  it('normalise Nigerian numbers', () => {
    expect(normalizePhone('0803 123 4567')).toBe('+2348031234567');
    expect(normalizePhone('2348031234567')).toBe('+2348031234567');
    expect(normalizePhone('+234 803 123 4567')).toBe('+2348031234567');
    expect(normalizePhone('12345')).toBeNull();
  });

  it('read SMS replies as yes, no or nothing', () => {
    for (const yes of ['YES', 'yes please', 'Y', 'Eh', 'Ee', 'Beeni', 'Bẹ́ẹ̀ni', 'I agree', '1']) expect(parseReply(yes), yes).toBe('yes');
    for (const no of ['NO', 'Stop', 'STOP!', "A'a", 'Rara', 'Mba', '2']) expect(parseReply(no), no).toBe('no');
    for (const other of ['hello', '', 'when is my visit']) expect(parseReply(other), other).toBeNull();
  });
});
