import { CanActivate, createParamDecorator, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { HealthWorker } from '../generated/prisma/client.js';
import { AuthService } from './auth.service.js';

type AuthedRequest = Request & { healthWorker?: HealthWorker; sessionToken?: string };

export function bearerToken(req: Request): string | null {
  const header = req.headers.authorization ?? '';
  const match = /^Bearer\s+([A-Za-z0-9_-]{20,})$/.exec(header);
  return match ? match[1] : null;
}

/** Requires a signed-in health worker (Authorization: Bearer <token>). */
@Injectable()
export class HealthWorkerGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = bearerToken(req);
    const worker = token ? await this.auth.validate(token) : null;
    if (!worker) throw new UnauthorizedException('Please sign in again.');
    req.healthWorker = worker;
    req.sessionToken = token!;
    return true;
  }
}

/** The signed-in health worker, set by HealthWorkerGuard. */
export const CurrentWorker = createParamDecorator((_: unknown, context: ExecutionContext): HealthWorker => {
  return context.switchToHttp().getRequest<AuthedRequest>().healthWorker!;
});
