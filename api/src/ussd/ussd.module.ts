import { Module } from '@nestjs/common';
import { CareModule } from '../care/care.module.js';
import { UssdController } from './ussd.controller.js';
import { UssdService } from './ussd.service.js';

@Module({
  imports: [CareModule],
  controllers: [UssdController],
  providers: [UssdService],
})
export class UssdModule {}
