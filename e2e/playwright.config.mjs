/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
    timeout: 30 * 1000,
    expect: {
        timeout: 10000
    },
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : 1,
    reporter: process.env.CI ? [['list', {printSteps: true}], ['html']] : [['list', {printSteps: true}]],
    use: {
        baseURL: process.env.GHOST_BASE_URL || 'http://localhost:2368',
        trace: 'retain-on-failure',
        browserName: 'chromium',
        headless: !process.env.PLAYWRIGHT_DEBUG
    },
    testDir: './test'
};

export default config;