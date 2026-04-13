import {test} from './fixture';

/**
 * Opts a test file into per-test isolation (one Ghost environment per test).
 *
 * By default, e2e tests use per-file isolation: all tests in a file share a
 * single Ghost instance and database, which is significantly faster on CI.
 *
 * Call this at the root level of any test file that needs a fresh Ghost
 * environment for every test — typically files where tests mutate shared
 * state (members, billing, settings) in ways that would interfere with
 * each other.
 *
 * Under the hood this does two things via standard Playwright APIs:
 *  1. `test.describe.configure({mode: 'parallel'})` — tells Playwright to
 *     run the file's tests concurrently across workers.
 *  2. `test.use({isolation: 'per-test'})` — tells our fixture layer to
 *     spin up a dedicated Ghost instance per test instead of reusing one.
 *
 * Keeping both calls together avoids mismatches (e.g. parallel mode without
 * per-test isolation) and replaces the previous monkey-patching approach
 * that intercepted test.describe.configure() and parsed stack traces to
 * detect the caller file. This is intentionally two standard Playwright
 * calls wrapped in a single helper — no runtime patching required.
 *
 * @example
 * ```ts
 * import {usePerTestIsolation} from '@/helpers/playwright/isolation';
 *
 * usePerTestIsolation();
 *
 * test.describe('Ghost Admin - Members', () => { ... });
 * ```
 */
export function usePerTestIsolation() {
    test.describe.configure({mode: 'parallel'});
    test.use({isolation: 'per-test'});
}
