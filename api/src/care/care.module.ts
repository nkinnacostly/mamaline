import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { SmsModule } from '../sms/sms.module.js';
import { CareService } from './care.service.js';
import { CronController } from './cron.controller.js';
import { RemindersService } from './reminders.service.js';
import { SmsInboundController } from './sms-inbound.controller.js';

@Module({
  imports: [SmsModule, AiModule],
  controllers: [SmsInboundController, CronController],
  providers: [CareService, RemindersService],
  exports: [CareService, RemindersService],
})
export class CareModule {}
