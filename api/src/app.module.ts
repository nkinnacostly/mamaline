import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { CareModule } from './care/care.module.js';
import { envSchema } from './config/env.js';
import { CoreModule } from './core/core.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UssdModule } from './ussd/ussd.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    ScheduleModule.forRoot(),
    // Applied only where a route opts in (sign-in). The USSD and SMS callbacks all come from
    // Africa's Talking's few addresses, so a global per-address limit would block mothers.
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 60 }] }),
    PrismaModule,
    CoreModule,
    HealthModule,
    CareModule,
    UssdModule,
    AuthModule,
    DashboardModule,
  ],
})
export class AppModule {}
