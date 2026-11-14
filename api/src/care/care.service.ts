import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service.js';
import { hashPin } from '../auth/pin.js';
import type { Env } from '../config/env.js';
import { AuditService } from '../core/audit.service.js';
import { ClockService } from '../core/clock.service.js';
import { DirectoryService } from '../core/directory.service.js';
import { signLabel, sms, type Lang, type Sign, type SignGroup } from '../content/i18n.js';
import { birthDateFromWeeks, currentWeek, dueDateFromMonths, findContent, formatDate, gestationalWeeks, babyWeeks, nextItem } from '../content/schedule.js';
import { maxLevel, ruleTriage } from '../content/triage.js';
import type { Facility, Mother } from '../generated/prisma/client.js';
import type { MessageKind, PatientGroup, TriageSource } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SmsService } from '../sms/sms.service.js';
import type { Action } from '../ussd/actions.js';
import { itemText } from '../ussd/menu.js';
import { toCareSubject } from './care-subject.js';
import { RemindersService } from './reminders.service.js';

const GROUP: Record<SignGroup, PatientGroup> = { pregnant: 'PREGNANT', mother: 'AFTER_BIRTH', baby: 'BABY' };
const englishOrPidgin = (lang: Lang) => (lang === 'pcm' ? 'pcm' : 'en');

