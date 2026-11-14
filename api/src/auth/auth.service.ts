import { ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { AuditService } from '../core/audit.service.js';
import { ClockService } from '../core/clock.service.js';
import { normalizePhone } from '../content/text.js';
import type { HealthWorker } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LOCKOUT_MS, MAX_PIN_FAILURES, verifyPin } from './pin.js';

const SESSION_DAYS = 7;
const sha256 = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Dashboard sign-in for health workers with their phone number and USSD PIN.
 * Shares the USSD lockout: 3 wrong PINs in 15 minutes block both. Tokens are random,
 * returned once, and stored only as a SHA-256 hash.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
  ) {}

  async signIn(phoneInput: string, pin: string, userAgent: string | undefined) {
    const now = this.clock.now();
    const phone = normalizePhone(phoneInput);
    const worker = phone ? await this.prisma.healthWorker.findFirst({ where: { phone, active: true } }) : null;
    // Same message for an unknown number and a wrong PIN, so the form does not reveal who is on the roster.
    if (!worker) throw new UnauthorizedException('Wrong phone number or PIN.');

    const since = new Date(now - LOCKOUT_MS);
    if ((await this.prisma.pinFailure.count({ where: { healthWorkerId: worker.id, at: { gte: since } } })) >= MAX_PIN_FAILURES) {
      throw new HttpException('Too many wrong PINs. Try again in 15 minutes or ask your supervisor.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!worker.pinHash || !worker.pinSalt) throw new ForbiddenException('Your PIN is not set yet. Ask your supervisor to set it.');
    if (!verifyPin(pin, { salt: worker.pinSalt, hash: worker.pinHash })) {
      await this.prisma.pinFailure.create({ data: { healthWorkerId: worker.id, at: new Date(now) } });
      throw new UnauthorizedException('Wrong phone number or PIN.');
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(now + SESSION_DAYS * 24 * 3600 * 1000);
    await this.prisma.$transaction([
      this.prisma.pinFailure.deleteMany({ where: { healthWorkerId: worker.id } }),
      this.prisma.healthWorkerSession.create({
        data: { healthWorkerId: worker.id, tokenHash: sha256(token), userAgent: userAgent?.slice(0, 200) ?? null, expiresAt, createdAt: new Date(now), lastUsedAt: new Date(now) },
      }),
    ]);
    await this.audit.record({ actorType: 'HEALTH_WORKER', actorId: worker.id, action: 'auth.signed_in', subjectType: 'health_worker', subjectId: worker.id });
    return { token, expiresAt, healthWorker: this.publicView(worker) };
  }

  /** The health worker for a bearer token, or null if it is unknown or expired. */
  async validate(token: string): Promise<HealthWorker | null> {
    const now = this.clock.now();
    const session = await this.prisma.healthWorkerSession.findUnique({ where: { tokenHash: sha256(token) }, include: { healthWorker: true } });
    if (!session || session.expiresAt.getTime() <= now || !session.healthWorker.active) return null;
    // Record activity at most every 5 minutes, to avoid a write on every request.
    if (now - session.lastUsedAt.getTime() > 5 * 60 * 1000) {
      await this.prisma.healthWorkerSession.update({ where: { id: session.id }, data: { lastUsedAt: new Date(now) } });
    }
    return session.healthWorker;
  }

  async signOut(token: string): Promise<void> {
    await this.prisma.healthWorkerSession.deleteMany({ where: { tokenHash: sha256(token) } });
  }

  publicView(worker: HealthWorker) {
    return { id: worker.id, name: worker.name, phone: worker.phone, places: worker.places };
  }
}
