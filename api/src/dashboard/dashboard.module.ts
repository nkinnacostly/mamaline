import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CareModule } from '../care/care.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [AuthModule, CareModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
