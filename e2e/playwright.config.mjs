/** @type {import('@playwright/test').PlaywrightTestConfig} */

const config = {
    timeout: 30 * 1000,
    expect: {
        timeout: 10000
    },
    fullyParallel: true,
    retries: 0,
    workers: 1,
    reporter: process.env.CI ? [['list', {printSteps: true}], ['html']] : [['list', {printSteps: true}]],
    use: {
        baseURL: process.env.GHOST_BASE_URL || 'http://localhost:2368',
        trace: 'retain-on-failure',
        browserName: 'chromium'
    },
    testDir: './tests',
    projects: [
        {
            name: 'e2e',
            testDir: './tests',
            testMatch: '**/*.test.{js,ts}'
        },
        {
            name: 'factories',
            testDir: './helpers/factories',
            testMatch: '**/*.test.{js,ts}'
        }
    ]
};

export default config;
