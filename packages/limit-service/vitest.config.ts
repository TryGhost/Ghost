import { createVitestConfig } from '@internal/cfg-vitest';

/**
 * Only the parts that are awkward to reach from outside are unit tested here: the date
 * maths, which is a pure algorithm with cases like leap years and a period starting on the
 * 31st, and the zero-value comparisons in a counted limit, which nothing in Ghost currently
 * exercises.
 *
 * Everything else is covered by the tests that drive Ghost with limits configured, in
 * ghost/core/test/e2e-api/admin/host-limits.test.ts. Those assert what a caller receives
 * rather than how this package is factored, which is the point: its shape is expected to
 * keep changing and those tests should not have to.
 */
export default createVitestConfig({
  test: {
    coverage: {
      include: ['src/date-utils.ts'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
});
