const {agentProvider, fixtureManager, mockManager, matchers, sleep} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const assert = require('assert');
const urlUtils = require('../../../core/shared/url-utils');
const nock = require('nock');

describe('Webmentions (receiving)', function () {
    let agent;
    before(async function () {
        agent = await agentProvider.getWebmentionsAPIAgent();
        await fixtureManager.init('posts');
        nock.disableNetConnect();
    });

    after(function () {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    it('can receive a webmention', async function () {
        const url = new URL('http://testpage.com/external-article/');
        const html = `
                <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body></body></html>
            `;
        nock(url.href)
            .get('/')
            .reply(200, html, {'content-type': 'text/html'});

        await agent.post('/receive')
            .body({
                source: 'http://testpage.com/external-article/',
                target: urlUtils.getSiteUrl() + 'integrations/',
                withExtension: true // test payload recorded
            })
            .expectStatus(202);

        // todo: remove sleep in future
        await sleep(2000);

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
    it('can receive a webmention to homepage', async function () {
        const url = new URL('http://testpage.com/external-article-2/');
        const html = `
                <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body></body></html>
            `;
        nock(url.href)
            .get('/')
            .reply(200, html, {'content-type': 'text/html'});

        await agent.post('/receive')
            .body({
                source: 'http://testpage.com/external-article-2/',
                target: urlUtils.getSiteUrl()
            })
            .expectStatus(202);

        // todo: remove sleep in future
        await sleep(2000);

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
});
