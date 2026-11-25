import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module.js';
import { CareModule } from './care/care.module.js';
import { envSchema } from './config/env.js';
import { CoreModule } from './core/core.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PublicStatsModule } from './public-stats/public-stats.module.js';
import { UssdModule } from './ussd/ussd.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CoreModule,
    HealthModule,
    CareModule,
    UssdModule,
    AuthModule,
    DashboardModule,
    PublicStatsModule,
  ],
})
export class AppModule {}
