import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { ClockService } from './clock.service.js';
import { DirectoryService } from './directory.service.js';

@Global()
@Module({
  providers: [ClockService, DirectoryService, AuditService],
  exports: [ClockService, DirectoryService, AuditService],
})
export class CoreModule {}
