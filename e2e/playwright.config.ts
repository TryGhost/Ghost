import {defineConfig} from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

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
    retries: 0,
    /* Opt out of parallel tests on CI. */
    workers: 1,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [
        ['html', {host: process.env.PLAYWRIGHT_HTML_REPORT_HOST || 'localhost', port: 9323}]
    ],
    /* Global setup */
    globalSetup: require.resolve('./src/playwright/global-setup'),
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on',
        browserName: 'chromium'
    }
});
