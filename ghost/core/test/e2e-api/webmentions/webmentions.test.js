const {
    agentProvider,
    fixtureManager,
    mockManager,
    dbUtils,
    configUtils
} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const assert = require('assert');
const urlUtils = require('../../../core/shared/url-utils');
const nock = require('nock');
const jobsService = require('../../../core/server/services/mentions-jobs');
const DomainEvents = require('@tryghost/domain-events');

describe('Webmentions (receiving)', function () {
    let agent;
    let emailMockReceiver;
    before(async function () {
        agent = await agentProvider.getWebmentionsAPIAgent();
        await fixtureManager.init('posts');
        nock.disableNetConnect();
        mockManager.mockLabsEnabled('webmentions');
    });

    after(function () {
        nock.enableNetConnect();
    });

    beforeEach(function () {
        emailMockReceiver = mockManager.mockMail();
    });

    afterEach(async function () {
        nock.cleanAll();
        await DomainEvents.allSettled();
        mockManager.restore();
        await dbUtils.truncate('brute');
    });

    it('can receive a webmention', async function () {
        const processWebmentionJob = jobsService.awaitCompletion('processWebmention');
        const targetUrl = new URL('integrations/', urlUtils.getSiteUrl());
        const sourceUrl = new URL('http://testpage.com/external-article/');
        const html = `
                <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body></body></html>
            `;

        nock(targetUrl.origin)
            .head(targetUrl.pathname)
            .reply(200);

        nock(sourceUrl.origin)
            .get(sourceUrl.pathname)
            .reply(200, html, {'Content-Type': 'text/html'});
        await agent.post('/receive')
            .body({
                source: sourceUrl.href,
                target: targetUrl.href,
                withExtension: true // test payload recorded
            })
            .expectStatus(202);

        await processWebmentionJob;

        const mention = await models.Mention.findOne({source: 'http://testpage.com/external-article/'});
        assert(mention);
        assert.equal(mention.get('target'), urlUtils.getSiteUrl() + 'integrations/');
        assert.ok(mention.get('resource_id'));
        assert.equal(mention.get('resource_type'), 'post');
        assert.equal(mention.get('source_title'), 'Test Page');
        assert.equal(mention.get('source_excerpt'), 'Test description');
        assert.equal(mention.get('source_author'), 'John Doe');
        assert.equal(mention.get('payload'), JSON.stringify({
            withExtension: true
        }));
    });

    it('will update a mentions source metadata', async function () {
        const targetUrl = new URL(urlUtils.getSiteUrl());
        const sourceUrl = new URL('http://testpage.com/update-mention-test-1/');

        testCreatingTheMention: {
            const processWebmentionJob = jobsService.awaitCompletion('processWebmention');
            const html = `
                    <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body></body></html>
                `;

            nock(targetUrl.origin)
                .head(targetUrl.pathname)
                .reply(200);

            nock(sourceUrl.origin)
                .get(sourceUrl.pathname)
                .reply(200, html, {'Content-Type': 'text/html'});

            await agent.post('/receive')
                .body({
                    source: sourceUrl.href,
                    target: targetUrl.href
                })
                .expectStatus(202);

            await processWebmentionJob;

            const mention = await models.Mention.findOne({source: 'http://testpage.com/update-mention-test-1/'});
            assert(mention);
            assert.equal(mention.get('source_title'), 'Test Page');
            assert.equal(mention.get('source_excerpt'), 'Test description');
            assert.equal(mention.get('source_author'), 'John Doe');

            break testCreatingTheMention;
        }

        testUpdatingTheMention: {
            const processWebmentionJob = jobsService.awaitCompletion('processWebmention');
            const html = `
                    <html><head><title>New Title</title><meta name="description" content="New Description"><meta name="author" content="big man with a beard"></head><body></body></html>
                `;

            nock(targetUrl.origin)
                .head(targetUrl.pathname)
                .reply(200);

            nock(sourceUrl.origin)
                .get(sourceUrl.pathname)
                .reply(200, html, {'Content-Type': 'text/html'});

            await agent.post('/receive')
                .body({
                    source: sourceUrl.href,
                    target: targetUrl.href
                })
                .expectStatus(202);

            await processWebmentionJob;

            const mention = await models.Mention.findOne({source: 'http://testpage.com/update-mention-test-1/'});
            assert(mention);
            assert.equal(mention.get('source_title'), 'New Title');
            assert.equal(mention.get('source_excerpt'), 'New Description');
            assert.equal(mention.get('source_author'), 'big man with a beard');

            break testUpdatingTheMention;
        }
    });

    it('will delete a mention when the target in Ghost was deleted', async function () {
        const post = await models.Post.findOne({id: fixtureManager.get('posts', 0).id});
        const targetUrl = new URL(urlUtils.getSiteUrl() + post.get('slug') + '/');
        const sourceUrl = new URL('http://testpage.com/update-mention-test-2/');
        const html = `
            <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body></body></html>
        `;
        nock(sourceUrl.origin)
            .get(sourceUrl.pathname)
            .reply(200, html, {'Content-Type': 'text/html'});

        testCreatingTheMention: {
            const processWebmentionJob = jobsService.awaitCompletion('processWebmention');
            await agent.post('/receive')
                .body({
                    source: sourceUrl.href,
                    target: targetUrl.href
                })
                .expectStatus(202);

            await processWebmentionJob;

            const mention = await models.Mention.findOne({source: 'http://testpage.com/update-mention-test-2/'});
            assert(mention);
            assert.equal(mention.get('resource_id'), post.id);
            assert.equal(mention.get('source_title'), 'Test Page');
            assert.equal(mention.get('source_excerpt'), 'Test description');
            assert.equal(mention.get('source_author'), 'John Doe');

            break testCreatingTheMention;
        }

        // Move post to draft and mark page as 404
        await models.Post.edit({status: 'draft'}, {id: post.id});

        nock(targetUrl.origin)
            .head(targetUrl.pathname)
            .reply(404);

        testUpdatingTheMention: {
            const processWebmentionJob = jobsService.awaitCompletion('processWebmention');

            await agent.post('/receive')
                .body({
                    source: sourceUrl.href,
                    target: targetUrl.href
                })
                .expectStatus(202);

            await processWebmentionJob;

            const mention = await models.Mention.findOne({source: 'http://testpage.com/update-mention-test-2/'});
            assert(mention);

            // Check resource id was not cleared
            assert.equal(mention.get('resource_id'), post.id);

            // Check deleted
            assert.equal(mention.get('deleted'), true);

            break testUpdatingTheMention;
        }
    });

    it('can receive a webmention to homepage', async function () {
        const processWebmentionJob = jobsService.awaitCompletion('processWebmention');
        const targetUrl = new URL(urlUtils.getSiteUrl());
        const sourceUrl = new URL('http://testpage.com/external-article-2/');
        const html = `
                <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body></body></html>
            `;

        nock(targetUrl.origin)
            .head(targetUrl.pathname)
            .reply(200);

        nock(sourceUrl.origin)
            .get(sourceUrl.pathname)
            .reply(200, html, {'Content-Type': 'text/html'});

        await agent.post('/receive')
            .body({
                source: sourceUrl.href,
                target: targetUrl.href
            })
            .expectStatus(202);

        await processWebmentionJob;

        const mention = await models.Mention.findOne({source: 'http://testpage.com/external-article-2/'});
        assert(mention);
        assert.equal(mention.get('target'), urlUtils.getSiteUrl());
        assert.ok(!mention.get('resource_id'));
        assert.equal(mention.get('resource_type'), null);
        assert.equal(mention.get('source_title'), 'Test Page');
        assert.equal(mention.get('source_excerpt'), 'Test description');
        assert.equal(mention.get('source_author'), 'John Doe');
        assert.equal(mention.get('payload'), JSON.stringify({}));
    });

    it('can send an email notification for a new webmention', async function () {
        const processWebmentionJob = jobsService.awaitCompletion('processWebmention');
        const targetUrl = new URL('integrations/', urlUtils.getSiteUrl());
        const sourceUrl = new URL('http://testpage.com/external-article-123-email-test/');
        const html = `
            <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body></body></html>
        `;

        nock(targetUrl.origin)
            .head(targetUrl.pathname)
            .reply(200);

        nock(sourceUrl.origin)
            .get(sourceUrl.pathname)
            .reply(200, html, {'Content-Type': 'text/html'});

        await agent.post('/receive/')
            .body({
                source: sourceUrl.href,
                target: targetUrl.href
            })
            .expectStatus(202);

        await processWebmentionJob;
        await DomainEvents.allSettled();

        const users = await models.User.getEmailAlertUsers('mention-received');
        for (const user of users) {
            await mockManager.assert.sentEmail({
                subject: /New mention from/,
                to: user.email
            });
        }
        emailMockReceiver.sentEmailCount(users.length);
    });

    it('does not send notification with flag disabled', async function () {
        mockManager.mockLabsDisabled('webmentions');
        const processWebmentionJob = jobsService.awaitCompletion('processWebmention');
        const targetUrl = new URL('integrations/', urlUtils.getSiteUrl());
        const sourceUrl = new URL('http://testpage.com/external-article-123-email-test/');
        const html = `
            <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body></body></html>
        `;

        nock(targetUrl.origin)
            .head(targetUrl.pathname)
            .reply(200);

        nock(sourceUrl.origin)
            .get(sourceUrl.pathname)
            .reply(200, html, {'Content-Type': 'text/html'});

        await agent.post('/receive/')
            .body({
                source: sourceUrl.href,
                target: targetUrl.href
            })
            .expectStatus(202);

        await processWebmentionJob;
        await DomainEvents.allSettled();

        emailMockReceiver.sentEmailCount(0);
    });

    it('is rate limited against spamming mention requests', async function () {
        await dbUtils.truncate('brute');
        const webmentionBlock = configUtils.config.get('spam').webmentions_block;
        const targetUrl = new URL(urlUtils.getSiteUrl());
        const sourceUrl = new URL('http://testpage.com/external-article-2/');
        const html = `
                <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body></body></html>
            `;
        nock(targetUrl.origin)
            .persist()
            .head(targetUrl.pathname)
            .reply(200);

        nock(sourceUrl.origin)
            .persist()
            .get(sourceUrl.pathname)
            .reply(200, html, {'Content-Type': 'text/html'});

        const requests = [];
        for (let i = 0; i < webmentionBlock.freeRetries + 1; i++) {
            const req = await agent.post('/receive/')
                .body({
                    source: sourceUrl.href,
                    target: targetUrl.href,
                    payload: {}
                })
                .expectStatus(202);

            requests.push(req);
        }
        await Promise.all(requests);

        await agent
            .post('/receive/')
            .body({
                source: sourceUrl.href,
                target: targetUrl.href,
                payload: {}
            })
            .expectStatus(429);
    });

    it('can verify a webmention <a> link', async function () {
        const processWebmentionJob = jobsService.awaitCompletion('processWebmention');
        const targetUrl = new URL(urlUtils.getSiteUrl());
        const sourceUrl = new URL('http://testpage.com/external-article-2/');
        const html = `
                <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body><a href="${urlUtils.getSiteUrl()}">your cool website mentioned</a></body></html>
            `;
        nock(targetUrl.origin)
            .head(targetUrl.pathname)
            .reply(200);

        nock(sourceUrl.origin)
            .persist()
            .get(sourceUrl.pathname)
            .reply(200, html, {'Content-Type': 'text/html'});

        await agent.post('/receive')
            .body({
                source: sourceUrl.href,
                target: targetUrl.href
            })
            .expectStatus(202);

        await processWebmentionJob;

        const mention = await models.Mention.findOne({source: 'http://testpage.com/external-article-2/'});

        assert(mention);
        assert.equal(mention.get('verified'), true);
    });

    it('can verifiy a webmention <img> link', async function () {
        const processWebmentionJob = jobsService.awaitCompletion('processWebmention');
        const targetUrl = new URL(urlUtils.getSiteUrl());
        const sourceUrl = new URL('http://testpage.com/external-article-2/');
        const html = `
                <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body><img src="${urlUtils.getSiteUrl()}"></body></html>
            `;
        nock(targetUrl.origin)
            .head(targetUrl.pathname)
            .reply(200);

        nock(sourceUrl.origin)
            .persist()
            .get(sourceUrl.pathname)
            .reply(200, html, {'Content-Type': 'text/html'});

        await agent.post('/receive')
            .body({
                source: sourceUrl.href,
                target: targetUrl.href
            })
            .expectStatus(202);

        await processWebmentionJob;

        const mention = await models.Mention.findOne({source: 'http://testpage.com/external-article-2/'});

        assert(mention);
        assert.equal(mention.get('verified'), true);
    });

    it('can verify a webmention <video> link', async function () {
        const processWebmentionJob = jobsService.awaitCompletion('processWebmention');
        const targetUrl = new URL(urlUtils.getSiteUrl());
        const sourceUrl = new URL('http://testpage.com/external-article-2/');
        const html = `
                <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body><video src="${urlUtils.getSiteUrl()}"></body></html>
            `;
        nock(targetUrl.origin)
            .head(targetUrl.pathname)
            .reply(200);

        nock(sourceUrl.origin)
            .persist()
            .get(sourceUrl.pathname)
            .reply(200, html, {'Content-Type': 'text/html'});

        await agent.post('/receive')
            .body({
                source: sourceUrl.href,
                target: targetUrl.href
            })
            .expectStatus(202);

        await processWebmentionJob;

        const mention = await models.Mention.findOne({source: 'http://testpage.com/external-article-2/'});

        assert(mention);
        assert.equal(mention.get('verified'), true);
    });
});
