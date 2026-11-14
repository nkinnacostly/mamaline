import { Injectable } from '@nestjs/common';
import { LOCKOUT_MS, MAX_PIN_FAILURES, verifyPin } from '../auth/pin.js';
import { ClockService } from '../core/clock.service.js';
import { DirectoryService } from '../core/directory.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toCareSubject } from '../care/care-subject.js';
import { handleMenu, type MenuContext, type MenuResult } from './menu.js';

export type UssdRequest = { sessionId: string; phoneNumber: string; text: string };

/** Loads what the menus need about the caller, runs the menu, and keeps session state in Postgres. */
@Injectable()
export class UssdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: DirectoryService,
    private readonly clock: ClockService,
  ) {}

  async handle({ sessionId, phoneNumber: phone, text }: UssdRequest): Promise<MenuResult> {
    const now = this.clock.now();
    const [worker, mother] = await Promise.all([
      this.directory.healthWorkerByPhone(phone),
      this.prisma.mother.findUnique({ where: { phone }, include: { facility: true, careRecords: true, sentReminders: true } }),
    ]);

    // New callers start with the language question; remember that for the rest of the session
    // so every later screen is parsed the same way, on whichever instance answers it.
    const fresh = !worker && !mother;
    let askedLanguage = fresh;
    if (text === '') {
      await this.prisma.ussdSession.upsert({ where: { id: sessionId }, create: { id: sessionId, phone, askedLanguage: fresh }, update: { phone, askedLanguage: fresh } });
    } else {
      const session = await this.prisma.ussdSession.findUnique({ where: { id: sessionId } });
      if (session && session.phone === phone) askedLanguage = session.askedLanguage;
    }

    const lockoutSince = new Date(now - LOCKOUT_MS);
    const ctx: MenuContext = {
      now,
      healthWorker: worker ? { id: worker.id, hasPin: Boolean(worker.pinHash && worker.pinSalt) } : null,
      mother: mother && {
        language: mother.language,
        consentStatus: mother.consentStatus,
        hasHealthWorker: Boolean(mother.healthWorkerId),
        facilityName: mother.facility?.name ?? null,
        care: toCareSubject(mother),
      },
      askedLanguage,
      pinLocked: async () =>
        (await this.prisma.pinFailure.count({ where: { healthWorkerId: worker!.id, at: { gte: lockoutSince } } })) >= MAX_PIN_FAILURES,
      checkPin: async (pin) => verifyPin(pin, { salt: worker!.pinSalt, hash: worker!.pinHash }),
      recordPinFailure: async () => {
        await this.prisma.pinFailure.create({ data: { healthWorkerId: worker!.id, at: new Date(now) } });
        return this.prisma.pinFailure.count({ where: { healthWorkerId: worker!.id, at: { gte: lockoutSince } } });
      },
      clearPinFailures: async () => {
        await this.prisma.pinFailure.deleteMany({ where: { healthWorkerId: worker!.id } });
      },
      motherExists: async (p) => (await this.prisma.mother.count({ where: { phone: p } })) > 0,
      facilityNameFor: async (location) => (await this.directory.matchFacility(location))?.name ?? null,
      hasHealthWorkerFor: async (location) => Boolean(await this.directory.matchHealthWorker(location)),
    };

    const result = await handleMenu(phone, text, ctx);
    if (result.end) await this.prisma.ussdSession.deleteMany({ where: { id: sessionId } });
    return result;
  }
}
