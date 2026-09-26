import { createVitestConfig } from '@internal/cfg-vitest';

export default createVitestConfig({
  test: {
    globals: true,
    coverage: {
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90,
      },
    },
  },
});
