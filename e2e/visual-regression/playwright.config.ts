import {defineConfig} from '@playwright/test';

/**
 * Visual regression test config for TailwindCSS migration.
 *
 * Runs against a live `yarn dev` Ghost instance (localhost:2368).
 * Start Ghost first, then:
 *
 *   # Capture/update golden baselines
 *   npx playwright test -c e2e/visual-regression --update-snapshots
 *
 *   # Compare current state against baselines
 *   npx playwright test -c e2e/visual-regression
 */
export default defineConfig({
    testDir: './',
    testMatch: '**/*.spec.ts',
    timeout: 90_000,
    expect: {
        toHaveScreenshot: {
            maxDiffPixelRatio: 0.001,
            animations: 'disabled'
        }
    },
    retries: 0,
    workers: 1, // sequential — screenshots must be deterministic
    reporter: [['list', {printSteps: true}], ['html', {open: 'never'}]],
    use: {
        baseURL: process.env.GHOST_URL || 'http://localhost:2368',
        viewport: {width: 1440, height: 900},
        actionTimeout: 10_000,
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure'
    },
    projects: [
        {
            name: 'auth-setup',
            testMatch: 'auth.setup.ts'
        },
        {
            name: 'visual-regression',
            testMatch: 'capture-baselines.spec.ts',
            dependencies: ['auth-setup'],
            use: {
                storageState: './e2e/visual-regression/.auth/state.json'
            }
        }
    ],
    snapshotPathTemplate: '{testDir}/baselines/{arg}{ext}'
});
