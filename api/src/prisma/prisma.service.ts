import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import type { Env } from '../config/env.js';

/**
 * The database client for the whole app.
 *
 * Connects through DATABASE_URL, which on Neon should be the pooled URL. Neon's
 * pooler runs PgBouncer in transaction mode, so avoid session features here
 * (SET, advisory locks held across queries, LISTEN/NOTIFY); use the direct URL
 * for anything that needs them.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService<Env, true>) {
    const adapter = new PrismaPg({
      connectionString: config.get('DATABASE_URL', { infer: true }),
      max: config.get('DATABASE_POOL_SIZE', { infer: true }),
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
