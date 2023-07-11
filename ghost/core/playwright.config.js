/** @type {import('@playwright/test').PlaywrightTestConfig} */

const config = {
    timeout: 60 * 1000,
    expect: {
        timeout: 10000
    },
    workers: 1,
    reporter: [['list', {printSteps: true}]],
    use: {
        // Use a single browser since we can't simultaneously test multiple browsers
        browserName: 'chromium',
        headless: !process.env.PLAYWRIGHT_DEBUG,
        baseURL: process.env.TEST_URL ?? 'http://localhost:2369',
        // TODO: Where to put this
        storageState: 'playwright-state.json'
    },
    // separated tests to projects for better logging to console
    // portal tests are much more stable when running in the separate DB from admin tests
    projects: [
        {
            name: 'admin',
            testDir: 'test/e2e-browser/admin'
        },
        {
            name: 'portal',
            testDir: 'test/e2e-browser/portal'
        }
    ],
    globalSetup: './test/e2e-browser/utils/global-setup',
    globalTeardown: './test/e2e-browser/utils/global-teardown'
};

module.exports = config;
