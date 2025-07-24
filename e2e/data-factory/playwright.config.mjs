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
        trace: 'retain-on-failure',
        browserName: 'chromium'
    },
    testDir: './tests'
};

export default config;