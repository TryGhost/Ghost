// @ts-check
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const ObjectId = require('bson-objectid').default;
const sinon = require('sinon');
const testUtils = require('../../../utils');

const urlUtils = require('../../../../core/shared/url-utils').default;
const LinkRedirectRepository = require('../../../../core/server/services/link-redirection/link-redirect-repository');
const LinkRedirectsService = require('../../../../core/server/services/link-redirection/link-redirects-service');
const EventRegistry = require('../../../../core/server/lib/common/events');
const {Redirect} = require('../../../../core/server/models');

/**
 * These cover the parts the unit tests stub out: that the SHA-256 destination digest
 * survives a round trip through the varbinary(32) `to_hash` column, and that the unique
 * index on (automation_action_revision_id, to_hash) actually drives the recovery path
 * when concurrent sends race to create the same redirect.
 */
describe('automation link redirects', function () {
    let linkRedirectsService;
    let revisionId;
    let otherRevisionId;

    beforeAll(async function () {
        await testUtils.setup('default')();
    });

    beforeEach(async function () {
        await cleanupTables();

        const linkRedirectRepository = new LinkRedirectRepository({
            LinkRedirect: Redirect,
            urlUtils,
            cacheAdapter: null,
            EventRegistry
        });
        linkRedirectsService = new LinkRedirectsService({
            linkRedirectRepository,
            config: {baseURL: new URL(urlUtils.getSiteUrl())}
        });

        revisionId = await createActionRevision();
        otherRevisionId = await createActionRevision();
    });

    afterEach(async function () {
        sinon.restore();
        await cleanupTables();
    });

    async function cleanupTables() {
        await testUtils.knex('redirects').whereNotNull('automation_action_revision_id').del();
        await testUtils.knex('automation_action_revisions').del();
        await testUtils.knex('automation_actions').del();
        await testUtils.knex('automations').del();
    }

    async function createActionRevision() {
        const currentTime = new Date();
        const automationId = ObjectId().toHexString();
        const actionId = ObjectId().toHexString();
        const revisionIdToCreate = ObjectId().toHexString();

        await testUtils.knex('automations').insert({
            id: automationId,
            status: 'active',
            name: `Automation ${automationId}`,
            slug: `automation-${automationId}`,
            created_at: currentTime,
            updated_at: currentTime
        });
        await testUtils.knex('automation_actions').insert({
            id: actionId,
            automation_id: automationId,
            type: 'send_email',
            created_at: currentTime,
            updated_at: currentTime
        });
        await testUtils.knex('automation_action_revisions').insert({
            id: revisionIdToCreate,
            action_id: actionId,
            email_subject: 'Welcome!',
            created_at: currentTime
        });

        return revisionIdToCreate;
    }

    function getRedirectRows() {
        return testUtils.knex('redirects').whereNotNull('automation_action_revision_id').select();
    }

    it('persists the destination digest as 32 raw bytes and reads it back', async function () {
        const destination = new URL('https://external.example.com/pricing');

        const redirect = await linkRedirectsService.getOrAddAutomationRedirect(revisionId, destination);

        const rows = await getRedirectRows();
        assert.equal(rows.length, 1);
        assert.equal(rows[0].automation_action_revision_id, revisionId);

        const expectedHash = crypto.createHash('sha256').update(destination.href).digest();
        assert.equal(Buffer.from(rows[0].to_hash).length, 32);
        assert.equal(Buffer.from(rows[0].to_hash).equals(expectedHash), true);

        const found = await linkRedirectsService.getOrAddAutomationRedirect(revisionId, destination);
        assert.equal(found.from.href, redirect.from.href);
        assert.equal((await getRedirectRows()).length, 1);
    });

    it('reuses one redirect across repeated sends of the same revision', async function () {
        const destination = new URL('https://external.example.com/pricing');

        const first = await linkRedirectsService.getOrAddAutomationRedirect(revisionId, destination);
        const second = await linkRedirectsService.getOrAddAutomationRedirect(revisionId, destination);
        const third = await linkRedirectsService.getOrAddAutomationRedirect(revisionId, destination);

        assert.equal(second.from.href, first.from.href);
        assert.equal(third.from.href, first.from.href);
        assert.equal((await getRedirectRows()).length, 1);
    });

    it('keeps separate redirects per destination and per revision', async function () {
        const pricing = new URL('https://external.example.com/pricing');
        const about = new URL('https://external.example.com/about');

        const revisionPricing = await linkRedirectsService.getOrAddAutomationRedirect(revisionId, pricing);
        const revisionAbout = await linkRedirectsService.getOrAddAutomationRedirect(revisionId, about);
        const otherRevisionPricing = await linkRedirectsService.getOrAddAutomationRedirect(otherRevisionId, pricing);

        const slugs = new Set([revisionPricing.from.href, revisionAbout.from.href, otherRevisionPricing.from.href]);
        assert.equal(slugs.size, 3);
        assert.equal((await getRedirectRows()).length, 3);
    });

    it('converges on a single redirect when concurrent sends race the same destination', async function () {
        const destination = new URL('https://external.example.com/pricing');
        const addSpy = sinon.spy(Redirect, 'add');

        const results = await Promise.all(
            Array.from({length: 8}, () => linkRedirectsService.getOrAddAutomationRedirect(revisionId, destination))
        );

        assert.equal(addSpy.callCount > 1, true, 'the sends should genuinely contend on the insert');

        const rows = await getRedirectRows();
        assert.equal(rows.length, 1, 'the unique index should have collapsed the race to one row');

        const slugs = new Set(results.map(result => result.from.href));
        assert.equal(slugs.size, 1, 'every racing send should end up with the same redirect');
        assert.equal(new URL(results[0].from.href).pathname, rows[0].from);
    });

    it('does not collide across revisions when concurrent sends race', async function () {
        const destination = new URL('https://external.example.com/pricing');

        const results = await Promise.all([
            ...Array.from({length: 4}, () => linkRedirectsService.getOrAddAutomationRedirect(revisionId, destination)),
            ...Array.from({length: 4}, () => linkRedirectsService.getOrAddAutomationRedirect(otherRevisionId, destination))
        ]);

        assert.equal((await getRedirectRows()).length, 2);
        assert.equal(new Set(results.slice(0, 4).map(r => r.from.href)).size, 1);
        assert.equal(new Set(results.slice(4).map(r => r.from.href)).size, 1);
        assert.notEqual(results[0].from.href, results[4].from.href);
    });
});
