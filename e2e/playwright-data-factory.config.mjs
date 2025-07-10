/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
    timeout: 30 * 1000,
    expect: {
        timeout: 10000
    },
    retries: 0,
    workers: 1,
    reporter: process.env.CI ? [['list', {printSteps: true}], ['html']] : [['list', {printSteps: true}]],
    use: {
        baseURL: process.env.GHOST_BASE_URL || 'http://localhost:2368',
        trace: 'retain-on-failure',
        browserName: 'chromium'
    },
    testDir: './lib/data-factory/tests',
    testMatch: '**/*.spec.js',
    globalSetup: './lib/data-factory/tests/global-setup.js',
    globalTeardown: './lib/data-factory/tests/global-teardown.js'
};

export default config;