import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { HealthWorkerGuard } from './health-worker.guard.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, HealthWorkerGuard],
  exports: [AuthService, HealthWorkerGuard],
})
export class AuthModule {}
