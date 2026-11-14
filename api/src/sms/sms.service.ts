import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { toSms } from '../content/text.js';
import type { MessageKind } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Sample and demo records use +2348000000xxx; never send real SMS to that range.
const DEMO_RANGE = '+2348000000';

type AtResponse = { SMSMessageData?: { Recipients?: { status?: string; messageId?: string; statusCode?: number }[] } };

/**
 * Sends SMS through Africa's Talking (https://developers.africastalking.com/docs/sms/sending)
 * and records every message in outbound_messages. Without credentials, messages are
 * recorded as SIMULATED so the rest of the system can be tested end to end.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  get live(): boolean {
    return Boolean(this.config.get('AT_API_KEY', { infer: true }) && this.config.get('AT_USERNAME', { infer: true }));
  }

  async send({ to, body, kind }: { to: string; body: string; kind: MessageKind }) {
    const text = toSms(body);
    if (!this.live || to.startsWith(DEMO_RANGE)) {
      this.logger.debug(`[simulated ${kind} -> ${to}] ${text}`);
      return this.prisma.outboundMessage.create({ data: { to, body: text, kind, status: 'SIMULATED' } });
    }

    const message = await this.prisma.outboundMessage.create({ data: { to, body: text, kind } });
    try {
      const sandbox = this.config.get('AT_ENV', { infer: true }) === 'sandbox';
      const url = sandbox ? 'https://api.sandbox.africastalking.com/version1/messaging' : 'https://api.africastalking.com/version1/messaging';
      const form = new URLSearchParams({ username: this.config.get('AT_USERNAME', { infer: true })!, to, message: text });
      const sender = this.config.get('AT_SENDER_ID', { infer: true });
      if (sender) form.set('from', sender);

      const res = await fetch(url, {
        method: 'POST',
        headers: { apiKey: this.config.get('AT_API_KEY', { infer: true })!, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
        signal: AbortSignal.timeout(10_000),
      });
      const payload = (await res.json().catch(() => ({}))) as AtResponse;
      const recipient = payload.SMSMessageData?.Recipients?.[0];
      const ok = res.ok && recipient?.status === 'Success';
      return this.prisma.outboundMessage.update({
        where: { id: message.id },
        data: ok
          ? { status: 'SENT', sentAt: new Date(), providerId: recipient?.messageId ?? null }
          : { status: 'FAILED', error: `HTTP ${res.status}: ${recipient?.status ?? 'no recipient status'}` },
      });
    } catch (error) {
      this.logger.error(`SMS to ${to} failed: ${(error as Error).message}`);
      return this.prisma.outboundMessage.update({ where: { id: message.id }, data: { status: 'FAILED', error: (error as Error).message } });
    }
  }
}
