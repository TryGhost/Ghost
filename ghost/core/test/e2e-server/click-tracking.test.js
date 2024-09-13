const assert = require('assert/strict');
const fetch = require('node-fetch').default;
const {agentProvider, mockManager, fixtureManager, matchers} = require('../utils/e2e-framework');
const urlUtils = require('../../core/shared/url-utils');
const jobService = require('../../core/server/services/jobs/job-service');
const {anyGhostAgent, anyContentVersion, anyNumber, anyISODateTime, anyObjectId} = matchers;
const membersEventsService = require('../../core/server/services/members-events');

describe('Click Tracking', function () {
    let agent;
    let webhookMockReceiver;

    before(async function () {
        const {adminAgent} = await agentProvider.getAgentsWithFrontend();
        agent = adminAgent;
        await fixtureManager.init('newsletters', 'members:newsletters', 'integrations');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockMail();
        mockManager.mockMailgun();
        webhookMockReceiver = mockManager.mockWebhookRequests();
        membersEventsService.clearLastSeenAtCache();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Full test', async function () {
        const siteUrl = new URL(urlUtils.urlFor('home', true));

        const {body: {posts: [draft]}} = await agent.post('/posts/?source=html', {
            body: {
                posts: [{
                    title: 'My Newsletter',
                    html: `<p>External link <a href="https://example.com/a">https://example.com/a</a>; Internal link <a href=${siteUrl.href}/about">${siteUrl.href}/about</a>;Ghost homepage <a href="https://ghost.org">https://ghost.org</a></p>`
                }]
            }
        });

        const newsletterSlug = fixtureManager.get('newsletters', 0).slug;
        const {body: {posts: [post]}} = await agent.put(
            `/posts/${draft.id}/?newsletter=${newsletterSlug}`,
            {
                body: {
                    posts: [{
                        updated_at: draft.updated_at,
                        status: 'published'
                    }]
                }
            }
        );

        // Wait for the newsletter to be sent
        await jobService.allSettled();

        // Setup a webhook listener for member.edited events
        const webhookURL = 'https://test-webhook-receiver.com/member-edited/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'member.edited',
            url: webhookURL
        });

        const {body: {links}} = await agent.get(
            `/links/?filter=${encodeURIComponent(`post_id:'${post.id}'`)}`
        );

        /** @type {(url: string) => Promise<import('node-fetch').Response>} */
        const fetchWithoutFollowingRedirect = url => fetch(url, {redirect: 'manual'});

        let internalRedirectHappened = false;
        let externalRedirectHappened = false;
        let poweredByGhostIgnored = true;

        for (const link of links) {
            const res = await fetchWithoutFollowingRedirect(link.link.from);
            const redirectedToUrl = new URL(res.headers.get('location'));

            // startsWith is a little dirty, but we need this because siteUrl
            // can have a path when Ghost is hosted on a subdomain.
            const isInternal = redirectedToUrl.href.startsWith(siteUrl.href);
            if (isInternal) {
                internalRedirectHappened = true;

                assert(redirectedToUrl.searchParams.get('attribution_id'), 'attribution_id should be present on internal redirects');
                assert(redirectedToUrl.searchParams.get('attribution_type'), 'attribution_type should be present on internal redirects');
            } else {
                externalRedirectHappened = true;

                assert(!redirectedToUrl.searchParams.get('attribution_id'), 'attribution_id should not be present on internal redirects');
                assert(!redirectedToUrl.searchParams.get('attribution_type'), 'attribution_type should not be present on internal redirects');
            }

            assert(redirectedToUrl.searchParams.get('ref'), 'ref should be present on all redirects');

            // Powered by Ghost link should not be replaced / tracked
            if (link.link.to.includes('https://ghost.org/?via=pbg-newsletter')) {
                poweredByGhostIgnored = false;
            }
        }

        assert(internalRedirectHappened);
        assert(externalRedirectHappened);
        assert(poweredByGhostIgnored);

        const {body: {members}} = await agent.get(
            `/members/`
        );

        const linkToClick = links[0];
        const memberToClickLink = members[0];
        assert(memberToClickLink.last_seen_at === null);
        const urlOfLinkToClick = new URL(linkToClick.link.from);

        urlOfLinkToClick.searchParams.set('m', memberToClickLink.uuid);

        const previousClickCount = linkToClick.count.clicks;

        await fetchWithoutFollowingRedirect(urlOfLinkToClick.href);

        const {body: {links: [clickedLink]}} = await agent.get(
            `/links/?filter=${encodeURIComponent(`post_id:'${post.id}'`)}`
        );

        const clickCount = clickedLink.count.clicks;

        const {body: {events: clickEvents}} = await agent.get(
            `/members/events/?filter=${encodeURIComponent(`data.member_id:'${memberToClickLink.id}'+type:click_event`)}`
        );

        const clickEvent = clickEvents.find((/** @type any */ event) => {
            return event.data.post.id === post.id && event.data.link.from === urlOfLinkToClick.pathname;
        });

        assert(clickEvent);
        assert(previousClickCount + 1 === clickCount);

        // Ensure we updated the member's last_seen_at
        const {body: {members: [memberWhoClicked]}} = await agent.get(
            `/members/${memberToClickLink.id}`
        );
        assert(memberWhoClicked.last_seen_at !== null, 'last_seen_at should be set after a click');
        assert(new Date(memberWhoClicked.last_seen_at).getTime() > 0, 'last_seen_at should be a valid date');
        // Ensure we sent the webhook with the correct payload, including newsletters and labels
        await webhookMockReceiver.receivedRequest();
        webhookMockReceiver
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                'content-length': anyNumber,
                'user-agent': anyGhostAgent
            })
            .matchBodySnapshot({
                member: {
                    current: {
                        created_at: anyISODateTime,
                        id: anyObjectId,
                        last_seen_at: anyISODateTime,
                        updated_at: anyISODateTime
                    },
                    previous: {
                        last_seen_at: null,
                        updated_at: anyISODateTime
                    }
                }
            });
    });
});