/** Carries out what a USSD screen or SMS reply asked for: registration, consent, emergencies, answers. */
@Injectable()
export class CareService {
  private readonly logger = new Logger(CareService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly ai: AiService,
    private readonly directory: DirectoryService,
    private readonly audit: AuditService,
    private readonly clock: ClockService,
    private readonly reminders: RemindersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Runs each action in order; one failing never stops the others. */
  async run(actions: Action[]): Promise<void> {
    for (const action of actions) {
      try {
        await this.dispatch(action);
      } catch (error) {
        this.logger.error(`${action.type} failed: ${(error as Error).message}`, (error as Error).stack);
      }
    }
  }

  private dispatch(action: Action): Promise<void> {
    switch (action.type) {
      case 'register':
        return this.register(action);
      case 'consent':
        return this.consent(action);
      case 'emergency':
        return this.raiseEmergency({
          phone: action.phone,
          lang: action.lang,
          group: action.group,
          sign: action.sign,
          signText: signLabel(englishOrPidgin(action.lang), action.sign),
          signEnglish: signLabel('en', action.sign),
          source: 'MENU',
          location: action.location,
        });
      case 'respond':
        return this.respond(action);
      case 'sendClinic':
        return this.sendClinic(action);
      case 'markDone':
        return this.markDone(action);
      case 'setLanguage':
        return this.setLanguage(action);
      case 'sendFollowups':
        return this.sendFollowups(action.healthWorkerId);
      case 'setPin':
        return this.setPin(action.healthWorkerId, action.pin);
    }
  }

  private get code() {
    return this.config.get('USSD_CODE', { infer: true });
  }

  // ---------- Registration and consent ----------

  /**
   * A mother who registers herself has just agreed on the consent screen. One registered by a
   * health worker is saved as PENDING and gets only the consent request until she replies YES.
   */
  private async register(a: Extract<Action, { type: 'register' }>): Promise<void> {
    const now = new Date(this.clock.now());
    const self = a.registeredBy === 'SELF';
    const facility = await this.directory.matchFacility(a.location);
    const worker = a.healthWorkerId
      ? await this.prisma.healthWorker.findUnique({ where: { id: a.healthWorkerId } })
      : await this.directory.matchHealthWorker(a.location);

    if (await this.prisma.mother.findUnique({ where: { phone: a.phone } })) {
      this.logger.warn('Registration skipped: number already registered');
      return;
    }
    const mother = await this.prisma.mother.create({
      data: {
        phone: a.phone,
        language: a.lang,
        track: a.track,
        expectedDueDate: a.track === 'PREGNANCY' ? dueDateFromMonths(a.amount, now.getTime()) : null,
        babyBirthDate: a.track === 'BABY' ? birthDateFromWeeks(a.amount, now.getTime()) : null,
        location: a.location,
        facilityId: facility?.id ?? null,
        healthWorkerId: worker?.id ?? null,
        registeredBy: a.registeredBy,
        registeredAt: now,
        trackStartedAt: now,
        consentStatus: self ? 'GIVEN' : 'PENDING',
        consentGivenAt: self ? now : null,
        consentChannel: self ? 'USSD' : null,
        consentRequestedAt: self ? null : now,
      },
    });
    await this.audit.record({
      actorType: self ? 'MOTHER' : 'HEALTH_WORKER',
      actorId: self ? mother.id : (a.healthWorkerId ?? null),
      action: 'mother.registered',
      subjectType: 'mother',
      subjectId: mother.id,
    });

    if (self) {
      await this.audit.record({ actorType: 'MOTHER', actorId: mother.id, action: 'consent.given', subjectType: 'mother', subjectId: mother.id, details: { channel: 'USSD' } });
      await this.welcome(mother.id);
      return;
    }
    const text = sms(a.lang, 'consentRequest', { worker: worker?.name ?? 'Your health worker' });
    await this.send(a.phone, a.lang, text, 'CONSENT');
  }

  /** Her answer to the consent request. "no" (or STOP at any time) deletes her details. */
  async consent({ phone, answer, channel }: { phone: string; answer: 'yes' | 'no'; channel: 'USSD' | 'SMS' }): Promise<void> {
    const mother = await this.prisma.mother.findUnique({ where: { phone } });
    if (!mother) return;

    if (answer === 'yes') {
      if (mother.consentStatus === 'GIVEN') return;
      await this.prisma.mother.update({ where: { id: mother.id }, data: { consentStatus: 'GIVEN', consentGivenAt: new Date(this.clock.now()), consentChannel: channel } });
      await this.audit.record({ actorType: 'MOTHER', actorId: mother.id, action: 'consent.given', subjectType: 'mother', subjectId: mother.id, details: { channel } });
      await this.welcome(mother.id);
      return;
    }

    await this.deleteMother(mother, mother.consentStatus === 'PENDING' ? 'consent-refused' : 'opted-out', channel);
    if (channel === 'SMS') await this.sms.send({ to: phone, body: sms(mother.language, 'optedOut', { code: this.code }), kind: 'CONSENT' });
  }

  /**
   * Removes a mother's personal data. Her records cascade; alerts keep the event for
   * safety review but lose her number. The SMS log keeps messages already sent.
   */
  private async deleteMother(mother: Mother, reason: string, channel: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.alert.updateMany({ where: { motherId: mother.id }, data: { phone: 'deleted' } }),
      this.prisma.mother.delete({ where: { id: mother.id } }),
    ]);
    await this.audit.record({ actorType: 'MOTHER', actorId: null, action: 'mother.deleted', subjectType: 'mother', subjectId: mother.id, details: { reason, channel } });
  }

  /** Welcome SMS with her next visit, then whatever reminder or tip is due now. */
  private async welcome(motherId: string): Promise<void> {
    const now = this.clock.now();
    const mother = await this.prisma.mother.findUniqueOrThrow({ where: { id: motherId }, include: { facility: true, careRecords: true, sentReminders: true } });
    const care = toCareSubject(mother);
    const next = nextItem(care, now);
    const text = sms(mother.language, mother.track === 'PREGNANCY' ? 'welcomePregnant' : 'welcomeBaby', {
      weeks: currentWeek(care, now),
      next: next ? `${itemText(mother.language, next)}, ${formatDate(next.due)}` : '-',
      facility: this.facilityName(mother.language, mother.facility),
      code: this.code,
    });
    await this.send(mother.phone, mother.language, text, 'WELCOME');
    await this.reminders.processMother(mother.id);
  }

  // ---------- Danger signs and questions ----------

  private async raiseEmergency(e: {
    phone: string;
    lang: Lang;
    group: SignGroup;
    sign: Sign | 'other';
    signText: string;
    signEnglish: string;
    source: TriageSource;
    location: string | null;
  }): Promise<void> {
    const now = this.clock.now();
    const mother = await this.prisma.mother.findUnique({ where: { phone: e.phone }, include: { facility: true } });
    const facility = mother ? mother.facility : await this.directory.matchFacility(e.location);
    const worker = mother?.healthWorkerId
      ? await this.prisma.healthWorker.findUnique({ where: { id: mother.healthWorkerId } })
      : await this.directory.matchHealthWorker(e.location);
    const place = mother?.location ?? e.location ?? 'location unknown';
    const detail = mother ? this.describe(mother, now) : `${e.group}, not registered`;

    await this.prisma.alert.create({
      data: {
        motherId: mother?.id ?? null,
        phone: e.phone,
        group: GROUP[e.group],
        sign: e.sign,
        signLabel: e.signEnglish,
        source: e.source,
        location: place,
        detail,
        facilityId: facility?.id ?? null,
        healthWorkerId: worker?.id ?? null,
      },
    });

    // The mother's SMS goes first and is never held up by translation for more than a few seconds.
    const template = e.group === 'baby' ? 'emergencyBaby' : 'emergencyMother';
    await this.send(e.phone, e.lang, sms(e.lang, template, { sign: e.signText, facility: this.facilityName(e.lang, facility) }), 'URGENT', 5000);

    const alert = `MamaLine URGENT: ${e.phone} reports ${e.signEnglish} (${detail}) in ${place}. Call her now.`;
    const to = worker?.phone ?? this.config.get('DUTY_PHONE', { infer: true });
    if (to) await this.sms.send({ to, body: alert, kind: 'HEALTH_WORKER' });
  }

  /** Free text: rules set the minimum urgency first; the AI can only raise it. */
  private async respond(a: Extract<Action, { type: 'respond' }>): Promise<void> {
    const now = this.clock.now();
    const mother = await this.prisma.mother.findUnique({ where: { phone: a.phone }, include: { facility: true } });
    const rules = ruleTriage(a.text);
    const context = `${mother ? this.describe(mother, now) : 'not registered'}${a.group ? `; message is about: ${a.group}` : ''}`;
    const ai = await this.ai.respond({ text: a.text, lang: a.lang, context });

    let level = maxLevel(rules.level, ai?.level ?? 'routine');
    if (!ai && a.isProblem) level = maxLevel(level, 'soon'); // came through the danger menu
    const question = await this.prisma.question.create({
      data: {
        motherId: mother?.id ?? null,
        phone: a.phone,
        language: a.lang,
        isProblem: a.isProblem,
        text: a.text,
        level: level === 'emergency' ? 'EMERGENCY' : level === 'soon' ? 'SOON' : 'ROUTINE',
        ruleSigns: rules.signs,
        usedAi: Boolean(ai),
      },
    });

    if (level === 'emergency') {
      const sign = rules.signs[0];
      await this.raiseEmergency({
        phone: a.phone,
        lang: a.lang,
        group: a.group ?? (mother?.track === 'BABY' ? 'mother' : 'pregnant'),
        sign: sign ?? 'other',
        signText: sign ? signLabel(englishOrPidgin(a.lang), sign) : a.lang === 'pcm' ? 'Wetin you talk' : 'What you describe',
        signEnglish: sign ? signLabel('en', sign) : `"${a.text.slice(0, 60)}"`,
        source: sign ? 'RULES' : 'AI',
        location: mother?.location ?? null,
      });
      await this.prisma.question.update({ where: { id: question.id }, data: { answer: 'Emergency advice sent; health worker alerted.' } });
      return;
    }

    let answer: string;
    let needsCall = false;
    if (level === 'soon') {
      answer = ai?.text ?? sms(a.lang, 'soon', { facility: this.facilityName(a.lang, mother?.facility ?? null) });
      needsCall = true;
    } else {
      const content = ai ? null : findContent(a.text);
      answer = ai?.text ?? content?.sms[englishOrPidgin(a.lang)] ?? sms(a.lang, 'noAnswer');
      needsCall = !ai && !content;
    }
    await this.send(a.phone, a.lang, answer, 'ANSWER');
    await this.prisma.question.update({ where: { id: question.id }, data: { answer } });
    if (needsCall) {
      await this.prisma.followUp.create({
        data: {
          motherId: mother?.id ?? null,
          phone: a.phone,
          healthWorkerId: mother?.healthWorkerId ?? null,
          reason: `${level === 'soon' ? 'Reported' : 'Asked'}: "${a.text.slice(0, 80)}"`,
        },
      });
    }
  }

  // ---------- Everyday requests ----------

  private async sendClinic({ phone, lang }: { phone: string; lang: Lang }): Promise<void> {
    const mother = await this.prisma.mother.findUnique({ where: { phone }, include: { facility: true } });
    const f = mother?.facility;
    const text = f ? sms(lang, 'clinic', { facility: f.name, lga: f.lga, state: f.state, services: f.services }) : sms(lang, 'noAnswer');
    await this.send(phone, lang, text, 'CLINIC');
  }

  private async markDone({ phone, itemKey }: { phone: string; itemKey: string }): Promise<void> {
    const mother = await this.prisma.mother.findUnique({ where: { phone } });
    if (!mother) return;
    const now = new Date(this.clock.now());
    await this.prisma.careRecord.upsert({
      where: { motherId_itemKey: { motherId: mother.id, itemKey } },
      create: { motherId: mother.id, itemKey, channel: 'USSD', completedAt: now },
      update: {},
    });
    await this.prisma.followUp.updateMany({ where: { motherId: mother.id, itemKey, status: 'OPEN' }, data: { status: 'DONE', doneAt: now } });
  }

  private async setLanguage({ phone, lang }: { phone: string; lang: Lang }): Promise<void> {
    await this.prisma.mother.updateMany({ where: { phone }, data: { language: lang } });
  }

  private async sendFollowups(healthWorkerId: string): Promise<void> {
    const worker = await this.prisma.healthWorker.findUnique({ where: { id: healthWorkerId } });
    if (!worker) return;
    const [alerts, followUps] = await Promise.all([
      this.prisma.alert.findMany({ where: { healthWorkerId, status: 'OPEN' }, orderBy: { createdAt: 'desc' } }),
      this.prisma.followUp.findMany({ where: { healthWorkerId, status: 'OPEN' }, orderBy: { createdAt: 'desc' } }),
    ]);
    const items = [...alerts.map((x) => `${x.phone} URGENT ${x.signLabel}`), ...followUps.map((x) => `${x.phone} ${x.reason}`)];
    const text = items.length ? `MamaLine follow-ups (${items.length}): ${items.join('; ')}` : 'MamaLine: No open follow-ups. Well done.';
    await this.sms.send({ to: worker.phone, body: text, kind: 'HEALTH_WORKER' });
  }

  private async setPin(healthWorkerId: string, pin: string): Promise<void> {
    const { salt, hash } = hashPin(pin);
    await this.prisma.$transaction([
      this.prisma.healthWorker.update({ where: { id: healthWorkerId }, data: { pinSalt: salt, pinHash: hash, pinSetAt: new Date(this.clock.now()) } }),
      this.prisma.pinFailure.deleteMany({ where: { healthWorkerId } }),
    ]);
    await this.audit.record({ actorType: 'HEALTH_WORKER', actorId: healthWorkerId, action: 'pin.changed', subjectType: 'health_worker', subjectId: healthWorkerId });
  }

  // ---------- Helpers ----------

  private describe(mother: Mother, now: number): string {
    return mother.track === 'PREGNANCY'
      ? `about ${gestationalWeeks(mother, now)} weeks pregnant`
      : `mother of a baby about ${babyWeeks(mother, now)} weeks old`;
  }

  private facilityName(lang: Lang, facility: Facility | null | undefined): string {
    return facility?.name ?? sms(lang, 'nearestFacility');
  }

  private async send(to: string, lang: Lang, text: string, kind: MessageKind, translateTimeoutMs?: number): Promise<void> {
    await this.sms.send({ to, body: await this.ai.localize(text, lang, translateTimeoutMs), kind });
  }
}
