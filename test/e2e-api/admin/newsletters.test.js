const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyString, anyISODateTime, anyLocationFor} = matchers;
const testUtils = require('../../utils');

const newsletterSnapshot = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

let agent;

describe('Newsletters API', function () {
    let mailMocks;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mailMocks = mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can browse newsletters', async function () {
        await agent.get('newsletters/')
            .expectStatus(200)
            .matchBodySnapshot({
                newsletters: new Array(4).fill(newsletterSnapshot)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can read a newsletter', async function () {
        await agent
            .get(`newsletters/${testUtils.DataGenerator.Content.newsletters[0].id}/`)
            .expectStatus(200)
            .matchBodySnapshot({
                newsletters: [newsletterSnapshot]

            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can include members & posts counts when browsing newsletters', async function () {
        await agent
            .get(`newsletters/?include=count.members,count.posts`)
            .expectStatus(200)
            .matchBodySnapshot({
                newsletters: new Array(4).fill(newsletterSnapshot)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can include members & posts counts when reading a newsletter', async function () {
        await agent
            .get(`newsletters/${testUtils.DataGenerator.Content.newsletters[0].id}/?include=count.members,count.posts`)
            .expectStatus(200)
            .matchBodySnapshot({
                newsletters: new Array(1).fill(newsletterSnapshot)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can add a newsletter', async function () {
        const newsletter = {
            name: 'My test newsletter',
            sender_name: 'Test',
            sender_email: null,
            sender_reply_to: 'newsletter',
            status: 'active',
            subscribe_on_signup: true,
            title_font_category: 'serif',
            body_font_category: 'serif',
            show_header_icon: true,
            show_header_title: true,
            show_badge: true,
            sort_order: 0
        };

        await agent
            .post(`newsletters/`)
            .body({newsletters: [newsletter]})
            .expectStatus(201)
            .matchBodySnapshot({
                newsletters: [newsletterSnapshot]
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('newsletters')
            });
    });

    it('Can add a newsletter - with custom sender_email', async function () {
        const newsletter = {
            name: 'My test newsletter with custom sender_email',
            sender_name: 'Test',
            sender_email: 'test@example.com',
            sender_reply_to: 'newsletter',
            status: 'active',
            subscribe_on_signup: true,
            title_font_category: 'serif',
            body_font_category: 'serif',
            show_header_icon: true,
            show_header_title: true,
            show_badge: true,
            sort_order: 0
        };

        await agent
            .post(`newsletters/`)
            .body({newsletters: [newsletter]})
            .expectStatus(201)
            .matchBodySnapshot({
                newsletters: [newsletterSnapshot],
                meta: {
                    sent_email_verification: ['sender_email']
                }
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('newsletters')
            });

        mockManager.assert.sentEmail({
            subject: 'Verify email address',
            to: 'test@example.com'
        });
    });

    it('Can add a newsletter - and subscribe existing members', async function () {
        const newsletter = {
            name: 'My test newsletter with existing members subscribed',
            sender_name: 'Test',
            sender_email: null,
            sender_reply_to: 'newsletter',
            status: 'active',
            subscribe_on_signup: true,
            title_font_category: 'serif',
            body_font_category: 'serif',
            show_header_icon: true,
            show_header_title: true,
            show_badge: true,
            sort_order: 0
        };

        const {body} = await agent
            .post(`newsletters/?opt_in_existing=true`)
            .body({newsletters: [newsletter]})
            .expectStatus(201)
            .matchBodySnapshot({
                newsletters: [newsletterSnapshot]
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyString
            });

        await agent.get(`newsletters/${body.newsletters[0].id}/?include=count.members`)
            .expectStatus(200)
            .matchBodySnapshot({
                newsletters: [newsletterSnapshot]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can edit newsletters', async function () {
        const id = fixtureManager.get('newsletters', 0).id;
        await agent.put(`newsletters/${id}`)
            .body({
                newsletters: [{
                    name: 'Updated newsletter name'
                }]
            })
            .expectStatus(200)
            .matchBodySnapshot({
                newsletters: [newsletterSnapshot]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can edit a newsletters and update the sender_email when already set', async function () {
        const id = fixtureManager.get('newsletters', 0).id;

        await agent.put(`newsletters/${id}`)
            .body({
                newsletters: [{
                    name: 'Updated newsletter name',
                    sender_email: 'updated@example.com'
                }]
            })
            .expectStatus(200)
            .matchBodySnapshot({
                newsletters: [newsletterSnapshot],
                meta: {
                    sent_email_verification: ['sender_email']
                }
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });

        mockManager.assert.sentEmail({
            subject: 'Verify email address',
            to: 'updated@example.com'
        });
    });

    it('Can verify property updates', async function () {
        const cheerio = require('cheerio');

        const id = fixtureManager.get('newsletters', 0).id;

        await agent.put(`newsletters/${id}`)
            .body({
                newsletters: [{
                    name: 'Updated newsletter name',
                    sender_email: 'verify@example.com'
                }]
            })
            .expectStatus(200);

        const mailHtml = mailMocks.getCall(0).args[0].html;
        const $mailHtml = cheerio.load(mailHtml);

        const verifyUrl = new URL($mailHtml('[data-test-verify-link]').attr('href'));
        // convert Admin URL hash to native URL for easier token param extraction
        const token = (new URL(verifyUrl.hash.replace('#', ''), 'http://example.com')).searchParams.get('verifyEmail');

        await agent.put(`newsletters/verifications`)
            .body({
                token
            })
            .expectStatus(200)
            .matchBodySnapshot({
                newsletters: [newsletterSnapshot]
            });
    });
});
