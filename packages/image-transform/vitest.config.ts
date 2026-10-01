import { createVitestConfig } from '@internal/cfg-vitest';

export default createVitestConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/utils/overrides.ts'],
    coverage: {
      include: ['index.js', 'src/**/*.ts'],
      // Tests still require() the sources natively, outside Vite's coverage,
      // until they move to ESM imports
      thresholds: {},
    },
  },
});
