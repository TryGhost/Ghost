const {execSync} = require('child_process');

const getWebhookSecret = () => {
    const webhookSecret = execSync('stripe listen --print-secret');
    return webhookSecret.toString().trim();
};

/** @type {import('@playwright/test').PlaywrightTestConfig} */

const config = {
    timeout: 60 * 1000,
    workers: 1,
    use: {
        // Use a single browser since we can't simultaneously test multiple browsers
        browserName: 'chromium',
        baseURL: process.env.TEST_URL ?? 'http://localhost:2368',
        // TODO: Where to put this
        storageState: 'state.json'
    },
    globalSetup: './test/e2e-browser/utils/global-setup'
};

if (!process.env.TEST_URL) {
    config.webServer = {
        // TODO: Replace yarn start
        command: 'yarn start',
        env: {
            NODE_ENV: 'development',
            WEBHOOK_SECRET: getWebhookSecret()
        },
        reuseExistingServer: !process.env.CI,
        url: 'http://localhost:2368'
    };
}

module.exports = config;
