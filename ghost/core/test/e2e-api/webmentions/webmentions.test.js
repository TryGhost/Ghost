const {
    agentProvider,
    fixtureManager,
    mockManager,
    dbUtils,
    configUtils
} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const assert = require('assert/strict');
const urlUtils = require('../../../core/shared/url-utils');
const nock = require('nock');
const jobsService = require('../../../core/server/services/mentions-jobs');
const DomainEvents = require('@tryghost/domain-events');

async function allSettled() {
    await jobsService.allSettled();
    await DomainEvents.allSettled();
}

describe('Webmentions (receiving)', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getWebmentionsAPIAgent();
        await fixtureManager.init('posts');
    });

    beforeEach(async function () {
        await allSettled();
        mockManager.disableNetwork();
        mockManager.mockLabsEnabled('webmentions');
    });

    afterEach(async function () {
        await allSettled();
        mockManager.restore();
        await dbUtils.truncate('brute');
    });

    it('can receive a webmention', async function () {
        const targetUrl = new URL('integrations/', urlUtils.getSiteUrl());
        const sourceUrl = new URL('http://testpage.com/external-article/');
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
        await agent.post('/receive')
            .body({
                source: sourceUrl.href,
                target: targetUrl.href,
                withExtension: true // test payload recorded
            })
            .expectStatus(202);

        await allSettled();

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

            await agent.post('/receive')
                .body({
                    source: sourceUrl.href,
                    target: targetUrl.href
                })
                .expectStatus(202);

            await allSettled();

            const mention = await models.Mention.findOne({source: 'http://testpage.com/update-mention-test-1/'});
            assert(mention);
            assert.equal(mention.get('source_title'), 'Test Page');
            assert.equal(mention.get('source_excerpt'), 'Test description');
            assert.equal(mention.get('source_author'), 'John Doe');

            break testCreatingTheMention;
        }

        nock.cleanAll();

        testUpdatingTheMention: {
            const html = `
                    <html><head><title>New Title</title><meta name="description" content="New Description"><meta name="author" content="big man with a beard"></head><body></body></html>
                `;

            nock(targetUrl.origin)
                .persist()
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

            await allSettled();

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
            .persist()
            .get(sourceUrl.pathname)
            .reply(200, html, {'Content-Type': 'text/html'});

        testCreatingTheMention: {
            await agent.post('/receive')
                .body({
                    source: sourceUrl.href,
                    target: targetUrl.href
                })
                .expectStatus(202);

            await allSettled();

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
            .persist()
            .head(targetUrl.pathname)
            .reply(404);

        testUpdatingTheMention: {
            await agent.post('/receive')
                .body({
                    source: sourceUrl.href,
                    target: targetUrl.href
                })
                .expectStatus(202);

            await allSettled();

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

        await allSettled();

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

    it('can verify a webmention <a> link', async function () {
        const targetUrl = new URL(urlUtils.getSiteUrl());
        const sourceUrl = new URL('http://testpage.com/external-article-2/');
        const html = `
                <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body><a href="${urlUtils.getSiteUrl()}">your cool website mentioned</a></body></html>
            `;
        nock(targetUrl.origin)
            .persist()
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

        await allSettled();

        const mention = await models.Mention.findOne({source: 'http://testpage.com/external-article-2/'});

        assert(mention);
        assert.equal(mention.get('verified'), true);
    });

    it('can verify a webmention <a> link to post', async function () {
        const targetUrl = new URL('integrations/', urlUtils.getSiteUrl());
        const sourceUrl = new URL('http://testpage.com/external-article-3/');
        const html = `
                <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body><a href="${targetUrl.toString()}">your cool website mentioned</a></body></html>
            `;
        nock(targetUrl.origin)
            .persist()
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

        await allSettled();

        const mention = await models.Mention.findOne({source: sourceUrl.href});

        assert(mention);
        assert.equal(mention.get('verified'), true);
    });

    it('can verify a webmention <a> link to post with tracking parameters', async function () {
        const targetUrl = new URL('integrations/', urlUtils.getSiteUrl());
        const sourceUrl = new URL('http://testpage.com/external-article-4/');
        const html = `
                <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body><a href="${targetUrl.toString()}?ref=1234-working">your cool website mentioned</a></body></html>
            `;
        nock(targetUrl.origin)
            .persist()
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

        await allSettled();

        const mention = await models.Mention.findOne({source: sourceUrl.href});

        assert(mention);
        assert.equal(mention.get('verified'), true);
    });

    it('marks as unverified if url not present on source', async function () {
        const targetUrl = new URL('html-ipsum', urlUtils.getSiteUrl());
        const sourceUrl = new URL('http://testpage.com/external-article-not-present/');
        const html = `
                <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body><a href="${urlUtils.getSiteUrl()}">your cool website mentioned</a></body></html>
            `;
        nock(targetUrl.origin).persist()
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

        await allSettled();

        const mention = await models.Mention.findOne({source: sourceUrl.toString()});

        assert(mention);
        assert.equal(mention.get('verified'), false);
    });

    it('can verify a webmention <img> link', async function () {
        const targetUrl = new URL(urlUtils.getSiteUrl());
        const sourceUrl = new URL('http://testpage.com/external-article-2/');
        const html = `
                <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body><img src="${urlUtils.getSiteUrl()}"></body></html>
            `;
        nock(targetUrl.origin).persist()
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

        await allSettled();

        const mention = await models.Mention.findOne({source: 'http://testpage.com/external-article-2/'});

        assert(mention);
        assert.equal(mention.get('verified'), true);
    });

    it('can verify a webmention <video> link', async function () {
        const targetUrl = new URL(urlUtils.getSiteUrl());
        const sourceUrl = new URL('http://testpage.com/external-article-2/');
        const html = `
                <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body><video src="${urlUtils.getSiteUrl()}"></body></html>
            `;
        nock(targetUrl.origin).persist()
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

        await allSettled();

        const mention = await models.Mention.findOne({source: 'http://testpage.com/external-article-2/'});

        assert(mention);
        assert.equal(mention.get('verified'), true);
    });

    // NOTE: this test needs to be last; it will disrupt other tests based on the fact we can't
    //  await the jobService completion for multiple concurrent requests
    it('is rate limited against spamming mention requests', async function () {
        await dbUtils.truncate('brute');
        const webmentionBlock = configUtils.config.get('spam').webmentions_block;
        const targetUrl = new URL(urlUtils.getSiteUrl());
        const sourceUrl = new URL('http://testpage.com/external-article-brute-test/');
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
        await allSettled();
    });
    // NOTE: do not list other tests after the spam prevention test
});
