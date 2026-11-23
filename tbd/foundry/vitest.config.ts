import { createVitestConfig } from '@internal/cfg-vitest';

export default createVitestConfig({
  test: {
    coverage: {
      // The adapter manager's unreachable guards hold these below 100.
      thresholds: { lines: 96, functions: 100, branches: 90, statements: 96 },
    },
  },
});
