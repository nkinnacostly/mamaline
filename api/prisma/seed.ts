// Loads the facility and health worker directory. Safe to run more than once (upserts).
// Development and test only add the sample PINs; production never gets default PINs.
//   npx prisma db seed
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { hashPin } from '../src/auth/pin.js';

type Directory = {
  facilities: { id: string; name: string; lga: string; state: string; places: string[]; services: string }[];
  healthWorkers: { id: string; name: string; phone: string; places: string[] }[];
};

// SAMPLE data shared with the original service. Replace with the Nigeria Health Facility
// Registry and the state primary health care board's CHEW roster before a pilot.
const directory = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../service/knowledge/directory.json'), 'utf8'),
) as Directory;

const SAMPLE_PINS: Record<string, string> = { '+2348000000101': '2468', '+2348000000102': '1357', '+2348000000103': '8642' };

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

async function main() {
  const production = process.env.NODE_ENV === 'production';

  for (const f of directory.facilities) {
    const data = {
      name: f.name,
      lga: f.lga,
      state: f.state,
      services: f.services,
      places: f.places,
      emergencyObstetric: /emergency obstetric/i.test(f.services),
    };
    await prisma.facility.upsert({ where: { id: f.id }, create: { id: f.id, ...data }, update: data });
  }

  for (const w of directory.healthWorkers) {
    const pin = !production ? SAMPLE_PINS[w.phone] : undefined;
    const pinFields = pin ? (({ salt, hash }) => ({ pinSalt: salt, pinHash: hash, pinSetAt: new Date() }))(hashPin(pin)) : {};
    await prisma.healthWorker.upsert({
      where: { phone: w.phone },
      create: { name: w.name, phone: w.phone, places: w.places, ...pinFields },
      update: { name: w.name, places: w.places, ...pinFields },
    });
  }

  console.log(
    `Seeded ${directory.facilities.length} facilities and ${directory.healthWorkers.length} health workers` +
      (production ? ' (no PINs in production).' : ' with sample PINs (Amina 2468, Bisi 1357, Ngozi 8642).'),
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
