import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['tests/globalSetup.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/crm_test',
      JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
      JWT_EXPIRES_IN: '2h',
      FRONTEND_ORIGIN: 'http://localhost:5173',
      BCRYPT_COST: '4',
      LOG_LEVEL: 'silent',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
});
