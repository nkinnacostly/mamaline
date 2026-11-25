import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Runs against a real Postgres (DATABASE_URL), migrated and seeded first.
describe('Public stats (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves anonymous totals that anyone may read and cache', async () => {
    const res = await request(app.getHttpServer()).get('/public/stats').expect(200);

    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['cache-control']).toMatch(/s-maxage=60/);
    expect(res.body.dataStatus).toBe('sample');
    expect(Number.isNaN(Date.parse(res.body.generatedAt))).toBe(false);

    expect(res.body.mothers.enrolled).toBe(await prisma.mother.count({ where: { consentStatus: 'GIVEN' } }));
    expect(res.body.mothers.registeredByHealthWorker + res.body.mothers.registeredBySelf).toBe(res.body.mothers.enrolled);
    expect(res.body.healthWorkers.active).toBe(await prisma.healthWorker.count({ where: { active: true } }));
    expect(res.body.dangerSigns.reported).toBe(await prisma.alert.count());
    expect(res.body.dangerSigns.contactedWithinOneHour).toBeLessThanOrEqual(res.body.dangerSigns.contacted);
  });

  it('never exposes a phone number, name or place', async () => {
    const amina = await prisma.healthWorker.findUnique({ where: { phone: '+2348000000101' } });
    const mother = await prisma.mother.findFirst();
    const res = await request(app.getHttpServer()).get('/public/stats').expect(200);
    const body = JSON.stringify(res.body);

    expect(body).not.toMatch(/\+?234\d{6,}/);
    if (amina) expect(body).not.toContain(amina.name);
    if (mother) expect(body).not.toContain(mother.location);
  });

  it('counts a confirmed antenatal visit and a contacted danger sign', async () => {
    const before = (await request(app.getHttpServer()).get('/public/stats').expect(200)).body;
    const phone = '+2348000000998';
    await prisma.mother.deleteMany({ where: { phone } });
    const created = new Date(Date.now() - 30 * 60_000);
    const mother = await prisma.mother.create({
      data: {
        phone,
        language: 'en',
        track: 'PREGNANCY',
        expectedDueDate: new Date(Date.now() + 12 * 7 * 24 * 3600 * 1000),
        location: 'Kura',
        registeredBy: 'SELF',
        consentStatus: 'GIVEN',
        consentGivenAt: new Date(),
        consentChannel: 'USSD',
        careRecords: { create: { itemKey: 'anc-26', channel: 'USSD' } },
        alerts: {
          create: { phone, group: 'PREGNANT', sign: 'bleeding', signLabel: 'Bleeding', source: 'MENU', status: 'CONTACTED', createdAt: created, contactedAt: new Date() },
        },
      },
    });

    try {
      const after = (await request(app.getHttpServer()).get('/public/stats').expect(200)).body;
      expect(after.mothers.enrolled).toBe(before.mothers.enrolled + 1);
      expect(after.mothers.registeredBySelf).toBe(before.mothers.registeredBySelf + 1);
      expect(after.care.antenatalVisitsConfirmed).toBe(before.care.antenatalVisitsConfirmed + 1);
      expect(after.dangerSigns.reported).toBe(before.dangerSigns.reported + 1);
      expect(after.dangerSigns.contactedWithinOneHour).toBe(before.dangerSigns.contactedWithinOneHour + 1);
    } finally {
      await prisma.alert.deleteMany({ where: { motherId: mother.id } });
      await prisma.mother.delete({ where: { id: mother.id } });
    }
  });
});
