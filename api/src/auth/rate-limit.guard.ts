import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';

const WINDOW_MS = 60_000;
const LIMIT = 10;
const MAX_KEYS = 10_000;

/**
 * Limits sign-in attempts to 10 a minute per client address. It counts in memory, so on a
 * serverless host each running instance counts separately: it slows down scripted guessing,
 * while the real protection is the per-number PIN lockout kept in the database.
 */
@Injectable()
export class SignInRateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  canActivate(context: ExecutionContext): boolean {
    const now = Date.now();
    const key = clientAddress(context.switchToHttp().getRequest<Request>());
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (this.hits.size >= MAX_KEYS) this.prune(now);
      this.hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }
    entry.count += 1;
    if (entry.count > LIMIT) throw new HttpException('Too many sign-in attempts. Please wait a minute.', HttpStatus.TOO_MANY_REQUESTS);
    return true;
  }

  private prune(now: number) {
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key);
    if (this.hits.size >= MAX_KEYS) this.hits.clear();
  }
}

/** On Vercel the platform sets x-real-ip; elsewhere use the socket address (headers can be forged). */
function clientAddress(req: Request): string {
  const real = process.env.VERCEL ? req.headers['x-real-ip'] : undefined;
  return (typeof real === 'string' && real) || req.ip || req.socket.remoteAddress || 'unknown';
}
