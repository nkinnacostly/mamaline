import { createHash, timingSafeEqual } from 'node:crypto';
import { Controller, Get, Headers, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { RemindersService } from './reminders.service.js';

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Runs scheduled reminders when the host calls it (Vercel Cron sends
 * "Authorization: Bearer <CRON_SECRET>"). Off unless CRON_SECRET is set.
 */
@Controller('internal')
export class CronController {
  constructor(
    private readonly reminders: RemindersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get('reminders')
  async runReminders(@Headers('authorization') authorization?: string) {
    const secret = this.config.get('CRON_SECRET', { infer: true });
    if (!secret) throw new NotFoundException();
    if (!timingSafeEqual(digest(authorization ?? ''), digest(`Bearer ${secret}`))) throw new UnauthorizedException();
    await this.reminders.runDue();
    return { ok: true };
  }
}
