import { Injectable } from '@nestjs/common';
import type { Facility, HealthWorker } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const normalize = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
const mentions = (location: string, place: string) => normalize(location).includes(normalize(place));

/** Facilities and health workers, matched to a mother by the village or LGA she gives. */
@Injectable()
export class DirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  async matchFacility(location: string | null | undefined): Promise<Facility | null> {
    if (!location) return null;
    const facilities = await this.prisma.facility.findMany({ orderBy: { id: 'asc' } });
    return facilities.find((f) => f.places.some((p) => mentions(location, p))) ?? null;
  }

  async matchHealthWorker(location: string | null | undefined): Promise<HealthWorker | null> {
    if (!location) return null;
    const workers = await this.prisma.healthWorker.findMany({ where: { active: true }, orderBy: { createdAt: 'asc' } });
    return workers.find((w) => w.places.some((p) => mentions(location, p))) ?? null;
  }

  healthWorkerByPhone(phone: string): Promise<HealthWorker | null> {
    return this.prisma.healthWorker.findFirst({ where: { phone, active: true } });
  }
}
