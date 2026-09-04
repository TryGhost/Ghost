import { createVitestConfig } from '@internal/cfg-vitest';

export default createVitestConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.js'],
    coverage: {
      include: ['index.js', 'lib/**/*.js'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90,
      },
    },
  },
});
