/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
    timeout: 20 * 1000,
    workers: 1,
    use: {
        // Use a single browser since we can't run multiple instances of Ghost simultaneously
        // and we can't run tests against a standalone server if we also want to add fixtures
        browserName: 'chromium',
        headless: false
    }
};

module.exports = config;
