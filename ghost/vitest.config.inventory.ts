import { defineConfig } from 'vitest/config';

// Metadata validation needs no Ghost runtime setup or built workspace packages.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'threads',
    include: ['test/unit/server/services/service-inventory.test.ts'],
    reporters: process.env.GITHUB_ACTIONS ? ['default', 'github-actions'] : ['dot'],
  },
});
