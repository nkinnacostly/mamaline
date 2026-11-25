import { z } from 'zod';

const flag = (fallback: boolean) =>
  z
    .enum(['true', 'false', '1', '0', 'on', 'off'])
    .default(fallback ? 'true' : 'false')
    .transform((v) => v === 'true' || v === '1' || v === 'on');

// Every setting the API reads, validated once at startup so a missing or malformed
// value stops the app immediately instead of failing on a mother's first request.
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Neon: the POOLED URL (host contains "-pooler") for the running app.
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Neon: the DIRECT URL, used by the Prisma CLI for migrations (prisma7.config.ts).
  DIRECT_URL: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
  // Maximum open connections per app instance.
  DATABASE_POOL_SIZE: z.coerce.number().int().min(1).max(50).default(10),

  // The USSD code mothers dial; appears in SMS text.
  USSD_CODE: z.string().default('*384*2#'),

  // Africa's Talking. Without a key, SMS are recorded as SIMULATED and not sent.
  AT_USERNAME: z.string().optional(),
  AT_API_KEY: z.string().optional(),
  AT_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  AT_SENDER_ID: z.string().optional(),

  // Claude. Without a key, replies come from the safety rules and validated messages only.
  ANTHROPIC_API_KEY: z.string().optional(),
  MAMALINE_MODEL: z.string().default('claude-opus-5-5'),
  AI_ENABLED: flag(true),

  // Receives urgent alerts from places with no health worker on the roster.
  DUTY_PHONE: z.string().optional(),

  // Runs the reminder scheduler in this instance. Turn off in tests, on extra instances,
  // and on serverless hosts (Vercel), where a cron job calls /internal/reminders instead.
  REMINDERS_ENABLED: flag(true),
  // Lets the host's cron call GET /internal/reminders with "Authorization: Bearer <secret>".
  CRON_SECRET: z.string().min(16).optional(),

  // What GET /public/stats says its figures are. Keep "sample" until the sample records are
  // removed and real mothers use MamaLine, so the public page never presents test data as impact.
  PUBLIC_DATA_STATUS: z.enum(['sample', 'live']).default('sample'),
});

export type Env = z.infer<typeof envSchema>;
