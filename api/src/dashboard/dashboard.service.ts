import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CareService } from '../care/care.service.js';
import { toCareSubject } from '../care/care-subject.js';
import { RemindersService } from '../care/reminders.service.js';
import { AuditService } from '../core/audit.service.js';
import { ClockService } from '../core/clock.service.js';
import type { Lang } from '../content/i18n.js';
import { careItems, currentWeek, nextItem, type CareItem } from '../content/schedule.js';
import type { HealthWorker } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { itemText } from '../ussd/menu.js';
import { addDays, dayKey, dayStart, weekStart } from './days.js';

const DAY = 24 * 3600 * 1000;

type MotherWithCare = Awaited<ReturnType<DashboardService['loadMothers']>>[number];

export type VisitStatus = 'done' | 'due' | 'missed' | 'upcoming';

/** Everything a health worker sees, always limited to her own mothers, alerts and follow-ups. */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly care: CareService,
    private readonly reminders: RemindersService,
    private readonly audit: AuditService,
  ) {}

  /** Seven days from Sunday, with how many visits and vaccines are due each day (the dots). */
  async week(worker: HealthWorker, anyDayKey?: string) {
    const today = dayKey(this.clock.now());
    return { today, days: await this.dueCounts(worker, weekStart(anyDayKey ?? today), 7) };
  }

  /** Every day of the month, with how many visits and vaccines are due (for the calendar). */
  async month(worker: HealthWorker, anyDayKey?: string) {
    const today = dayKey(this.clock.now());
    const first = `${(anyDayKey ?? today).slice(0, 7)}-01`;
    const [y, m] = first.split('-').map(Number);
    const length = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { today, days: await this.dueCounts(worker, first, length) };
  }

  private async dueCounts(worker: HealthWorker, start: string, length: number) {
    const mothers = await this.loadMothers(worker.id, true);
    const keys = Array.from({ length }, (_, i) => addDays(start, i));
    const counts = new Map(keys.map((k) => [k, 0]));
    for (const mother of mothers) {
      for (const visit of this.visitsFor(mother)) {
        const key = dayKey(visit.item.due);
        if (counts.has(key) && !visit.done) counts.set(key, counts.get(key)! + 1);
      }
    }
    return keys.map((date) => ({ date, due: counts.get(date)! }));
  }

  /** The cards for one day: urgent alerts and follow-ups (today only), then visits and vaccines due. */
  async day(worker: HealthWorker, requested?: string) {
    const now = this.clock.now();
    const today = dayKey(now);
    const key = requested ?? today;
    const [mothers, alerts, followUps] = await Promise.all([
      this.loadMothers(worker.id, true),
      key === today ? this.prisma.alert.findMany({ where: { healthWorkerId: worker.id, status: 'OPEN' }, orderBy: { createdAt: 'desc' } }) : [],
      key === today ? this.prisma.followUp.findMany({ where: { healthWorkerId: worker.id, status: 'OPEN' }, orderBy: { createdAt: 'desc' } }) : [],
    ]);

    const visits = mothers
      .flatMap((mother) => this.visitsFor(mother).map((v) => ({ mother, ...v })))
      .filter((v) => dayKey(v.item.due) === key)
      .map(({ mother, item, done }) => ({
        motherId: mother.id,
        itemKey: item.key,
        phone: mother.phone,
        location: mother.location,
        kind: item.kind,
        title: this.itemTitle(item),
        detail: item.kind === 'vaccine' ? item.names : `week ${item.week}`,
        due: new Date(item.due).toISOString(),
        status: this.status(item, done, now),
      }))
      .sort((a, b) => a.phone.localeCompare(b.phone));

    return {
      date: key,
      isToday: key === today,
      alerts: alerts.map((a) => ({ id: a.id, sign: a.sign, signLabel: a.signLabel, phone: a.phone, location: a.location, detail: a.detail, createdAt: a.createdAt.toISOString(), motherId: a.motherId })),
      followUps: followUps.map((f) => ({ id: f.id, phone: f.phone, reason: f.reason, createdAt: f.createdAt.toISOString(), motherId: f.motherId })),
      visits,
    };
  }

  /** Open alerts and follow-ups, whenever they were raised. */
  async openWork(worker: HealthWorker) {
    const day = await this.day(worker);
    return { alerts: day.alerts, followUps: day.followUps };
  }

  async mothers(worker: HealthWorker) {
    const now = this.clock.now();
    const mothers = await this.loadMothers(worker.id, false);
    return mothers.map((m) => {
      const consented = m.consentStatus === 'GIVEN';
      const care = toCareSubject(m);
      const next = consented ? nextItem(care, now) : null;
      return {
        id: m.id,
        phone: m.phone,
        location: m.location,
        language: m.language,
        track: m.track,
        week: currentWeek(care, now),
        consentStatus: m.consentStatus,
        registeredAt: m.registeredAt.toISOString(),
        next: next ? { title: this.itemTitle(next), due: new Date(next.due).toISOString(), overdue: next.due < now - DAY } : null,
      };
    });
  }

  /** Registers a mother from the dashboard. She is saved as awaiting consent and gets the consent SMS. */
  async register(worker: HealthWorker, input: { phone: string; language: Lang; track: 'PREGNANCY' | 'BABY'; amount: number; location: string }) {
    if (await this.prisma.mother.findUnique({ where: { phone: input.phone } })) {
      throw new ConflictException('This number is already on MamaLine.');
    }
    await this.care.run([{ type: 'register', phone: input.phone, lang: input.language, track: input.track, amount: input.amount, location: input.location, registeredBy: 'HEALTH_WORKER', healthWorkerId: worker.id }]);
    const mother = await this.prisma.mother.findUnique({ where: { phone: input.phone } });
    if (!mother) throw new ConflictException('Registration did not complete. Please try again.');
    return { id: mother.id, consentStatus: mother.consentStatus };
  }

  /** Moves a mother to the baby track: vaccine reminders start from the birth. */
  async recordBirth(worker: HealthWorker, motherId: string) {
    const mother = await this.prisma.mother.findFirst({ where: { id: motherId, healthWorkerId: worker.id } });
    if (!mother) throw new NotFoundException('Mother not found.');
    if (mother.track === 'BABY') throw new ConflictException('The birth is already recorded.');
    const now = new Date(this.clock.now());
    await this.prisma.$transaction([
      this.prisma.mother.update({ where: { id: mother.id }, data: { track: 'BABY', babyBirthDate: now, trackStartedAt: now } }),
      this.prisma.followUp.updateMany({ where: { motherId: mother.id, itemKey: 'birth-check', status: 'OPEN' }, data: { status: 'DONE', doneAt: now } }),
    ]);
    if (mother.consentStatus === 'GIVEN') await this.reminders.processMother(mother.id);
    return { ok: true };
  }

  /** She came for this visit or vaccine: records it, so no more reminders go out for it. */
  async markVisitDone(worker: HealthWorker, motherId: string, itemKey: string) {
    const mother = await this.prisma.mother.findFirst({ where: { id: motherId, healthWorkerId: worker.id }, include: { careRecords: true, sentReminders: true } });
    if (!mother) throw new NotFoundException('Mother not found.');
    if (!careItems(toCareSubject(mother)).some((item) => item.key === itemKey)) throw new NotFoundException('That visit is not on her schedule.');
    const now = new Date(this.clock.now());
    await this.prisma.$transaction([
      this.prisma.careRecord.upsert({
        where: { motherId_itemKey: { motherId, itemKey } },
        create: { motherId, itemKey, channel: 'DASHBOARD', completedAt: now },
        update: {},
      }),
      this.prisma.followUp.updateMany({ where: { motherId, itemKey, status: 'OPEN' }, data: { status: 'DONE', doneAt: now } }),
    ]);
    await this.audit.record({ actorType: 'HEALTH_WORKER', actorId: worker.id, action: 'visit.done', subjectType: 'mother', subjectId: motherId, details: { itemKey } });
    return { ok: true };
  }

  async markAlertContacted(worker: HealthWorker, id: string) {
    const { count } = await this.prisma.alert.updateMany({ where: { id, healthWorkerId: worker.id, status: 'OPEN' }, data: { status: 'CONTACTED', contactedAt: new Date(this.clock.now()) } });
    if (!count) throw new NotFoundException('Alert not found or already handled.');
    return { ok: true };
  }

  async markFollowUpDone(worker: HealthWorker, id: string) {
    const { count } = await this.prisma.followUp.updateMany({ where: { id, healthWorkerId: worker.id, status: 'OPEN' }, data: { status: 'DONE', doneAt: new Date(this.clock.now()) } });
    if (!count) throw new NotFoundException('Follow-up not found or already done.');
    return { ok: true };
  }

  // ---------- Helpers ----------

  private loadMothers(healthWorkerId: string, consentedOnly: boolean) {
    return this.prisma.mother.findMany({
      where: { healthWorkerId, ...(consentedOnly ? { consentStatus: 'GIVEN' as const } : {}) },
      include: { careRecords: true, sentReminders: true },
      orderBy: { registeredAt: 'desc' },
    });
  }

  /** Every scheduled item since she joined this track, with whether she has confirmed it. */
  private visitsFor(mother: MotherWithCare) {
    const subject = toCareSubject(mother);
    const started = subject.trackStartedAt.getTime() - 3 * DAY;
    return careItems(subject)
      .filter((item) => item.due >= started)
      .map((item) => ({ item, done: subject.done.has(item.key) }));
  }

  private status(item: CareItem, done: boolean, now: number): VisitStatus {
    if (done) return 'done';
    if (dayKey(item.due) === dayKey(now)) return 'due';
    return item.due < dayStart(dayKey(now)) ? 'missed' : 'upcoming';
  }

  private itemTitle(item: CareItem): string {
    const text = itemText('en', item);
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
