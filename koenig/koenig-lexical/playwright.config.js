import dns from 'dns';
import path from 'path';
import {defineConfig, devices} from '@playwright/test';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// disable the reordering behavior. Vite will then print the address as localhost https://vitejs.dev/config/server-options.html#server-host
dns.setDefaultResultOrder('verbatim');

export const E2E_PORT = 5174;
export default defineConfig({
    outputDir: path.resolve(__dirname, '..', '..', 'playwright-report'),
    testDir: './test/e2e',
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [['html'], [process.env.CI ? 'github' : 'list']],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: `http://localhost:${E2E_PORT}`,

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
        launchOptions: {
            slowMo: parseInt(process.env.PLAYWRIGHT_SLOWMO) || 0
        }
    },
    projects: [
        {
            name: 'chromium',
            use: {...devices['Desktop Chrome']},
            testIgnore: /.*firefox.test.js/
        },
        {
            name: 'firefox',
            use: {...devices['Desktop Firefox']},
            testMatch: /.*firefox.test.js/
        }
    ],

    /* Run local dev server before starting the tests */
    webServer: {
        command: `yarn dev:test`,
        url: `http://localhost:${E2E_PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 10000
    }
});
