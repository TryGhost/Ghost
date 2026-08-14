import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';

/**
 * Browser-mode project for the slice-2 worker-parity suite
 * (test/browser/worker-render.test.ts): the renderer running inside a real
 * Web Worker in Chromium.
 *
 * Standalone config rather than @internal/cfg-vitest's createVitestConfig:
 * the shared factory's contract is the Node unit lane (v8 coverage over src,
 * threshold gates) — none of which applies to a browser run, and coverage
 * remains owned by test:unit. The unit config (vitest.config.ts) excludes
 * test/browser/**; this config owns it.
 *
 * Requires a Playwright Chromium (pnpm exec playwright install chromium).
 */
export default defineConfig({
    test: {
        name: 'browser',
        include: ['test/browser/**/*.test.ts'],
        // Cold start compiles the whole renderer bundle into the worker
        testTimeout: 30000,
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{browser: 'chromium'}],
            screenshotFailures: false
        }
    }
});
