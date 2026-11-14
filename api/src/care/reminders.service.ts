import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AiService } from '../ai/ai.service.js';
import type { Env } from '../config/env.js';
import { ClockService } from '../core/clock.service.js';
import { sms, type SmsKey } from '../content/i18n.js';
import { DAY, dueEvents, formatDate, type DueEvent } from '../content/schedule.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SmsService } from '../sms/sms.service.js';
import { itemText } from '../ussd/menu.js';
import { toCareSubject } from './care-subject.js';

const INTERVAL_MS = 60_000;
const BATCH = 200;

/**
 * Scheduled messages: visit and vaccine reminders, missed-visit follow-ups and tips.
 *
 * Every message is "claimed" by inserting its key into sent_reminders before it is sent.
 * The unique (mother_id, key) constraint means a message goes out once even if two
 * instances run the scheduler at the same time.
 */
@Injectable()
export class RemindersService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RemindersService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly ai: AiService,
    private readonly clock: ClockService,
    private readonly config: ConfigService<Env, true>,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onApplicationBootstrap() {
    if (!this.config.get('REMINDERS_ENABLED', { infer: true })) {
      this.logger.log('Reminder scheduler is off on this instance (REMINDERS_ENABLED=false)');
      return;
    }
    const timer = setInterval(() => void this.runDue(), INTERVAL_MS);
    this.scheduler.addInterval('reminders', timer);
    void this.runDue();
  }

  onModuleDestroy() {
    if (this.scheduler.doesExist('interval', 'reminders')) this.scheduler.deleteInterval('reminders');
  }

  /** Processes every mother once. Skips a tick if the previous run is still going. */
  async runDue(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      let cursor: string | undefined;
      for (;;) {
        const batch = await this.prisma.mother.findMany({
          select: { id: true },
          orderBy: { id: 'asc' },
          take: BATCH,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });
        for (const { id } of batch) {
          try {
            await this.processMother(id);
          } catch (error) {
            this.logger.error(`Reminders for one mother failed: ${(error as Error).message}`);
          }
        }
        if (batch.length < BATCH) break;
        cursor = batch.at(-1)!.id;
      }
      // USSD sessions last minutes; anything older than an hour is abandoned.
      await this.prisma.ussdSession.deleteMany({ where: { updatedAt: { lt: new Date(this.clock.now() - 3600_000) } } });
    } finally {
      this.running = false;
    }
  }

  /** Sends whatever is due for one mother. Nothing is sent before she consents. */
  async processMother(motherId: string): Promise<void> {
    const now = this.clock.now();
    const mother = await this.prisma.mother.findUnique({ where: { id: motherId }, include: { facility: true, careRecords: true, sentReminders: true } });
    if (!mother) return;

    if (mother.consentStatus === 'PENDING') {
      // After 3 days without an answer, ask her health worker to follow up.
      const waited = now - mother.registeredAt.getTime();
      if (waited >= 3 * DAY && (await this.claim(mother.id, 'consent-check'))) {
        await this.prisma.followUp.create({
          data: {
            motherId: mother.id,
            phone: mother.phone,
            itemKey: 'consent-check',
            healthWorkerId: mother.healthWorkerId,
            reason: 'Has not agreed to MamaLine after 3 days: explain it and help her reply YES, or remove her',
          },
        });
      }
      return;
    }

    const facility = mother.facility?.name ?? sms(mother.language, 'nearestFacility');
    const code = this.config.get('USSD_CODE', { infer: true });
    for (const event of dueEvents(toCareSubject(mother), now)) {
      if (!(await this.claim(mother.id, event.key))) continue;
      await this.deliver(event, mother, facility, code);
    }
  }

  private async deliver(
    event: DueEvent,
    mother: { id: string; phone: string; language: Parameters<typeof sms>[0]; healthWorkerId: string | null },
    facility: string,
    code: string,
  ): Promise<void> {
    const lang = mother.language;
    if (event.type === 'reminder') {
      const { item, stage } = event;
      const key = `${item.kind}${stage[0].toUpperCase()}${stage.slice(1)}` as SmsKey;
      const vars = {
        week: item.week,
        label: item.kind === 'vaccine' ? item.label : '',
        names: item.kind === 'vaccine' ? item.names : '',
        date: formatDate(item.due),
        facility,
        code,
      };
      await this.sms.send({ to: mother.phone, body: await this.ai.localize(sms(lang, key, vars), lang), kind: stage === 'missed' ? 'MISSED' : 'REMINDER' });
      if (stage === 'missed') {
        const open = await this.prisma.followUp.count({ where: { motherId: mother.id, itemKey: item.key, status: 'OPEN' } });
        if (!open) {
          await this.prisma.followUp.create({
            data: {
              motherId: mother.id,
              phone: mother.phone,
              itemKey: item.key,
              healthWorkerId: mother.healthWorkerId,
              reason: `Missed ${itemText('en', item)}, due ${formatDate(item.due)}`,
            },
          });
        }
      }
    } else if (event.type === 'tip') {
      const text = lang === 'pcm' ? event.tip.sms.pcm : event.tip.sms.en;
      await this.sms.send({ to: mother.phone, body: await this.ai.localize(text, lang), kind: 'TIP' });
    } else {
      await this.prisma.followUp.create({
        data: {
          motherId: mother.id,
          phone: mother.phone,
          itemKey: 'birth-check',
          healthWorkerId: mother.healthWorkerId,
          reason: '2 weeks past due date: check on the birth and record the baby',
        },
      });
    }
  }

  /** Records that a message is going out. False if another run already claimed it. */
  private async claim(motherId: string, key: string): Promise<boolean> {
    try {
      await this.prisma.sentReminder.create({ data: { motherId, key, sentAt: new Date(this.clock.now()) } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false;
      throw error;
    }
  }
}
