const assert = require('assert/strict');
const fetch = require('node-fetch').default;
const {agentProvider, mockManager, fixtureManager} = require('../utils/e2e-framework');
const urlUtils = require('../../core/shared/url-utils');
const jobService = require('../../core/server/services/jobs/job-service');
const {knex} = require('../utils');

describe('Click Tracking Performance', function () {
    let agent;
    let links;

    before(async function () {
        const {adminAgent} = await agentProvider.getAgentsWithFrontend();
        agent = adminAgent;
        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();

        mockManager.mockMail();
        mockManager.mockMailgun();

        // Prepare links
        const {body: {posts: [draft]}} = await agent.post('/posts/', {
            body: {
                posts: [{
                    title: 'My Newsletter'
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

        const {body} = await agent.get(
            `/links/?filter=${encodeURIComponent(`post_id:'${post.id}'`)}`
        );
        links = body.links;

        mockManager.restore();
    });

    beforeEach(function () {
        mockManager.mockMail();
        mockManager.mockMailgun();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Runs fast enough', async function () {
        this.timeout(5 * 60 * 1000);

        /** @type {(url: string) => Promise<import('node-fetch').Response>} */
        const fetchWithoutFollowingRedirect = url => fetch(url, {redirect: 'manual'});

        const siteUrl = new URL(urlUtils.urlFor('home', true));

        // Settle a baseline so the performance result is not affected by CPU speed or other factors
        const baselineStartTime = Date.now();

        let c = 0;

        // On a fast machine, this takes ±5s
        for (let i = 0; i < 10000; i++) {
            // todo
            c += await knex.raw('SELECT count(*) from email_recipients;');
            //
        }

        // do nothing with c

        const baselineEndTime = Date.now();
        const baselineDuration = baselineEndTime - baselineStartTime;

        const startTime = Date.now();

        // Should take ±10s on a fast machine
        for (let i = 0; i < 1000; i++) {
            for (const link of links) {
                const res = await fetchWithoutFollowingRedirect(link.link.from);
                const redirectedToUrl = new URL(res.headers.get('location'));

                // startsWith is a little dirty, but we need this because siteUrl
                // can have a path when Ghost is hosted on a subdomain.
                const isInternal = redirectedToUrl.href.startsWith(siteUrl.href);

                if (isInternal) {
                    assert(redirectedToUrl.searchParams.get('attribution_id'), 'attribution_id should be present on internal redirects');
                    assert(redirectedToUrl.searchParams.get('attribution_type'), 'attribution_type should be present on internal redirects');
                } else {
                    assert(!redirectedToUrl.searchParams.get('attribution_id'), 'attribution_id should not be present on internal redirects');
                    assert(!redirectedToUrl.searchParams.get('attribution_type'), 'attribution_type should not be present on internal redirects');
                }

                assert(redirectedToUrl.searchParams.get('ref'), 'ref should be present on all redirects');
            }
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        assert(duration / baselineDuration * 5000 < 15000, `Click tracking performance is too slow: ${duration}ms, with a baseline of ${baselineDuration}ms / 5s, corrected to ${duration / baselineDuration * 5000}`);
        assert(duration / baselineDuration * 5000 > 5000, `Good job! Click tracking performance is too fast: ${duration}ms (with a baseline of ${baselineDuration}ms / 5s, corrected to ${duration / baselineDuration * 5000}), update the test so we can keep it fast!`);
    });
});
