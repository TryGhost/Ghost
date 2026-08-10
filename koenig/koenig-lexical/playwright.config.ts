import dns from 'dns';
import path from 'path';
import {defineConfig, devices} from '@playwright/test';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// disable the reordering behavior. Vite will then print the address as localhost https://vitejs.dev/config/server-options.html#server-host
dns.setDefaultResultOrder('verbatim');

// PLAYWRIGHT_FORCE_ASYNC_LOADER=1 is set in the test:acceptance script:
// Node 22.15+'s synchronous module hooks (module.registerHooks), which
// Playwright prefers when available, cannot handle CJS require() of ESM-only
// packages (jsdom 29's html-encoding-sniffer → @exodus/bytes chain fails with
// "request for X is not in cache"). The async loader path handles it fine.
// Fixed in Node 24.x — drop the flag when the workspace moves off Node 22.

export const E2E_PORT = 5174;
export default defineConfig({
    outputDir: path.resolve(__dirname, 'test-results'),
    testDir: './test/e2e',
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? '100%' : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: process.env.CI ? [['github'], ['html']] :
              process.env.PLAYWRIGHT_HTML_REPORT ? [['html'], ['list']] :
              [['list']],
    timeout: 10000,
    expect: {
        timeout: 5000
    },
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: `http://localhost:${E2E_PORT}`,

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
        video: 'on-first-retry',
        launchOptions: {
            slowMo: parseInt(process.env.PLAYWRIGHT_SLOWMO) || 0,
            // force GPU hardware acceleration
            // (even in headless mode)
            args: ['--use-gl=egl']
        },
        headless: process.env.PLAYWRIGHT_HEADED ? false : true
    },
    projects: [
        {
            name: 'chromium',
            use: {...devices['Desktop Chrome']},
            testIgnore: /.*firefox.test.ts/
        },
        {
            name: 'firefox',
            use: {...devices['Desktop Firefox']},
            testMatch: /.*firefox.test.ts/
        }
    ],

    /* Run local dev server before starting the tests */
    webServer: {
        command: `pnpm dev:test`,
        url: `http://localhost:${E2E_PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 10000
    }
});
