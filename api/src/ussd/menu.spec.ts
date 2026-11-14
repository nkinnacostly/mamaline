import { hashPin, verifyPin } from '../auth/pin.js';
import { LANG_CODES, type Lang } from '../content/i18n.js';
import { DAY } from '../content/schedule.js';
import { handleMenu, type MenuContext, type MotherView } from './menu.js';

const NOW = Date.UTC(2026, 10, 14, 9);
const WEEK = 7 * DAY;
const USSD_MAX = 182;
const PIN = '2468';

function mother(over: Partial<MotherView> & { gestation?: number; babyWeeks?: number } = {}): MotherView {
  const { gestation = 28, babyWeeks, ...rest } = over;
  const baby = babyWeeks !== undefined;
  return {
    language: 'en',
    consentStatus: 'GIVEN',
    hasHealthWorker: true,
    facilityName: 'Kura PHC (sample)',
    care: {
      track: baby ? 'BABY' : 'PREGNANCY',
      expectedDueDate: baby ? null : new Date(NOW + (40 - gestation) * WEEK),
      babyBirthDate: baby ? new Date(NOW - babyWeeks * WEEK) : null,
      trackStartedAt: new Date(NOW),
      done: new Set(),
      sent: new Set(),
    },
    ...rest,
  };
}

/** A fake context: in-memory PIN, failures and directory, like the database would answer. */
function ctx(over: Partial<MenuContext> & { pinRecord?: { salt: string; hash: string } | null; existing?: string[] } = {}) {
  const failures: number[] = [];
  const pin = over.pinRecord === undefined ? hashPin(PIN) : over.pinRecord;
  const base: MenuContext = {
    now: NOW,
    mother: null,
    healthWorker: null,
    askedLanguage: false,
    pinLocked: async () => failures.length >= 3,
    checkPin: async (p) => (pin ? verifyPin(p, pin) : false),
    recordPinFailure: async () => failures.push(NOW),
    clearPinFailures: async () => void failures.splice(0),
    motherExists: async (p) => (over.existing ?? []).includes(p),
    facilityNameFor: async (loc) => (/kura|ikire/i.test(loc) ? `${loc.trim()} PHC (sample)` : null),
    hasHealthWorkerFor: async (loc) => /kura|ikire/i.test(loc),
  };
  return { ...base, ...over };
}

const chew = (o: Parameters<typeof ctx>[0] = {}) => ctx({ healthWorker: { id: 'hw-amina', hasPin: o.pinRecord !== null }, ...o });
const dial = (phone: string, inputs: string[], c: MenuContext) => handleMenu(phone, inputs.join('*'), c);

describe('new callers', () => {
  it('choose a language, agree, then register a pregnancy', async () => {
    const c = ctx({ askedLanguage: true });
    expect((await dial('+2348011111111', [], c)).reply).toMatch(/^CON Welcome to MamaLine/);
    expect((await dial('+2348011111111', ['2'], c)).reply).toMatch(/^CON MamaLine: free help for mothers\n1\. I get belle/);
    expect((await dial('+2348011111111', ['2', '1', '6', 'Kura'], c)).reply).toMatch(/^CON MamaLine dey send free health SMS.*\n1\. I agree\n2\. No$/s);
    const last = await dial('+2348011111111', ['2', '1', '6', 'Kura', '1'], c);
    expect(last.reply).toMatch(/^END Welcome to MamaLine\. Your belle be like 26 weeks/);
    expect(last.actions).toEqual([{ type: 'register', phone: '+2348011111111', lang: 'pcm', track: 'PREGNANCY', amount: 6, location: 'Kura', registeredBy: 'SELF' }]);
  });

  it('are not registered if they say no', async () => {
    const last = await dial('+2348011111112', ['1', '2', '6', 'Kura', '2'], ctx({ askedLanguage: true }));
    expect(last.reply).toBe('END OK. Nothing has been saved.');
    expect(last.actions).toEqual([]);
  });

  it('with a sick baby get the facility for their village', async () => {
    const last = await dial('+2348033333333', ['1', '3', '3', '1', 'Ikire'], ctx({ askedLanguage: true }));
    expect(last.reply).toMatch(/Go to Ikire PHC \(sample\) now/);
    expect(last.actions[0]).toMatchObject({ type: 'emergency', group: 'baby', sign: 'feeding', location: 'Ikire' });
  });

  it('from unknown places are not told a health worker was alerted', async () => {
    const last = await dial('+2348044444444', ['1', '3', '1', '2', 'Somewhere Else'], ctx({ askedLanguage: true }));
    expect(last.reply).toMatch(/the nearest health facility/);
    expect(last.reply).not.toMatch(/alerted/);
  });
});

