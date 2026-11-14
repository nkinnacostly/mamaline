import { BadRequestException, Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentWorker, HealthWorkerGuard } from '../auth/health-worker.guard.js';
import { LANG_CODES } from '../content/i18n.js';
import { normalizePhone } from '../content/text.js';
import type { HealthWorker } from '../generated/prisma/client.js';
import { DashboardService } from './dashboard.service.js';
import { DATE_KEY } from './days.js';

const registerBody = z
  .object({
    phone: z.string().min(5).max(20),
    language: z.enum(LANG_CODES),
    track: z.enum(['PREGNANCY', 'BABY']),
    amount: z.coerce.number().int(),
    location: z.string().trim().min(2).max(80),
  })
  .refine((b) => (b.track === 'PREGNANCY' ? b.amount >= 1 && b.amount <= 9 : b.amount >= 0 && b.amount <= 52), {
    message: 'Months pregnant must be 1 to 9; baby age must be 0 to 52 weeks.',
  });

const dateParam = (value: string | undefined) => {
  if (value === undefined) return undefined;
  if (!DATE_KEY.test(value) || Number.isNaN(Date.parse(value))) throw new BadRequestException('Dates look like 2026-11-14.');
  return value;
};

/** The health worker dashboard. Every route is limited to the signed-in health worker's own mothers. */
@Controller('dashboard')
@UseGuards(HealthWorkerGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('week')
  week(@CurrentWorker() worker: HealthWorker, @Query('date') date?: string) {
    return this.dashboard.week(worker, dateParam(date));
  }

  @Get('month')
  month(@CurrentWorker() worker: HealthWorker, @Query('date') date?: string) {
    return this.dashboard.month(worker, dateParam(date));
  }

  @Get('day')
  day(@CurrentWorker() worker: HealthWorker, @Query('date') date?: string) {
    return this.dashboard.day(worker, dateParam(date));
  }

  @Get('follow-ups')
  followUps(@CurrentWorker() worker: HealthWorker) {
    return this.dashboard.openWork(worker);
  }

  @Get('mothers')
  mothers(@CurrentWorker() worker: HealthWorker) {
    return this.dashboard.mothers(worker);
  }

  @Post('mothers')
  async register(@CurrentWorker() worker: HealthWorker, @Body() body: unknown) {
    const parsed = registerBody.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Check the form and try again.');
    const phone = normalizePhone(parsed.data.phone);
    if (!phone) throw new BadRequestException('Enter a Nigerian mobile number, like 0803 123 4567.');
    return this.dashboard.register(worker, { ...parsed.data, phone });
  }

  @Post('mothers/:id/birth')
  @HttpCode(200)
  recordBirth(@CurrentWorker() worker: HealthWorker, @Param('id', ParseUUIDPipe) id: string) {
    return this.dashboard.recordBirth(worker, id);
  }

  @Post('mothers/:id/visits/:itemKey/done')
  @HttpCode(200)
  visitDone(@CurrentWorker() worker: HealthWorker, @Param('id', ParseUUIDPipe) id: string, @Param('itemKey') itemKey: string) {
    if (!/^(anc-\d{1,2}|vx-[a-z0-9]{2,5})$/.test(itemKey)) throw new BadRequestException('Unknown visit.');
    return this.dashboard.markVisitDone(worker, id, itemKey);
  }

  @Post('alerts/:id/contacted')
  @HttpCode(200)
  contacted(@CurrentWorker() worker: HealthWorker, @Param('id', ParseUUIDPipe) id: string) {
    return this.dashboard.markAlertContacted(worker, id);
  }

  @Post('follow-ups/:id/done')
  @HttpCode(200)
  done(@CurrentWorker() worker: HealthWorker, @Param('id', ParseUUIDPipe) id: string) {
    return this.dashboard.markFollowUpDone(worker, id);
  }
}
