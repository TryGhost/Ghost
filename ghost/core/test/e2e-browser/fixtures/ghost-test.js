// express-test.js
const base = require('@playwright/test');
const {promisify} = require('util');
const {spawn, exec} = require('child_process');
const {setupGhost, setupMailgun, enableLabs, setupStripe, getStripeAccountId, generateStripeIntegrationToken} = require('../utils/e2e-browser-utils');
const {allowStripe, mockMail, mockGeojs, assert} = require('../../utils/e2e-framework-mock-manager');
const sinon = require('sinon');
const ObjectID = require('bson-objectid').default;
const Stripe = require('stripe').Stripe;
const configUtils = require('../../utils/configUtils');
const MailgunClient = require('../../../core/server/services/lib/MailgunClient');

const startWebhookServer = (port) => {
    const isCI = process.env.CI;
    const isDocker = process.env.GHOST_DEV_IS_DOCKER === 'true';
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const command = `stripe listen --forward-connect-to http://127.0.0.1:${port}/members/webhooks/stripe/ ${isDocker || isCI ? `--api-key ${stripeSecretKey}` : ''}`.trim();
    const webhookServer = spawn(command.split(' ')[0], command.split(' ').slice(1));

    // Adding event listeners here seems to prevent heisenbug where webhooks aren't received
    webhookServer.stdout.on('data', () => {});
    webhookServer.stderr.on('data', () => {});

    return webhookServer;
};

const getWebhookSecret = async () => {
    const isCI = process.env.CI;
    const isDocker = process.env.GHOST_DEV_IS_DOCKER === 'true';
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const command = `stripe listen --print-secret ${isDocker || isCI ? `--api-key ${stripeSecretKey}` : ''}`.trim();
    const webhookSecret = (await promisify(exec)(command)).stdout;
    return webhookSecret.toString().trim();
};

// Global promises for webhook secret / Stripe integration token
const webhookSecretPromise = getWebhookSecret();

/**
 * @type {import('@playwright/test').TestType<
 *      import('@playwright/test').PlaywrightTestArgs &
 *      import('@playwright/test').PlaywrightTestOptions &
 *      import('@playwright/test').PlaywrightWorkerArgs &
 *      import('@playwright/test').PlaywrightWorkerOptions
 *  >}
 * @property {import('@playwright/test').Page} sharedPage
 */
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

    sharedPage: [async ({browser}, use) => {
        const page = await browser.newPage();
        await use(page);
    }, {scope: 'worker'}],

    // eslint-disable-next-line no-empty-pattern
    verificationToken: [async ({}, use) => {
        const getToken = async () => {
            const tryGetToken = () => {
                try {
                    const email = assert.sentEmail({
                        subject: /[0-9]{6} is your Ghost sign in verification code/
                    });
                    return email.subject.match(/[0-9]{6}/)[0];
                } catch (error) {
                    return null;
                }
            };

            const timeout = ms => new Promise((resolve) => {
                setTimeout(resolve, ms);
            });
            let timeoutMs = 10;
            let timeoutRetries = 5;

            while (timeoutRetries > 0) {
                const token = tryGetToken();
                if (token) {
                    return token;
                }
                await timeout(timeoutMs);
                timeoutMs *= 2;
                timeoutRetries -= 1;
            }

            return null;
        };

        await use({getToken});
    }, {scope: 'worker'}],

    // eslint-disable-next-line no-empty-pattern
    port: [async ({}, use, workerInfo) => {
        await use(2369 + workerInfo.parallelIndex);
    }, {scope: 'worker'}],

    ghost: [async ({browser, port}, use, workerInfo) => {
        // Do not initialise database before this block
        const currentDate = new Date();
        const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}-${String(currentDate.getHours()).padStart(2, '0')}-${String(currentDate.getMinutes()).padStart(2, '0')}-${String(currentDate.getSeconds()).padStart(2, '0')}`;
        process.env.database__connection__filename = `/tmp/ghost-playwright.${workerInfo.workerIndex}.${formattedDate}.db`;
        configUtils.set('database:connection:filename', process.env.database__connection__filename);
        configUtils.set('server:port', port);
        configUtils.set('url', `http://127.0.0.1:${port}`);

        const stripeAccountId = await getStripeAccountId();
        const stripeIntegrationToken = await generateStripeIntegrationToken(stripeAccountId);

        const WebhookManager = require('../../../core/server/services/stripe/WebhookManager');
        const originalParseWebhook = WebhookManager.prototype.parseWebhook;
        const sandbox = sinon.createSandbox();
        sandbox.stub(WebhookManager.prototype, 'parseWebhook').callsFake(function (body, signature) {
            const parsedBody = JSON.parse(body);
            if (!('account' in parsedBody)) {
                throw new Error('Webhook without account');
            } else if (parsedBody.account !== stripeAccountId) {
                throw new Error('Webhook for wrong account');
            } else {
                return originalParseWebhook.call(this, body, signature);
            }
        });

        const StripeAPI = require('../../../core/server/services/stripe/StripeAPI');
        const originalStripeConfigure = StripeAPI.prototype.configure;
        sandbox.stub(StripeAPI.prototype, 'configure').callsFake(function (stripeConfig) {
            originalStripeConfigure.call(this, stripeConfig);
            if (stripeConfig) {
                this._stripe = new Stripe(stripeConfig.secretKey, {
                    apiVersion: '2020-08-27',
                    stripeAccount: stripeAccountId
                });
            }
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

        mockGeojs();

        const page = await browser.newPage({
            baseURL: `http://127.0.0.1:${port}/`,
            storageState: undefined
        });

        await setupGhost(page);
        await setupStripe(page, stripeIntegrationToken);
        await setupMailgun(page);
        await enableLabs(page);
        const state = await page.context().storageState();

        await page.close();

        // Use the server in the tests.
        try {
            await use({
                server,
                state
            });
        } finally {
            const {stopGhost} = require('../../utils/e2e-utils');
            await stopGhost();
            stripeServer.kill();
            sandbox.restore();
        }
    }, {scope: 'worker', auto: true}]
});