describe('registered mothers', () => {
  it('reach emergency advice in two key presses', async () => {
    const last = await dial('+2348022222222', ['1', '1'], ctx({ mother: mother() }));
    expect(last.reply).toMatch(/^END DANGER SIGN\. Go to Kura PHC \(sample\) now\. Call 112.*alerted\./);
    expect(last.actions[0]).toMatchObject({ type: 'emergency', sign: 'bleeding', group: 'pregnant' });
  });

  it('confirm a visit that is due', async () => {
    const c = ctx({ mother: mother({ gestation: 30 }) });
    expect((await dial('+2348022222222', ['5'], c)).reply).toMatch(/^CON Did you go for: antenatal visit \(week 30\)\?/);
    expect((await dial('+2348022222222', ['5', '1'], c)).actions).toEqual([{ type: 'markDone', phone: '+2348022222222', itemKey: 'anc-30' }]);
  });

  it('awaiting consent see the consent screen and can still get emergency help', async () => {
    const c = ctx({ mother: mother({ consentStatus: 'PENDING' }) });
    expect((await dial('+2348055555555', [], c)).reply).toMatch(/^CON Your health worker registered you.*\n0\. Danger sign$/s);
    expect((await dial('+2348055555555', ['1'], c)).actions).toEqual([{ type: 'consent', phone: '+2348055555555', answer: 'yes', channel: 'USSD' }]);
    expect((await dial('+2348055555555', ['2'], c)).actions).toEqual([{ type: 'consent', phone: '+2348055555555', answer: 'no', channel: 'USSD' }]);
    const emergency = await dial('+2348055555555', ['0', '1'], c);
    expect(emergency.reply).toMatch(/^END DANGER SIGN/);
    expect(emergency.actions[0]).toMatchObject({ type: 'emergency' });
  });
});

describe('health workers', () => {
  it('sign in with a PIN and register a mother pending consent', async () => {
    const c = chew();
    expect((await dial('+2348000000101', [], c)).reply).toBe('CON MamaLine Health Worker\nEnter your 4-digit PIN:');
    expect((await dial('+2348000000101', [PIN], c)).reply).toMatch(/^CON MamaLine Health Worker\n1\. Register pregnant woman/);
    const last = await dial('+2348000000101', [PIN, '1', '0803 123 4567', '3', '4', 'Bunkure'], c);
    expect(last.reply).toMatch(/^END Consent request sent to \+2348031234567\. Reminders start once she agrees/);
    expect(last.actions).toEqual([
      { type: 'register', phone: '+2348031234567', lang: 'ha', track: 'PREGNANCY', amount: 4, location: 'Bunkure', registeredBy: 'HEALTH_WORKER', healthWorkerId: 'hw-amina' },
    ]);
  });

  it('are locked out after 3 wrong PINs, even with the right one', async () => {
    const c = chew();
    expect((await dial('+2348000000101', ['1111'], c)).reply).toMatch(/^END Wrong PIN/);
    expect((await dial('+2348000000101', ['2222'], c)).reply).toMatch(/^END Wrong PIN/);
    expect((await dial('+2348000000101', ['3333'], c)).reply).toMatch(/^END Too many wrong PINs/);
    expect((await dial('+2348000000101', [PIN], c)).reply).toMatch(/^END Too many wrong PINs/);
  });

  it('cannot sign in without a PIN', async () => {
    expect((await dial('+2348000000101', ['1234'], chew({ pinRecord: null }))).reply).toMatch(/^END Your PIN is not set yet/);
  });

  it('can change the PIN, but not to an easy one', async () => {
    const c = chew();
    expect((await dial('+2348000000101', [PIN, '4', '1234'], c)).reply).toMatch(/too easy to guess/);
    expect((await dial('+2348000000101', [PIN, '4', '5170', '5171'], c)).reply).toMatch(/did not match/);
    const last = await dial('+2348000000101', [PIN, '4', '5170', '5170'], c);
    expect(last.reply).toBe('END Your PIN has been changed.');
    expect(last.actions).toEqual([{ type: 'setPin', healthWorkerId: 'hw-amina', pin: '5170' }]);
  });

  it('cannot register a mother twice', async () => {
    const last = await dial('+2348000000101', [PIN, '1', '08031234567'], chew({ existing: ['+2348031234567'] }));
    expect(last.reply).toMatch(/^END \+2348031234567 is already on MamaLine/);
  });
});

