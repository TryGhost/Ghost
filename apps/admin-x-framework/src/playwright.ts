import {defineConfig, devices, PlaywrightTestConfig} from '@playwright/test';

export const E2E_PORT = 5173;

export function adminXPlaywrightConfig(overrides: Partial<PlaywrightTestConfig> = {}) {
    /**
     * See https://playwright.dev/docs/test-configuration.
     */
    return defineConfig({
        testDir: './test/acceptance',
        /* Run tests in files in parallel */
        fullyParallel: true,
        /* Fail the build on CI if you accidentally left test.only in the source code. */
        forbidOnly: !!process.env.CI,
        /* Retry on CI only */
        retries: process.env.CI ? 2 : 0,
        /* Hardcode to use all cores in CI */
        workers: process.env.CI ? '100%' : (process.env.PLAYWRIGHT_SLOWMO ? 1 : undefined),
        /* Reporter to use. See https://playwright.dev/docs/test-reporters */
        reporter: 'html',
        /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
        use: {
            baseURL: `http://localhost:${E2E_PORT}`,
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
            command: `yarn dev:start`,
            url: `http://localhost:${E2E_PORT}`,
            reuseExistingServer: !process.env.CI,
            timeout: 10000
        },

        ...overrides
    });
}
