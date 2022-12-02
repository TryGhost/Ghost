const {execSync} = require('child_process');

const getWebhookSecret = () => {
    const command = `stripe listen --print-secret ${process.env.CI ? `--api-key ${process.env.STRIPE_SECRET_KEY}` : ''}`.trim();
    const webhookSecret = execSync(command);
    return webhookSecret.toString().trim();
};

/** @type {import('@playwright/test').PlaywrightTestConfig} */

const config = {
    timeout: 60 * 1000,
    workers: 1,
    use: {
        // Use a single browser since we can't simultaneously test multiple browsers
        browserName: 'chromium',
        headless: !process.env.PLAYWRIGHT_DEBUG,
        baseURL: process.env.TEST_URL ?? 'http://localhost:2368',
        // TODO: Where to put this
        storageState: 'playwright-state.json'
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
