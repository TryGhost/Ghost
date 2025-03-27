import assert from 'assert/strict';
import {ActivityPubService} from '../../../../../core/server/services/activitypub/ActivityPubService';
import knex, {Knex} from 'knex';
import type {IdentityTokenService} from '../../../../../core/server/services/identity-tokens/IdentityTokenService';
import nock from 'nock';

async function getKnexInstance() {
    const knexInstance = knex({
        client: 'sqlite',
        connection: {
            filename: ':memory:'
        },
        useNullAsDefault: true
    });

    await knexInstance.schema.createTable('users', (table) => {
        table.string('id').primary();
        table.string('email');
    });

    await knexInstance.schema.createTable('roles', (table) => {
        table.string('id').primary();
        table.string('name');
    });

    await knexInstance.schema.createTable('roles_users', (table) => {
        table.string('id').primary();
        table.string('user_id').references('users.id');
        table.string('role_id').references('roles.id');
    });

    await knexInstance.schema.createTable('integrations', (table) => {
        table.string('id').primary();
        table.string('slug');
        table.string('type');
    });

    await knexInstance.schema.createTable('webhooks', (table) => {
        table.string('id').primary();
        table.string('event');
        table.string('target_url');
        table.string('api_version');
        table.string('name');
        table.string('secret');
        table.string('integration_id');
        table.datetime('created_at');
        table.string('created_by');
    });

    await knexInstance.insert({
        id: 'owner-role-id',
        name: 'Owner'
    }).into('roles');

    return knexInstance;
}

async function addOwnerUser(knexInstance: Knex) {
    await knexInstance.insert({
        id: 'non-standard-id',
        email: 'owner@user.com'
    }).into('users');

    await knexInstance.insert({
        id: 'roles-users-id',
        user_id: 'non-standard-id',
        role_id: 'owner-role-id'
    }).into('roles_users');
}
async function addActivityPubIntegration(knexInstance: Knex) {
    await knexInstance.insert({
        id: 'integration_id',
        slug: 'ghost-activitypub',
        type: 'internal'
    }).into('integrations');
}

