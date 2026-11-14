import { Injectable } from '@nestjs/common';
import type { ActorType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

type AuditInput = {
  actorType: ActorType;
  actorId?: string | null;
  action: string;
  subjectType?: string;
  subjectId?: string;
  /** Never message text or health details. */
  details?: Record<string, string | number | boolean | null>;
};

/** Records who did what, for accountability under the Nigeria Data Protection Act. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditInput): Promise<void> {
    await this.prisma.auditEvent.create({ data: { ...event, actorId: event.actorId ?? null } });
  }
}
