const config = require('../../../core/shared/config');
const {promisify} = require('util');
const {spawn, exec} = require('child_process');
const {knex} = require('../../../core/server/data/db');
const {setupGhost, setupStripe, setupMailgun, enableLabs} = require('./e2e-browser-utils');
const {chromium} = require('@playwright/test');
const {startGhost} = require('../../utils/e2e-framework');
const {stopGhost} = require('../../utils/e2e-utils');
const MailgunClient = require('@tryghost/mailgun-client');
const sinon = require('sinon');
const ObjectID = require('bson-objectid').default;
const {allowStripe} = require('../../utils/e2e-framework-mock-manager');

const startWebhookServer = () => {
    const command = `stripe listen --forward-to ${config.getSiteUrl()}members/webhooks/stripe/ ${process.env.CI ? `--api-key ${process.env.STRIPE_SECRET_KEY}` : ''}`.trim();
    spawn(command.split(' ')[0], command.split(' ').slice(1));
};

const getWebhookSecret = async () => {
    const command = `stripe listen --print-secret ${process.env.CI ? `--api-key ${process.env.STRIPE_SECRET_KEY}` : ''}`.trim();
    const webhookSecret = (await promisify(exec)(command)).stdout;
    return webhookSecret.toString().trim();
};

const generateStripeIntegrationToken = async () => {
    const inquirer = require('inquirer');
    const stripeDatabaseKeys = {
        publishableKey: 'stripe_connect_publishable_key',
        secretKey: 'stripe_connect_secret_key',
        liveMode: 'stripe_connect_livemode'
    };
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY ?? (await knex('settings').select('value').where('key', stripeDatabaseKeys.publishableKey).first())?.value
        ?? (await inquirer.prompt([{
            message: 'Stripe publishable key (starts "pk_test_")',
            type: 'password',
            name: 'value'
        }])).value;
    const secretKey = process.env.STRIPE_SECRET_KEY ?? (await knex('settings').select('value').where('key', stripeDatabaseKeys.secretKey).first())?.value
        ?? (await inquirer.prompt([{
            message: 'Stripe secret key (starts "sk_test_")',
            type: 'password',
            name: 'value'
        }])).value;

    const accountId = process.env.STRIPE_ACCOUNT_ID ?? JSON.parse((await promisify(exec)('stripe get account')).stdout).id;

    return Buffer.from(JSON.stringify({
        a: secretKey,
        p: publishableKey,
        l: false,
        i: accountId
    })).toString('base64');
};

const stubMailgun = () => {
    // We need to stub the Mailgun client before starting Ghost
    sinon.stub(MailgunClient.prototype, 'getInstance').returns({
        // @ts-ignore
        messages: {
            create: async function () {
                return {
                    id: `mailgun-mock-id-${ObjectID().toHexString()}`
                };
            }
        }
    });
};

/**
 * Setup the environment
 */
const setup = async (playwrightConfig) => {
    const usingRemoteServer = process.env.CI && process.env.TEST_URL;

    let stripeConnectIntegrationToken;
    if (!usingRemoteServer) {
        startWebhookServer();
        stripeConnectIntegrationToken = await generateStripeIntegrationToken();

        process.env.WEBHOOK_SECRET = await getWebhookSecret();

        // Stub out NodeMailer
        stubMailgun();

        await startGhost({
            frontend: true,
            server: true,
            backend: true
        });

        // StartGhost automatically disables network, so we need to re-enable it for Stripe
        allowStripe();
    }

    const {baseURL, storageState} = playwrightConfig.projects[0].use;
    const browser = await chromium.launch();
    const page = await browser.newPage({
        baseURL
    });
    await setupGhost(page);
    if (!usingRemoteServer) {
        await setupStripe(page, stripeConnectIntegrationToken);
        await setupMailgun(page);
    }
    await enableLabs(page);
    await page.context().storageState({path: storageState});
    await browser.close();

    if (!usingRemoteServer) {
        await stopGhost();
    }
};

module.exports = setup;
