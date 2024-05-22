/** @type {import('@playwright/test').PlaywrightTestConfig} */

const config = {
    timeout: 75 * 1000,
    expect: {
        timeout: 10000
    },
    // save trace on fail
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? '100%' : (process.env.PLAYWRIGHT_SLOWMO ? 1 : undefined),
    reporter: process.env.CI ? [['list', {printSteps: true}], ['html']] : [['list', {printSteps: true}]],
    use: {
        trace: 'retain-on-failure',
        // Use a single browser since we can't simultaneously test multiple browsers
        browserName: 'chromium',
        headless: !process.env.PLAYWRIGHT_DEBUG,
        // Port doesn't matter, overriden by baseURL fixture for each worker
        baseURL: 'http://127.0.0.1:2368'
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
            testDir: 'test/e2e-browser/portal',
            fullyParallel: true
        }
    ]
};

module.exports = config;
