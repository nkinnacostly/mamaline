import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// Global: nearly every MamaLine module (USSD, SMS, reminders, dashboard) reads the database.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
