import { Controller, Get, Header } from '@nestjs/common';
import { PublicStatsService } from './public-stats.service.js';

/** Open data: anonymous totals behind the website's impact page. No sign-in, no personal data. */
@Controller('public')
export class PublicStatsController {
  constructor(private readonly publicStats: PublicStatsService) {}

  @Get('stats')
  // Fresh within a minute, and cheap for the database however many people look.
  @Header('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=300')
  // Anyone may build on the figures (UNICEF and other partners, researchers).
  @Header('Access-Control-Allow-Origin', '*')
  stats() {
    return this.publicStats.stats();
  }
}
