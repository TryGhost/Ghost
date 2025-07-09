/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
    timeout: 30 * 1000,
    expect: {
        timeout: 10000
    },
    retries: 0, // Retries open the door to flaky tests. If the test needs retries, it's not a good test or the app is broken.
    workers: 1, // One worker for now in the interest of stability. Parallelism leads to flaky tests when not done carefully.
    reporter: process.env.CI ? [['list', {printSteps: true}], ['html']] : [['list', {printSteps: true}]],
    use: {
        baseURL: process.env.GHOST_BASE_URL || 'http://localhost:2368',
        trace: 'retain-on-failure',
        browserName: 'chromium'
    },
    testDir: './tests'
};

export default config;
