import {defineConfig, devices} from '@playwright/test';

export const E2E_PORT = 7175;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: './test/e2e',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Hardcode to use all cores in CI */
    workers: process.env.CI ? '100%' : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',
    timeout: process.env.PLAYWRIGHT_SLOWMO ? 100000 : 10000,
    expect: {
        timeout: process.env.PLAYWRIGHT_SLOWMO ? 100000 : 5000
    },

    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
        launchOptions: {
            slowMo: parseInt(process.env.PLAYWRIGHT_SLOWMO ?? '') || 0,
            // force GPU hardware acceleration
            // (even in headless mode)
            args: ['--use-gl=egl']
        }
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: {...devices['Desktop Chrome']}
        },

        ...(process.env.ALL_BROWSERS ? [{
            name: 'firefox',
            use: {...devices['Desktop Firefox']}
        },

        {
            name: 'webkit',
            use: {...devices['Desktop Safari']}
        }] : [])
    ],

    /* Run local dev server before starting the tests */
    webServer: {
        command: `yarn dev:test`,
        url: `http://localhost:${E2E_PORT}/comments-ui.min.js`,
        reuseExistingServer: !process.env.CI,
        timeout: 10000
    }
});
