// Fills a development database with sample mothers for Amina (sign in 0800 000 0101, PIN 2468),
// so the dashboard has something on it today. Safe to rerun: it replaces only its own sample records.
// Sample numbers (+234 800 000 02xx) are in the demo range, so no real SMS is ever sent to them.
//   npm run db:demo
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to add sample mothers to a production database.');
  process.exit(1);
}

const DAY = 24 * 3600 * 1000;
const WEEK = 7 * DAY;
const now = Date.now();
const at = (ms: number) => new Date(ms);
const phone = (n: number) => `+23480000002${String(n).padStart(2, '0')}`;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

type Sample = {
  n: number;
  location: string;
  language: 'en' | 'pcm' | 'ha' | 'yo' | 'ig';
  pregnant?: { edd: number };
  baby?: { born: number };
  pending?: boolean;
  done?: string[];
};

const SAMPLES: Sample[] = [
  { n: 1, location: 'Kura', language: 'ha', pregnant: { edd: now + 10 * WEEK }, done: ['anc-26'] }, // week-30 visit due today
  { n: 2, location: 'Kura', language: 'ha', pregnant: { edd: now - 4 * DAY + 14 * WEEK }, done: ['anc-20'] }, // week-26 visit missed 4 days ago
  { n: 3, location: 'Garun Mallam', language: 'en', baby: { born: now - 6 * WEEK }, done: ['vx-birth'] }, // 6-week vaccines due today
  { n: 4, location: 'Kura', language: 'pcm', baby: { born: now - 10 * WEEK + 2 * DAY }, done: ['vx-birth', 'vx-6w'] }, // 10-week vaccines in 2 days
  { n: 5, location: 'Kura', language: 'ha', pregnant: { edd: now + 6 * WEEK + DAY }, done: ['anc-30'] }, // week-34 visit tomorrow
  { n: 6, location: 'Garun Mallam', language: 'yo', pregnant: { edd: now + 22 * WEEK }, pending: true }, // just registered
];

async function main() {
  const amina = await prisma.healthWorker.findUnique({ where: { phone: '+2348000000101' } });
  const facility = await prisma.facility.findFirst({ where: { id: 'kura-phc' } });
  if (!amina || !facility) throw new Error('Run "npm run db:seed" first.');

  const phones = SAMPLES.map((s) => phone(s.n));
  await prisma.alert.deleteMany({ where: { phone: { in: phones } } });
  await prisma.followUp.deleteMany({ where: { phone: { in: phones } } });
  await prisma.mother.deleteMany({ where: { phone: { in: phones } } });

  const ids: Record<number, string> = {};
  for (const s of SAMPLES) {
    const started = s.baby ? s.baby.born : now - 60 * DAY;
    const mother = await prisma.mother.create({
      data: {
        phone: phone(s.n),
        language: s.language,
        track: s.baby ? 'BABY' : 'PREGNANCY',
        expectedDueDate: s.pregnant ? at(s.pregnant.edd) : null,
        babyBirthDate: s.baby ? at(s.baby.born) : null,
        location: s.location,
        facilityId: facility.id,
        healthWorkerId: amina.id,
        registeredBy: 'HEALTH_WORKER',
        registeredAt: at(s.pending ? now - 2 * 3600 * 1000 : started),
        trackStartedAt: at(s.pending ? now : started),
        consentStatus: s.pending ? 'PENDING' : 'GIVEN',
        consentRequestedAt: at(s.pending ? now - 2 * 3600 * 1000 : started),
        consentGivenAt: s.pending ? null : at(started),
        consentChannel: s.pending ? null : 'SMS',
        careRecords: { create: (s.done ?? []).map((itemKey) => ({ itemKey, channel: 'USSD' as const, completedAt: at(started) })) },
      },
    });
    ids[s.n] = mother.id;
  }

  await prisma.alert.create({
    data: { motherId: ids[5], phone: phone(5), group: 'PREGNANT', sign: 'headache', signLabel: 'Severe headache or blurred vision', source: 'MENU', location: 'Kura', healthWorkerId: amina.id, createdAt: at(now - 40 * 60 * 1000) },
  });
  await prisma.followUp.create({
    data: { motherId: ids[2], phone: phone(2), reason: 'Missed antenatal visit (week 26)', itemKey: 'anc-26', healthWorkerId: amina.id, createdAt: at(now - 3 * DAY) },
  });

  console.log(`Added ${SAMPLES.length} sample mothers, 1 alert and 1 follow-up for ${amina.name}.`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
