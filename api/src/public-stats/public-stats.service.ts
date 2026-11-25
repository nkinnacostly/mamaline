import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { contactSummary, type ContactSummary } from './contact-times.js';

/**
 * Totals anyone may see, for the public impact page and as open data.
 * Counts only: no phone numbers, names, places, dates of birth or message text, and no
 * breakdown by place or day, so no figure can point to one mother.
 */
export type PublicStats = {
  generatedAt: string;
  /** "sample" while the database holds test records; the page must say so. */
  dataStatus: Env['PUBLIC_DATA_STATUS'];
  mothers: {
    /** Registered and agreed to messages. A mother who sends STOP is deleted, so she leaves this count. */
    enrolled: number;
    /** Registered by a health worker, waiting for her YES. */
    awaitingConsent: number;
    registeredByHealthWorker: number;
    registeredBySelf: number;
    pregnant: number;
    withBaby: number;
  };
  healthWorkers: { active: number };
  care: { antenatalVisitsConfirmed: number; vaccinesConfirmed: number };
  dangerSigns: { reported: number } & ContactSummary;
  questions: { answered: number };
  /** SMS to mothers and health workers. "simulated" were logged but not sent (no SMS provider connected). */
  sms: { sent: number; simulated: number; failed: number };
};

@Injectable()
export class PublicStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async stats(): Promise<PublicStats> {
    const enrolledOnly = { consentStatus: 'GIVEN' } as const;

    // One transaction, so every figure comes from the same moment.
    const [
      enrolled,
      awaitingConsent,
      registeredByHealthWorker,
      pregnant,
      withBaby,
      activeHealthWorkers,
      antenatalVisitsConfirmed,
      vaccinesConfirmed,
      dangerSignsReported,
      contactedAlerts,
      questionsAnswered,
      smsByStatus,
    ] = await this.prisma.$transaction([
      this.prisma.mother.count({ where: enrolledOnly }),
      this.prisma.mother.count({ where: { consentStatus: 'PENDING' } }),
      this.prisma.mother.count({ where: { ...enrolledOnly, registeredBy: 'HEALTH_WORKER' } }),
      this.prisma.mother.count({ where: { ...enrolledOnly, track: 'PREGNANCY' } }),
      this.prisma.mother.count({ where: { ...enrolledOnly, track: 'BABY' } }),
      this.prisma.healthWorker.count({ where: { active: true } }),
      this.prisma.careRecord.count({ where: { itemKey: { startsWith: 'anc-' } } }),
      this.prisma.careRecord.count({ where: { itemKey: { startsWith: 'vx-' } } }),
      this.prisma.alert.count(),
      this.prisma.alert.findMany({ where: { contactedAt: { not: null } }, select: { createdAt: true, contactedAt: true } }),
      this.prisma.question.count({ where: { answer: { not: null } } }),
      this.prisma.outboundMessage.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } }),
    ]);

    const sms = (...statuses: string[]) =>
      smsByStatus.filter((row) => statuses.includes(row.status)).reduce((sum, row) => sum + (row._count as { _all: number })._all, 0);

    return {
      generatedAt: new Date().toISOString(),
      dataStatus: this.config.get('PUBLIC_DATA_STATUS', { infer: true }),
      mothers: {
        enrolled,
        awaitingConsent,
        registeredByHealthWorker,
        registeredBySelf: enrolled - registeredByHealthWorker,
        pregnant,
        withBaby,
      },
      healthWorkers: { active: activeHealthWorkers },
      care: { antenatalVisitsConfirmed, vaccinesConfirmed },
      dangerSigns: { reported: dangerSignsReported, ...contactSummary(contactedAlerts) },
      questions: { answered: questionsAnswered },
      sms: { sent: sms('SENT', 'DELIVERED'), simulated: sms('SIMULATED'), failed: sms('FAILED') },
    };
  }
}