describe('ActivityPubService', function () {
    it('Can initialise the webhooks', async function () {
        const knexInstance = await getKnexInstance();
        await addOwnerUser(knexInstance);
        await addActivityPubIntegration(knexInstance);

        const siteUrl = new URL('http://fake-site-url');
        const scope = nock(siteUrl)
            .get('/.ghost/activitypub/site')
            .matchHeader('authorization', 'Bearer token:owner@user.com:Owner')
            .reply(200, {
                webhook_secret: 'webhook_secret_baby!!'
            });

        const logging = console;
        const identityTokenService = {
            getTokenForUser(email: string, role: string) {
                return `token:${email}:${role}`;
            }
        };
        const service = new ActivityPubService(
            knexInstance,
            siteUrl,
            logging,
            identityTokenService as unknown as IdentityTokenService
        );

        await service.initialiseWebhooks();

        assert(scope.isDone(), 'Expected the ActivityPub site endpoint to be called');

        const webhooks = await knexInstance.select('*').from('webhooks');

        const expectedWebhookCount = 2;
        const expectedWebhookSecret = 'webhook_secret_baby!!';
        const expectedWebhookIntegrationId = 'integration_id';

        assert.equal(webhooks.length, expectedWebhookCount);

        for (const webhook of webhooks) {
            assert.equal(webhook.secret, expectedWebhookSecret);
            assert.equal(webhook.integration_id, expectedWebhookIntegrationId);
        }

        await knexInstance.destroy();
    });

    it('Will not reinitialise webhooks if they are already good', async function () {
        const knexInstance = await getKnexInstance();
        await addOwnerUser(knexInstance);
        await addActivityPubIntegration(knexInstance);

        const siteUrl = new URL('http://fake-site-url');
        const scope = nock(siteUrl)
            .get('/.ghost/activitypub/site')
            .matchHeader('authorization', 'Bearer token:owner@user.com:Owner')
            .reply(200, {
                webhook_secret: 'webhook_secret_baby!!'
            });

        const logging = console;
        const identityTokenService = {
            getTokenForUser(email: string, role: string) {
                return `token:${email}:${role}`;
            }
        };
        const service = new ActivityPubService(
            knexInstance,
            siteUrl,
            logging,
            identityTokenService as unknown as IdentityTokenService
        );

        await service.initialiseWebhooks();

        assert(scope.isDone(), 'Expected the ActivityPub site endpoint to be called');

        const webhooks = await knexInstance.select('*').from('webhooks');

        const expectedWebhookCount = 2;
        const expectedWebhookSecret = 'webhook_secret_baby!!';
        const expectedWebhookIntegrationId = 'integration_id';

        assert.equal(webhooks.length, expectedWebhookCount);

        for (const webhook of webhooks) {
            assert.equal(webhook.secret, expectedWebhookSecret);
            assert.equal(webhook.integration_id, expectedWebhookIntegrationId);
        }

        nock(siteUrl)
            .get('/.ghost/activitypub/site')
            .matchHeader('authorization', 'Bearer token:owner@user.com:Owner')
            .reply(200, {
                webhook_secret: 'webhook_secret_baby!!'
            });

        await service.initialiseWebhooks();

        const webhooksAfterSecondInitialisation = await knexInstance.select('*').from('webhooks');

        assert.deepEqual(webhooksAfterSecondInitialisation, webhooks, 'Expected webhooks to be unchanged');

        await knexInstance.destroy();
    });

    it('Can handle a misconfigured webhook', async function () {
        const knexInstance = await getKnexInstance();
        await addOwnerUser(knexInstance);
        await addActivityPubIntegration(knexInstance);

        const siteUrl = new URL('http://fake-site-url');
        const scope = nock(siteUrl)
            .get('/.ghost/activitypub/site')
            .matchHeader('authorization', 'Bearer token:owner@user.com:Owner')
            .reply(200, {
                webhook_secret: 'webhook_secret_baby!!'
            });

        const logging = console;
        const identityTokenService = {
            getTokenForUser(email: string, role: string) {
                return `token:${email}:${role}`;
            }
        };
        const service = new ActivityPubService(
            knexInstance,
            siteUrl,
            logging,
            identityTokenService as unknown as IdentityTokenService
        );

        await service.initialiseWebhooks();

        assert(scope.isDone(), 'Expected the ActivityPub site endpoint to be called');

        const webhooks = await knexInstance.select('*').from('webhooks');

        const expectedWebhookCount = 2;
        const expectedWebhookSecret = 'webhook_secret_baby!!';
        const expectedWebhookIntegrationId = 'integration_id';

        assert.equal(webhooks.length, expectedWebhookCount);

        for (const webhook of webhooks) {
            assert.equal(webhook.secret, expectedWebhookSecret);
            assert.equal(webhook.integration_id, expectedWebhookIntegrationId);
        }

        await knexInstance('webhooks').update({event: 'wrong.event'}).limit(1);

        nock(siteUrl)
            .get('/.ghost/activitypub/site')
            .matchHeader('authorization', 'Bearer token:owner@user.com:Owner')
            .reply(200, {
                webhook_secret: 'webhook_secret_baby!!'
            });

        await service.initialiseWebhooks();

        const webhooksAfterSecondInitialisation = await knexInstance.select('*').from('webhooks');

        assert.equal(webhooksAfterSecondInitialisation.length, expectedWebhookCount);

        for (const webhook of webhooksAfterSecondInitialisation) {
            assert.equal(webhook.secret, expectedWebhookSecret);
            assert.equal(webhook.integration_id, expectedWebhookIntegrationId);
        }

        assert.notDeepEqual(webhooksAfterSecondInitialisation, webhooks, 'Expected webhooks to be changed');

        await knexInstance.destroy();
    });

    it('Can handle missing integration without erroring', async function () {
        const knexInstance = await getKnexInstance();
        await addOwnerUser(knexInstance);

        const siteUrl = new URL('http://fake-site-url');
        const scope = nock(siteUrl)
            .get('/.ghost/activitypub/site')
            .matchHeader('authorization', 'Bearer token:owner@user.com:Owner')
            .reply(200, {
                webhook_secret: 'webhook_secret_baby!!'
            });

        const logging = console;
        const identityTokenService = {
            getTokenForUser(email: string, role: string) {
                return `token:${email}:${role}`;
            }
        };
        const service = new ActivityPubService(
            knexInstance,
            siteUrl,
            logging,
            identityTokenService as unknown as IdentityTokenService
        );

        await service.initialiseWebhooks();

        assert(!scope.isDone(), 'Expected the ActivityPub site endpoint not to be called');

        await knexInstance.destroy();
    });

    it('Can handle errors getting the webhook secret without erroring', async function () {
        const knexInstance = await getKnexInstance();
        await addActivityPubIntegration(knexInstance);

        const siteUrl = new URL('http://fake-site-url');

        const logging = console;
        const identityTokenService = {
            getTokenForUser(email: string, role: string) {
                return `token:${email}:${role}`;
            }
        };
        const service = new ActivityPubService(
            knexInstance,
            siteUrl,
            logging,
            identityTokenService as unknown as IdentityTokenService
        );

        await service.initialiseWebhooks();

        const webhooks = await knexInstance.select('*').from('webhooks');

        assert.equal(webhooks.length, 0, 'There should be no webhooks');

        await knexInstance.destroy();
    });
});
