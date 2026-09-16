import { createVitestConfig } from '@internal/cfg-vitest';

// The shared contract test suite (contract-test-suite.ts) is a package export
// exercised by each *backend's* tests (e.g. the in-memory backend in ghost/core),
// not by this package's own unit tests - exclude it from this package's coverage.
export default createVitestConfig({
  test: {
    coverage: {
      exclude: ['src/contract-test-suite.ts'],
    },
  },
});
