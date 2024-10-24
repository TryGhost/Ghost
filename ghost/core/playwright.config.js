/** @type {import('@playwright/test').PlaywrightTestConfig} */
const os = require('os');

const getWorkerCount = () => {
    if (process.env.CI) {
        return '100%';
    }
    if (process.env.PLAYWRIGHT_SLOWMO) {
        return 1;
    }
    
    let cpuCount;
    try {
        cpuCount = os.cpus().length;
    } catch (err) {
        cpuCount = 1;
    }
    // Stripe limits to 5 new accounts per second
    // If we go higher than 5, we'll get rate limited and tests will fail
    return Math.min(5, cpuCount - 1);
};

const config = {
    timeout: 75 * 1000,
    expect: {
        timeout: 10000
    },
    // save trace on fail
    retries: process.env.CI ? 2 : 0,
    workers: getWorkerCount(),
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