describe('every USSD screen fits a basic phone', () => {
  const check = (reply: string, label: string) => {
    const screen = reply.slice(4);
    expect(screen.length, `${label}: ${screen}`).toBeLessThanOrEqual(USSD_MAX);
    expect(screen, label).toMatch(/^[\x20-\x7E\n]+$/);
  };

  it.each(LANG_CODES)('in %s', async (lang: Lang) => {
    const newPaths = [[], ['1'], ['1', '5'], ['1', '5', 'Kura'], ['1', '5', 'Kura', '1'], ['1', '5', 'Kura', '2'], ['2'], ['2', '3'], ['2', '3', 'Kura'], ['3'], ['4'], ['4', 'hi'], ['9']];
    for (const g of ['1', '2', '3']) newPaths.push(['3', g], ['3', g, '1'], ['3', g, '1', 'Dawakin Kudu'], ['3', g, '0'], ['3', g, '0', 'x']);
    for (const p of newPaths) check((await dial('+234801', [String(LANG_CODES.indexOf(lang) + 1), ...p], ctx({ askedLanguage: true }))).reply, `${lang} new ${p.join('*')}`);

    for (const p of [[], ['1'], ['1', '1'], ['1', '0'], ['1', '0', 'x'], ['2'], ['3'], ['4'], ['5'], ['5', '1'], ['5', '2'], ['6'], ['6', '3']]) {
      check((await dial('+234802', p, ctx({ mother: mother({ language: lang, gestation: 29 }) }))).reply, `${lang} pregnant ${p.join('*')}`);
    }
    for (const p of [['1'], ['1', '1'], ['1', '2'], ['1', '2', '7'], ['1', '1', '4'], ['3'], ['5']]) {
      check((await dial('+234803', p, ctx({ mother: mother({ language: lang, babyWeeks: 6 }) }))).reply, `${lang} baby ${p.join('*')}`);
    }
    for (const p of [[], ['1'], ['2'], ['0'], ['0', '1']]) {
      check((await dial('+234805', p, ctx({ mother: mother({ language: lang, consentStatus: 'PENDING' }) }))).reply, `${lang} pending ${p.join('*')}`);
    }
  });

  it('for health workers', async () => {
    const paths = [[], ['9999'], [PIN], [PIN, '1'], [PIN, '1', '08031234567'], [PIN, '1', '08031234567', '1'], [PIN, '1', '08031234567', '1', '5'], [PIN, '1', '08031234567', '1', '5', 'Kura'], [PIN, '2', '08031234567', '1'], [PIN, '3'], [PIN, '4'], [PIN, '4', '1111'], [PIN, '4', '5170'], [PIN, '4', '5170', '5170'], [PIN, '4', '5170', '1234']];
    for (const p of paths) check((await dial('+2348000000101', p, chew())).reply, `chew ${p.join('*')}`);
  });
});
