const {agentProvider, fixtureManager, mockManager, matchers, sleep} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const assert = require('assert');
const urlUtils = require('../../../core/shared/url-utils');
const nock = require('nock');

describe('Webmentions (receiving)', function () {
    let agent;
    let emailMockReceiver;
    before(async function () {
        agent = await agentProvider.getWebmentionsAPIAgent();
        await fixtureManager.init('posts');
        nock.disableNetConnect();
        mockManager.mockLabsEnabled('webmentionEmail');
    });

    after(function () {
        nock.cleanAll();
        nock.enableNetConnect();
    });
    
    beforeEach(function () {
        emailMockReceiver = mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
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

    it('can send an email notification for a new webmention', async function () {
        const url = new URL('http://testpage.com/external-article-123-email-test/');
        const html = `
                <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body></body></html>
            `;
        nock(url.href)
            .get('/')
            .reply(200, html, {'content-type': 'text/html'});

        await agent.post('/receive/')
            .body({
                source: 'http://testpage.com/external-article-123-email-test/',
                target: urlUtils.getSiteUrl() + 'integrations/',
                withExtension: true // test payload recorded
            })
            .expectStatus(202);
        
        await sleep(2000);

        const users = await models.User.findAll();
        users.forEach(async (user) => {
            await mockManager.assert.sentEmail({
                subject: 'You\'ve been mentioned!',
                to: user.toJSON().email
            }); 
        });
        emailMockReceiver.sentEmailCount(users.length);
    });

    it('does not send notification with flag disabled', async function () {
        mockManager.mockLabsDisabled('webmentionEmail');
        const url = new URL('http://testpage.com/external-article-123-email-test/');
        const html = `
                <html><head><title>Test Page</title><meta name="description" content="Test description"><meta name="author" content="John Doe"></head><body></body></html>
            `;
        nock(url.href)
            .get('/')
            .reply(200, html, {'content-type': 'text/html'});

        await agent.post('/receive/')
            .body({
                source: 'http://testpage.com/external-article-123-email-test/',
                target: urlUtils.getSiteUrl() + 'integrations/',
                withExtension: true // test payload recorded
            })
            .expectStatus(202);
        
        await sleep(2000);
        emailMockReceiver.sentEmailCount(0);
    });
});
