import { Injectable } from '@nestjs/common';

/** The current time. Inject this instead of calling Date.now(), so tests can move time forward. */
@Injectable()
export class ClockService {
  now(): number {
    return Date.now();
  }
}
