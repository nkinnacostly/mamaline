import { z } from 'zod';

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
});

export type Env = z.infer<typeof envSchema>;
