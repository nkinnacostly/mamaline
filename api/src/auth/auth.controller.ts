import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import type { HealthWorker } from '../generated/prisma/client.js';
import { AuthService } from './auth.service.js';
import { bearerToken, CurrentWorker, HealthWorkerGuard } from './health-worker.guard.js';
import { SignInRateLimitGuard } from './rate-limit.guard.js';

const signInBody = z.object({ phone: z.string().min(5).max(20), pin: z.string().regex(/^\d{4}$/) });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Phone number + PIN. Limited to 10 attempts a minute per address, on top of the PIN lockout. */
  @Post('sign-in')
  @HttpCode(200)
  @UseGuards(SignInRateLimitGuard)
  signIn(@Body() body: unknown, @Headers('user-agent') userAgent?: string) {
    const parsed = signInBody.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Enter your phone number and 4-digit PIN.');
    return this.auth.signIn(parsed.data.phone, parsed.data.pin, userAgent);
  }

  @Post('sign-out')
  @HttpCode(204)
  @UseGuards(HealthWorkerGuard)
  async signOut(@Req() req: Request) {
    await this.auth.signOut(bearerToken(req)!);
  }

  @Get('me')
  @UseGuards(HealthWorkerGuard)
  me(@CurrentWorker() worker: HealthWorker) {
    return this.auth.publicView(worker);
  }
}
