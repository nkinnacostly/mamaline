import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';

// Real database, no AI, no live SMS, no background scheduler: every effect is checked in Postgres.
process.env.AI_ENABLED = 'false';
process.env.REMINDERS_ENABLED = 'false';
delete process.env.AT_API_KEY;
delete process.env.AT_USERNAME;

const { AppModule } = await import('../src/app.module.js');
const { ClockService } = await import('../src/core/clock.service.js');
const { PrismaService } = await import('../src/prisma/prisma.service.js');
const { RemindersService } = await import('../src/care/reminders.service.js');

const DAY = 24 * 3600 * 1000;
const AMINA = '+2348000000101'; // seeded health worker, PIN 2468
const PIN = '2468';

class TestClock {
  offset = 0;
  now() {
    return Date.now() + this.offset;
  }
}

describe('MamaLine flows (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: InstanceType<typeof PrismaService>;
  const clock = new TestClock();
  let session = 0;

  const ussd = async (phone: string, inputs: string[]) => {
    const sessionId = `e2e-${++session}`;
    let reply = '';
    for (let i = 0; i <= inputs.length; i++) {
      const res = await request(app.getHttpServer())
        .post('/ussd')
        .type('form')
        .send({ sessionId, phoneNumber: phone, serviceCode: '*384*2#', text: inputs.slice(0, i).join('*') })
        .expect(200);
      reply = res.text;
    }
    return reply;
  };
  const sms = (from: string, text: string) => request(app.getHttpServer()).post('/sms/inbound').type('form').send({ from, to: 'MamaLine', text }).expect(200);
  const messagesTo = (to: string) => prisma.outboundMessage.findMany({ where: { to }, orderBy: { createdAt: 'asc' } });

  /** Actions run after the USSD reply, so wait for their effects. */
  async function waitFor<T>(check: () => Promise<T | null | undefined | false>, ms = 5000): Promise<T> {
    const start = Date.now();
    for (;;) {
      const value = await check();
      if (value) return value;
      if (Date.now() - start > ms) throw new Error('timed out waiting for an expected effect');
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  const testPhones = ['+2348091000001', '+2348091000002', '+2348091000003', '+2348091000004', '+2348091000005'];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(ClockService).useValue(clock).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    clock.offset = 0;
    await prisma.mother.deleteMany({ where: { phone: { in: testPhones } } });
    await prisma.alert.deleteMany({ where: { phone: { in: [...testPhones, 'deleted'] } } });
    await prisma.outboundMessage.deleteMany({ where: { to: { in: [...testPhones, AMINA] } } });
    await prisma.pinFailure.deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  it('health worker registration -> consent by SMS -> danger sign -> STOP', async () => {
    const phone = testPhones[0];

    // Amina registers her; only the consent request is sent.
    const reply = await ussd(AMINA, [PIN, '1', '0809 100 0001', '2', '5', 'Kura']);
    expect(reply).toMatch(/^END Consent request sent to \+2348091000001/);
    const pending = await waitFor(() => prisma.mother.findUnique({ where: { phone } }));
    expect(pending.consentStatus).toBe('PENDING');
    expect(pending.language).toBe('pcm');
    await waitFor(async () => (await messagesTo(phone)).length === 1);
    expect((await messagesTo(phone))[0]).toMatchObject({ kind: 'CONSENT', status: 'SIMULATED' });

    // She replies YES: consent recorded, welcome SMS sent.
    await sms(phone, 'Yes');
    await waitFor(async () => (await prisma.mother.findUnique({ where: { phone } }))?.consentStatus === 'GIVEN');
    await waitFor(async () => (await messagesTo(phone)).some((m) => m.kind === 'WELCOME'));

    // She reports bleeding: urgent SMS to her, alert to Amina.
    expect(await ussd(phone, ['1', '1'])).toMatch(/^END DANGER SIGN\. Go Kura PHC \(sample\) now/);
    const alert = await waitFor(() => prisma.alert.findFirst({ where: { phone } }));
    expect(alert).toMatchObject({ sign: 'bleeding', source: 'MENU', group: 'PREGNANT', status: 'OPEN' });
    await waitFor(async () => (await messagesTo(phone)).some((m) => m.kind === 'URGENT'));
    await waitFor(async () => (await messagesTo(AMINA)).some((m) => m.kind === 'HEALTH_WORKER' && m.body.includes(phone)));

    // She sends STOP: her details are deleted; the alert stays without her number.
    await sms(phone, 'STOP');
    await waitFor(async () => !(await prisma.mother.findUnique({ where: { phone } })));
    expect((await prisma.alert.findUnique({ where: { id: alert.id } }))?.phone).toBe('deleted');
    await waitFor(async () => (await messagesTo(phone)).some((m) => m.kind === 'CONSENT' && /comot for MamaLine/.test(m.body)));
    const audit = await prisma.auditEvent.findMany({ where: { subjectId: pending.id }, orderBy: { createdAt: 'asc' } });
    expect(audit.map((a) => a.action)).toEqual(['mother.registered', 'consent.given', 'mother.deleted']);
  });

  it('a mother registers herself and agrees on screen', async () => {
    const phone = testPhones[1];
    expect(await ussd(phone, ['1', '1', '6', 'Kura', '1'])).toMatch(/^END Welcome to MamaLine\. You are about 26 weeks pregnant/);
    const mother = await waitFor(() => prisma.mother.findUnique({ where: { phone } }));
    expect(mother).toMatchObject({ consentStatus: 'GIVEN', consentChannel: 'USSD', registeredBy: 'SELF', language: 'en', facilityId: 'kura-phc' });
    await waitFor(async () => (await messagesTo(phone)).some((m) => m.kind === 'WELCOME'));
  });

  it('nothing is saved when a new caller says no', async () => {
    const phone = testPhones[2];
    expect(await ussd(phone, ['1', '1', '6', 'Kura', '2'])).toBe('END OK. Nothing has been saved.');
    await new Promise((r) => setTimeout(r, 200));
    expect(await prisma.mother.findUnique({ where: { phone } })).toBeNull();
    expect(await messagesTo(phone)).toEqual([]);
  });

  it('3 wrong PINs lock a health worker out', async () => {
    expect(await ussd(AMINA, ['1111'])).toMatch(/^END Wrong PIN/);
    expect(await ussd(AMINA, ['2222'])).toMatch(/^END Wrong PIN/);
    expect(await ussd(AMINA, ['3333'])).toMatch(/^END Too many wrong PINs/);
    expect(await ussd(AMINA, [PIN])).toMatch(/^END Too many wrong PINs/);
  });

  it('reminders go out once, and a pending mother is flagged after 3 days', async () => {
    const reminders = app.get(RemindersService);
    const due = testPhones[3];
    const now = clock.now();
    const mother = await prisma.mother.create({
      data: {
        phone: due,
        language: 'en',
        track: 'PREGNANCY',
        expectedDueDate: new Date(now + (40 - 30) * 7 * DAY + DAY), // week-30 visit due tomorrow
        location: 'Kura',
        facilityId: 'kura-phc',
        registeredBy: 'SELF',
        registeredAt: new Date(now - 7 * DAY),
        trackStartedAt: new Date(now - 7 * DAY),
        consentStatus: 'GIVEN',
        consentGivenAt: new Date(now - 7 * DAY),
        consentChannel: 'USSD',
      },
    });
    await reminders.processMother(mother.id);
    await reminders.processMother(mother.id);
    const sent = await messagesTo(due);
    expect(sent.filter((m) => m.kind === 'REMINDER')).toHaveLength(1);
    expect(sent.find((m) => m.kind === 'REMINDER')?.body).toMatch(/antenatal visit \(week 30\) is due on/);

    const pending = testPhones[4];
    const waiting = await prisma.mother.create({
      data: { phone: pending, language: 'pcm', track: 'PREGNANCY', expectedDueDate: new Date(now + 20 * 7 * DAY), location: 'Kura', registeredBy: 'HEALTH_WORKER', registeredAt: new Date(now), consentStatus: 'PENDING', consentRequestedAt: new Date(now) },
    });
    await reminders.processMother(waiting.id);
    expect(await prisma.followUp.count({ where: { motherId: waiting.id } })).toBe(0);
    clock.offset = 4 * DAY;
    await reminders.processMother(waiting.id);
    await reminders.processMother(waiting.id);
    expect(await prisma.followUp.count({ where: { motherId: waiting.id, itemKey: 'consent-check' } })).toBe(1);
    expect(await messagesTo(pending)).toEqual([]);
  });
});
