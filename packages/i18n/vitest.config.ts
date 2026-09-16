import { createVitestConfig } from '@internal/cfg-vitest';

export default createVitestConfig({
  test: {
    coverage: {
      exclude: ['src/types.ts', 'src/vite-glob.d.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
