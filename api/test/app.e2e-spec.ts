import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Runs against a real Postgres (DATABASE_URL), migrated and seeded first.
describe('MamaLine API (e2e)', () => {
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

  it('GET /health reports the database as up', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', info: { database: { status: 'up' } } });
  });

  it('can read the seeded directory', async () => {
    const amina = await prisma.healthWorker.findUnique({ where: { phone: '+2348000000101' } });
    expect(amina?.name).toMatch(/Amina/);
    expect(amina?.pinHash).toBeTruthy();
    expect(await prisma.facility.count()).toBeGreaterThan(0);
  });

  it('deletes a mother together with her records when she withdraws consent', async () => {
    const phone = '+2348000000999';
    await prisma.mother.deleteMany({ where: { phone } });
    const mother = await prisma.mother.create({
      data: {
        phone,
        language: 'pcm',
        track: 'PREGNANCY',
        expectedDueDate: new Date(Date.now() + 10 * 7 * 24 * 3600 * 1000),
        location: 'Kura',
        registeredBy: 'SELF',
        consentStatus: 'GIVEN',
        consentGivenAt: new Date(),
        consentChannel: 'USSD',
        careRecords: { create: { itemKey: 'anc-26', channel: 'USSD' } },
        sentReminders: { create: { key: 'anc-30:pre' } },
        followUps: { create: { phone, reason: 'test follow-up' } },
      },
    });
    await prisma.mother.delete({ where: { id: mother.id } });
    expect(await prisma.careRecord.count({ where: { motherId: mother.id } })).toBe(0);
    expect(await prisma.sentReminder.count({ where: { motherId: mother.id } })).toBe(0);
    expect(await prisma.followUp.count({ where: { motherId: mother.id } })).toBe(0);
  });
});
