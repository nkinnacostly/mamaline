import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { dayKey } from '../src/dashboard/days.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const DAY = 24 * 3600 * 1000;
const PHONES = ['+2348092000001', '+2348092000002', '+2348092000003'];

describe('Health worker dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let amina: { id: string };
  let token: string;

  const api = () => request(app.getHttpServer());
  const authed = (method: 'get' | 'post', path: string, t = token) => api()[method](path).set('Authorization', `Bearer ${t}`);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    amina = await prisma.healthWorker.findUniqueOrThrow({ where: { phone: '+2348000000101' } });
  });

  beforeEach(async () => {
    await prisma.pinFailure.deleteMany({});
    await prisma.mother.deleteMany({ where: { phone: { in: PHONES } } });
    await prisma.alert.deleteMany({ where: { phone: { in: PHONES } } });
    await prisma.followUp.deleteMany({ where: { phone: { in: PHONES } } });
    const res = await api().post('/auth/sign-in').send({ phone: '0800 000 0101', pin: '2468' }).expect(200);
    token = res.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('signs in with phone and PIN, and refuses wrong PINs and missing tokens', async () => {
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    await api().post('/auth/sign-in').send({ phone: '08000000101', pin: '1111' }).expect(401);
    await api().post('/auth/sign-in').send({ phone: '08099999999', pin: '2468' }).expect(401);
    await api().get('/dashboard/week').expect(401);
    const me = await authed('get', '/auth/me').expect(200);
    expect(me.body).toMatchObject({ name: expect.stringMatching(/Amina/), phone: '+2348000000101' });
    // The session token itself is never stored.
    expect(await prisma.healthWorkerSession.count({ where: { tokenHash: token } })).toBe(0);
  });

  it('shows the day: alerts, follow-ups and visits due today, with dots on the week', async () => {
    const now = Date.now();
    const mother = await prisma.mother.create({
      data: {
        phone: PHONES[0], language: 'en', track: 'PREGNANCY', location: 'Kura', facilityId: 'kura-phc', healthWorkerId: amina.id,
        expectedDueDate: new Date(now + 10 * 7 * DAY), // week-30 visit due today
        registeredBy: 'HEALTH_WORKER', registeredAt: new Date(now - 30 * DAY), trackStartedAt: new Date(now - 30 * DAY),
        consentStatus: 'GIVEN', consentGivenAt: new Date(now - 30 * DAY), consentChannel: 'SMS',
      },
    });
    const alert = await prisma.alert.create({ data: { motherId: mother.id, phone: mother.phone, group: 'PREGNANT', sign: 'bleeding', signLabel: 'Bleeding', source: 'MENU', location: 'Kura', healthWorkerId: amina.id } });
    await prisma.followUp.create({ data: { motherId: mother.id, phone: mother.phone, reason: 'Missed antenatal visit (week 26)', healthWorkerId: amina.id } });

    const week = await authed('get', '/dashboard/week').expect(200);
    const today = week.body.days.find((d: { date: string }) => d.date === week.body.today);
    expect(week.body.days).toHaveLength(7);
    expect(today.due).toBeGreaterThanOrEqual(1);

    const day = await authed('get', '/dashboard/day').expect(200);
    expect(day.body.isToday).toBe(true);
    expect(day.body.alerts.map((a: { id: string }) => a.id)).toContain(alert.id);
    expect(day.body.followUps.some((f: { phone: string }) => f.phone === mother.phone)).toBe(true);
    expect(day.body.visits).toContainEqual(expect.objectContaining({ phone: mother.phone, itemKey: 'anc-30', title: 'Antenatal visit (week 30)', status: 'due' }));

    // She came: marking it done stops reminders for it and shows it done.
    await authed('post', `/dashboard/mothers/${mother.id}/visits/anc-99/done`).expect(404);
    await authed('post', `/dashboard/mothers/${mother.id}/visits/drop-table/done`).expect(400);
    await authed('post', `/dashboard/mothers/${mother.id}/visits/anc-30/done`).expect(200);
    await authed('post', `/dashboard/mothers/${mother.id}/visits/anc-30/done`).expect(200);
    expect(await prisma.careRecord.findUnique({ where: { motherId_itemKey: { motherId: mother.id, itemKey: 'anc-30' } } })).toMatchObject({ channel: 'DASHBOARD' });
    const after = await authed('get', '/dashboard/day').expect(200);
    expect(after.body.visits).toContainEqual(expect.objectContaining({ itemKey: 'anc-30', status: 'done' }));

    const month = await authed('get', '/dashboard/month').expect(200);
    expect(month.body.days.length).toBeGreaterThanOrEqual(28);
    expect(month.body.days[0].date.endsWith('-01')).toBe(true);

    // Another day shows that day's visits only.
    const tomorrow = await authed('get', `/dashboard/day?date=${dayKey(now + DAY)}`).expect(200);
    expect(tomorrow.body.alerts).toEqual([]);
    await authed('get', '/dashboard/day?date=14-11-2026').expect(400);
  });

  it('only lets a health worker act on her own alerts and follow-ups', async () => {
    const alert = await prisma.alert.create({ data: { phone: PHONES[1], group: 'BABY', sign: 'feeding', signLabel: 'Not feeding well', source: 'MENU', healthWorkerId: amina.id } });
    const bisi = (await api().post('/auth/sign-in').send({ phone: '+2348000000102', pin: '1357' }).expect(200)).body.token as string;

    await authed('post', `/dashboard/alerts/${alert.id}/contacted`, bisi).expect(404);
    await authed('post', `/dashboard/alerts/${alert.id}/contacted`).expect(200);
    await authed('post', `/dashboard/alerts/${alert.id}/contacted`).expect(404);
    expect((await prisma.alert.findUniqueOrThrow({ where: { id: alert.id } })).status).toBe('CONTACTED');

    const followUp = await prisma.followUp.create({ data: { phone: PHONES[1], reason: 'Check on her', healthWorkerId: amina.id } });
    await authed('post', `/dashboard/follow-ups/${followUp.id}/done`, bisi).expect(404);
    await authed('post', `/dashboard/follow-ups/${followUp.id}/done`).expect(200);
  });

  it('registers a mother pending consent, refuses duplicates, and records a birth', async () => {
    const res = await authed('post', '/dashboard/mothers').send({ phone: '0809 200 0003', language: 'yo', track: 'PREGNANCY', amount: 8, location: 'Kura' }).expect(201);
    expect(res.body.consentStatus).toBe('PENDING');
    expect(await prisma.outboundMessage.count({ where: { to: PHONES[2], kind: 'CONSENT' } })).toBeGreaterThanOrEqual(1);
    await authed('post', '/dashboard/mothers').send({ phone: '08092000003', language: 'en', track: 'BABY', amount: 3, location: 'Kura' }).expect(409);
    await authed('post', '/dashboard/mothers').send({ phone: '123', language: 'en', track: 'BABY', amount: 3, location: 'Kura' }).expect(400);
    await authed('post', '/dashboard/mothers').send({ phone: '08092000009', language: 'en', track: 'PREGNANCY', amount: 12, location: 'Kura' }).expect(400);

    const list = await authed('get', '/dashboard/mothers').expect(200);
    expect(list.body).toContainEqual(expect.objectContaining({ phone: PHONES[2], consentStatus: 'PENDING', track: 'PREGNANCY' }));

    await authed('post', `/dashboard/mothers/${res.body.id}/birth`).expect(200);
    expect((await prisma.mother.findUniqueOrThrow({ where: { id: res.body.id } })).track).toBe('BABY');
    await authed('post', `/dashboard/mothers/${res.body.id}/birth`).expect(409);
  });

  it('signs out', async () => {
    await authed('post', '/auth/sign-out').expect(204);
    await authed('get', '/auth/me').expect(401);
  });
});
