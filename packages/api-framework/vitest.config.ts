import { createVitestConfig } from '@internal/cfg-vitest';

export default createVitestConfig({
  test: {
    globals: true,
    coverage: {
      thresholds: {
        lines: 99,
        functions: 99,
        branches: 89,
        statements: 99,
      },
    },
  },
});
