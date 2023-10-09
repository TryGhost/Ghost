// express-test.js
const config = require('../../../core/shared/config');
const base = require('@playwright/test');
const {promisify} = require('util');
const {spawn, exec} = require('child_process');
const {setupGhost, setupMailgun, enableLabs, setupStripe} = require('../utils/e2e-browser-utils');
const {allowStripe, mockMail} = require('../../utils/e2e-framework-mock-manager');
const MailgunClient = require('@tryghost/mailgun-client');
const sinon = require('sinon');
const ObjectID = require('bson-objectid').default;

const startWebhookServer = (port) => {
    const command = `stripe listen --forward-to http://127.0.0.1:${port}/members/webhooks/stripe/`;
    return spawn(command.split(' ')[0], command.split(' ').slice(1));
};

const getWebhookSecret = async () => {
    const command = `stripe listen --print-secret ${process.env.CI ? `--api-key ${process.env.STRIPE_SECRET_KEY}` : ''}`.trim();
    const webhookSecret = (await promisify(exec)(command)).stdout;
    return webhookSecret.toString().trim();
};

const generateStripeIntegrationToken = async () => {
    if (!('STRIPE_PUBLISHABLE_KEY' in process.env) || !('STRIPE_SECRET_KEY' in process.env)) {
        throw new Error('Missing STRIPE_PUBLISHABLE_KEY or STRIPE_SECRET_KEY environment variables');
    }

    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const accountId = process.env.STRIPE_ACCOUNT_ID ?? JSON.parse((await promisify(exec)('stripe get account')).stdout).id;

    return Buffer.from(JSON.stringify({
        a: secretKey,
        p: publishableKey,
        l: false,
        i: accountId
    })).toString('base64');
};

// Global promises for webhook secret / Stripe integration token
const webhookSecretPromise = getWebhookSecret();
const stripeIntegrationTokenPromise = generateStripeIntegrationToken();

module.exports = base.test.extend({
    baseURL: async ({port, baseURL}, use) => {
        // Replace the port in baseURL with the one we got from the port fixture
        const url = new URL(baseURL);
        url.port = port.toString();
        await use(url.toString());
    },

    storageState: async ({ghost}, use) => {
        await use(ghost.state);
    },

    // eslint-disable-next-line no-empty-pattern
    port: [async ({}, use, workerInfo) => {
        await use(2369 + workerInfo.parallelIndex);
    }, {scope: 'worker'}],

    ghost: [async ({browser, port}, use, workerInfo) => {
        process.env.PORT = port;

        const currentDate = new Date();
        const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}-${String(currentDate.getHours()).padStart(2, '0')}-${String(currentDate.getMinutes()).padStart(2, '0')}-${String(currentDate.getSeconds()).padStart(2, '0')}`;
        process.env.database__connection__filename = `/tmp/ghost-playwright.${workerInfo.workerIndex}.${formattedDate}.db`;
        const sandbox = sinon.createSandbox();
        const originalConfigGet = config.get.bind(config);
        sandbox.stub(config, 'get').callsFake((key) => {
            if (key === 'database:connection:filename') {
                return process.env.database__connection__filename;
            }
            if (key === 'database') {
                return {
                    client: 'sqlite3',
                    connection: {
                        filename: process.env.database__connection__filename
                    },
                    useNullAsDefault: true,
                    debug: false
                };
            }
            if (key === 'server') {
                return {
                    port
                };
            }
            if (key === 'url') {
                return `http://127.0.0.1:${port}`;
            }
            return originalConfigGet(key);
        });

        const stripeServer = startWebhookServer(port);

        process.env.WEBHOOK_SECRET = await webhookSecretPromise;

        sandbox.stub(MailgunClient.prototype, 'getInstance').returns({
            // @ts-ignore
            messages: {
                create: async function () {
                    return {
                        id: `mailgun-mock-id-${ObjectID().toHexString()}`
                    };
                }
            }
        });

        mockMail();

        const {startGhost} = require('../../utils/e2e-framework');
        const server = await startGhost({
            frontend: true,
            server: true,
            backend: true
        });

        // StartGhost automatically disables network, so we need to re-enable it for Stripe
        allowStripe();

        const page = await browser.newPage({
            baseURL: `http://127.0.0.1:${port}/`,
            storageState: undefined
        });

        await setupGhost(page);
        await setupStripe(page, await stripeIntegrationTokenPromise);
        await setupMailgun(page);
        await enableLabs(page);
        const state = await page.context().storageState();

        await page.close();

        // Use the server in the tests.
        await use({
            server,
            state
        });

        // Cleanup.
        const {stopGhost} = require('../../utils/e2e-utils');
        await stopGhost();
        stripeServer.kill();
        sandbox.restore();
    }, {scope: 'worker', auto: true}]
});
