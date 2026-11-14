import { Body, Controller, Header, HttpCode, Logger, Post } from '@nestjs/common';
import { z } from 'zod';
import { CareService } from '../care/care.service.js';
import { UssdService } from './ussd.service.js';

// Africa's Talking posts these as application/x-www-form-urlencoded.
const ussdBody = z.object({
  sessionId: z.string().min(1).max(128),
  phoneNumber: z.string().min(5).max(20),
  text: z.string().max(500).default(''),
  serviceCode: z.string().optional(),
  networkCode: z.string().optional(),
});

@Controller('ussd')
export class UssdController {
  private readonly logger = new Logger(UssdController.name);

  constructor(
    private readonly ussd: UssdService,
    private readonly care: CareService,
  ) {}

  /** Africa's Talking USSD callback. Replies "CON ..." to continue or "END ..." to close the session. */
  @Post()
  @HttpCode(200)
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async callback(@Body() body: unknown): Promise<string> {
    const parsed = ussdBody.safeParse(body);
    if (!parsed.success) return 'END Sorry, something went wrong. Please dial again.';
    try {
      const result = await this.ussd.handle(parsed.data);
      // Answer the phone first; the follow-up work (SMS, alerts, records) happens after.
      void this.care.run(result.actions);
      return result.reply;
    } catch (error) {
      this.logger.error(`USSD request failed: ${(error as Error).message}`, (error as Error).stack);
      return 'END Sorry, something went wrong. If this is an emergency, go to the nearest clinic or call 112.';
    }
  }
}
