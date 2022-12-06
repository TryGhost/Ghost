/** @type {import('@playwright/test').PlaywrightTestConfig} */

const config = {
    timeout: 60 * 1000,
    workers: 1,
    use: {
        // Use a single browser since we can't simultaneously test multiple browsers
        browserName: 'chromium',
        headless: !process.env.PLAYWRIGHT_DEBUG,
        baseURL: process.env.TEST_URL ?? 'http://localhost:2369',
        // TODO: Where to put this
        storageState: 'playwright-state.json'
    },
    globalSetup: './test/e2e-browser/utils/global-setup',
    globalTeardown: './test/e2e-browser/utils/global-teardown'
};

module.exports = config;
