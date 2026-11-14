import { envSchema } from './env.js';

describe('environment settings', () => {
  it('accepts a Neon pooled URL and fills defaults', () => {
    const env = envSchema.parse({ DATABASE_URL: 'postgresql://user:pass@ep-calm-sun-123456-pooler.eu-central-1.aws.neon.tech/mamaline?sslmode=require' });
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_POOL_SIZE).toBe(10);
    expect(env.NODE_ENV).toBe('development');
  });

  it('refuses to start without a database URL', () => {
    expect(() => envSchema.parse({})).toThrow();
  });

  it('refuses a URL that is not Postgres', () => {
    expect(() => envSchema.parse({ DATABASE_URL: 'mysql://localhost/db' })).toThrow();
  });
});
