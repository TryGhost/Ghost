const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const assert = require('assert/strict');
const mentionsService = require('../../../core/server/services/mentions');
const recommendationsService = require('../../../core/server/services/recommendations');

let agent;
const DomainEvents = require('@tryghost/domain-events');
const {Mention} = require('@tryghost/webmentions');
const {Recommendation} = require('../../../core/server/services/recommendations/service');

describe('Incoming Recommendation Emails', function () {
    let emailMockReceiver;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsAdmin();
    });

    beforeEach(async function () {
        emailMockReceiver = mockManager.mockMail();
    });

    afterEach(async function () {
        mockManager.restore();
    });

    it('Sends an email if we receive a recommendation', async function () {
        const webmention = await Mention.create({
            source: 'https://www.otherghostsite.com/.well-known/recommendations.json',
            target: 'https://www.mysite.com/',
            timestamp: new Date(),
            payload: null,
            resourceId: null,
            resourceType: null,
            sourceTitle: 'Other Ghost Site',
            sourceSiteTitle: 'Other Ghost Site',
            sourceAuthor: null,
            sourceExcerpt: null,
            sourceFavicon: null,
            sourceFeaturedImage: null
        });

        // Mark it as verified
        webmention.verify('{"url": "https://www.mysite.com/"}', 'application/json');
        assert.ok(webmention.verified);

        // Save to repository
        await mentionsService.repository.save(webmention);

        await DomainEvents.allSettled();

        emailMockReceiver
            .assertSentEmailCount(2)
            .matchHTMLSnapshot([{}], 0)
            .matchHTMLSnapshot([{}], 1)
            .matchPlaintextSnapshot([{}])
            .matchMetadataSnapshot();

        const email = emailMockReceiver.getSentEmail(0);

        // Check if the site title is visible in the email
        assert(email.html.includes('Other Ghost Site'));
        assert(email.html.includes('Recommend back'));
        assert(email.html.includes('https://www.otherghostsite.com'));
    });

    it('Sends a different email if we receive a recommendation back', async function () {
        // Create a recommendation to otherghostsite.com
        const recommendation = Recommendation.create({
            title: `Recommendation`,
            description: `Description`,
            url: new URL(`https://www.otherghostsite.com/`),
            favicon: null,
            featuredImage: null,
            excerpt: 'Test excerpt',
            oneClickSubscribe: true,
            createdAt: new Date(5000)
        });

        await recommendationsService.repository.save(recommendation);

        const webmention = await Mention.create({
            source: 'https://www.otherghostsite.com/.well-known/recommendations.json',
            target: 'https://www.mysite.com/',
            timestamp: new Date(),
            payload: null,
            resourceId: null,
            resourceType: null,
            sourceTitle: 'Other Ghost Site',
            sourceSiteTitle: 'Other Ghost Site',
            sourceAuthor: null,
            sourceExcerpt: null,
            sourceFavicon: null,
            sourceFeaturedImage: null
        });

        // Mark it as verified
        webmention.verify('{"url": "https://www.mysite.com/"}', 'application/json');
        assert.ok(webmention.verified);

        // Save to repository
        await mentionsService.repository.save(webmention);

        await DomainEvents.allSettled();

        emailMockReceiver
            .assertSentEmailCount(2)
            .matchHTMLSnapshot([{}])
            .matchPlaintextSnapshot([{}])
            .matchMetadataSnapshot();

        const email = emailMockReceiver.getSentEmail(0);

        // Check if the site title is visible in the email
        assert(email.html.includes('Other Ghost Site'));
        assert(email.html.includes('View recommendations'));
        assert(email.html.includes('https://www.otherghostsite.com'));
    });

    it('Does not send an email if we receive a normal mention', async function () {
        const webmention = await Mention.create({
            source: 'https://www.otherghostsite.com/recommendations.json',
            target: 'https://www.mysite.com/',
            timestamp: new Date(),
            payload: null,
            resourceId: null,
            resourceType: null,
            sourceTitle: 'Other Ghost Site',
            sourceSiteTitle: 'Other Ghost Site',
            sourceAuthor: null,
            sourceExcerpt: null,
            sourceFavicon: null,
            sourceFeaturedImage: null
        });

        // Mark it as verified
        webmention.verify('{"url": "https://www.mysite.com/"}', 'application/json');
        assert.ok(webmention.verified);

        // Save to repository
        await mentionsService.repository.save(webmention);

        await DomainEvents.allSettled();

        emailMockReceiver.assertSentEmailCount(0);
    });

    it('Does not send an email for an unverified webmention', async function () {
        const webmention = await Mention.create({
            source: 'https://www.otherghostsite.com/.well-known/recommendations.json',
            target: 'https://www.mysite.com/',
            timestamp: new Date(),
            payload: null,
            resourceId: null,
            resourceType: null,
            sourceTitle: 'Other Ghost Site',
            sourceSiteTitle: 'Other Ghost Site',
            sourceAuthor: null,
            sourceExcerpt: null,
            sourceFavicon: null,
            sourceFeaturedImage: null
        });

        // Mark it as verified
        webmention.verify('{"url": "https://www.myste.com/"}', 'application/json');
        assert.ok(!webmention.verified);

        // Save to repository
        await mentionsService.repository.save(webmention);

        await DomainEvents.allSettled();

        emailMockReceiver.assertSentEmailCount(0);
    });
});
