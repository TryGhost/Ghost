/** @type {import('@playwright/test').PlaywrightTestConfig} */

const config = {
    timeout: 60 * 1000,
    workers: 1,
    use: {
        // Use a single browser since we can't simultaneously test multiple browsers
        browserName: 'chromium',
        baseURL: process.env.TEST_URL ?? 'http://localhost:2368'
    }
};

if (!process.env.TEST_URL) {
    config.webServer = {
        command: 'yarn start',
        env: {
            // TODO: Use `testing` when starting a server
            NODE_ENV: 'development'
        },
        reuseExistingServer: !process.env.CI,
        url: 'http://localhost:2368'
    };
}

module.exports = config;
