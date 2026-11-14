import { Body, Controller, Header, HttpCode, Post } from '@nestjs/common';
import { z } from 'zod';
import { parseReply } from '../content/text.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CareService } from './care.service.js';

// Africa's Talking inbound SMS callback fields (application/x-www-form-urlencoded).
const inboundBody = z.object({
  from: z.string().min(5).max(20),
  text: z.string().max(1000).default(''),
  to: z.string().optional(),
  id: z.string().optional(),
  date: z.string().optional(),
  linkId: z.string().optional(),
});

@Controller('sms')
export class SmsInboundController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly care: CareService,
  ) {}

  /** YES / NO answers to the consent request, and STOP at any time. */
  @Post('inbound')
  @HttpCode(200)
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async inbound(@Body() body: unknown): Promise<string> {
    const parsed = inboundBody.safeParse(body);
    if (!parsed.success) return 'OK';
    const { from, text, id } = parsed.data;
    const answer = parseReply(text);
    await this.prisma.inboundMessage.create({ data: { from, text, interpretedAs: answer, providerId: id ?? null } });

    const mother = answer ? await this.prisma.mother.findUnique({ where: { phone: from }, select: { consentStatus: true } }) : null;
    // A YES from someone who already agreed changes nothing; a NO or STOP always removes her.
    if (mother && answer && !(answer === 'yes' && mother.consentStatus === 'GIVEN')) {
      void this.care.run([{ type: 'consent', phone: from, answer, channel: 'SMS' }]);
    }
    return 'OK';
  }
}
