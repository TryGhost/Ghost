import { createVitestConfig } from '@internal/cfg-vitest';

export default createVitestConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.js'],
    setupFiles: ['test/utils/overrides.js'],
    coverage: {
      include: ['index.js', 'src/**/*.js'],
    },
  },
});
