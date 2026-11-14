import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Flows make many HTTP and database round trips; the suites share one database, so run files in sequence.
    testTimeout: 30_000,
    fileParallelism: false,
    env: { REMINDERS_ENABLED: 'false', AI_ENABLED: 'false' },
  },
});
