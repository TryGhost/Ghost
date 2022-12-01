const config = require('../../../core/shared/config');
const {promisify} = require('util');
const {spawn, exec} = require('child_process');
const {knex} = require('../../../core/server/data/db');
const {setupGhost} = require('./e2e-browser-utils');
const {chromium} = require('@playwright/test');

const startWebhookServer = () => {
    const command = `stripe listen --forward-to ${config.getSiteUrl()}/members/webhooks/stripe/`;
    spawn(command.split(' ')[0], command.split(' ').slice(1));
};

const setupStripeKeys = async () => {
    const inquirer = require('inquirer');
    const stripeDatabaseKeys = {
        publishableKey: 'stripe_connect_publishable_key',
        secretKey: 'stripe_connect_secret_key',
        testMode: 'stripe_connect_test_mode'
    };
    const publishableKey = (await knex('settings').select('value').where('key', stripeDatabaseKeys.publishableKey).first())?.value
        ?? (await inquirer.prompt([{
            message: 'Stripe publishable key (starts "pk_test_")',
            type: 'password',
            name: 'value'
        }])).value;
    const secretKey = (await knex('settings').select('value').where('key', stripeDatabaseKeys.secretKey).first())?.value
        ?? (await inquirer.prompt([{
            message: 'Stripe secret key (starts "sk_test_")',
            type: 'password',
            name: 'value'
        }])).value;

    // TODO: Replace with update or insert
    await knex('settings').where('key', stripeDatabaseKeys.publishableKey).update({
        value: publishableKey
    });
    await knex('settings').where('key', stripeDatabaseKeys.secretKey).update({
        value: secretKey
    });
    await knex('settings').where('key', stripeDatabaseKeys.testMode).update({
        value: `${true}`
    });
};

/**
 * Setup the environment
 */
const setup = async (playwrightConfig) => {
    const usingRemoteServer = process.env.CI && process.env.TEST_URL;

    if (!usingRemoteServer) {
        startWebhookServer();
        await setupStripeKeys();
    }

    const {baseURL, storageState} = playwrightConfig.projects[0].use;
    const browser = await chromium.launch();
    const page = await browser.newPage({
        baseURL
    });
    await setupGhost(page);
    await page.context().storageState({path: storageState});
    await browser.close();
};

module.exports = setup;
