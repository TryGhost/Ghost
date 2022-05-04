const DatabaseInfo = require('@tryghost/database-info');
const {any} = require('@tryghost/express-test').snapshot;
const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyUuid, anyISODateTime, anyLocationFor} = matchers;
const configUtils = require('../../utils/configUtils');
const uuid = require('uuid');
const urlUtils = require('../../../core/shared/url-utils');
const db = require('../../../core/server/data/db');
const knex = db.knex;
require('should');

const assert = require('assert');

const models = require('../../../core/server/models');

const assertMemberRelationCount = async (newsletterId, expectedCount) => {
    const newsletter = await models.Newsletter.findOne({id: newsletterId}, {withRelated: 'members'});

    assert.equal(newsletter.related('members').length, expectedCount);
};

const newsletterSnapshot = {
    id: anyObjectId,
    uuid: anyUuid,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

const newsletterSnapshotWithoutSortOrder = {
    id: anyObjectId,
    uuid: anyUuid,
    created_at: anyISODateTime,
    updated_at: anyISODateTime,
    sort_order: any(Number)
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
            .get(`newsletters/${fixtureManager.get('newsletters', 0).id}/`)
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
            .get(`newsletters/${fixtureManager.get('newsletters', 0).id}/?include=count.members,count.posts`)
            .expectStatus(200)
            .matchBodySnapshot({
                newsletters: new Array(1).fill(newsletterSnapshot)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can add a newsletter', async function () {
        const siteUrl = urlUtils.getSiteUrl();
        const relativePath = 'content/images/2022/05/cover-image.jpg';
        const absolutePath = siteUrl + relativePath;
        const transformReadyPath = '__GHOST_URL__/' + relativePath;
        const newsletter = {
            uuid: uuid.v4(),
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
            sort_order: 0,
            header_image: absolutePath
        };

        const {body: body2} = await agent
            .post(`newsletters/`)
            .body({newsletters: [newsletter]})
            .expectStatus(201)
            .matchBodySnapshot({
                newsletters: [newsletterSnapshot]
            })
            .expect(({body}) => {
                // Should still be absolute
                body.newsletters[0].header_image.should.equal(absolutePath);
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('newsletters')
            });

        const id = body2.newsletters[0].id;

        // Check with a database query if the header_image is saved correctly with a 'transformReady' path
        const [header_image] = await knex('newsletters').where('id', id).pluck('header_image');
        header_image.should.equal(transformReadyPath);
    });

    it('Can add multiple newsletters', async function () {
        const firstNewsletter = {
            name: 'My first test newsletter'
        };

        const secondNewsletter = {
            name: 'My second test newsletter'
        };

        await agent
            .post(`newsletters/`)
            .body({newsletters: [firstNewsletter]})
            .expectStatus(201)
            .matchBodySnapshot({
                newsletters: [newsletterSnapshot]
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('newsletters')
            });

        await agent
            .post(`newsletters/`)
            .body({newsletters: [secondNewsletter]})
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
            uuid: uuid.v4(),
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
            uuid: uuid.v4(),
            name: 'New newsletter with existing members subscribed',
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
                location: anyLocationFor('newsletters')
            });

        // Assert that the newsletter has 6 related members in the DB
        await assertMemberRelationCount(body.newsletters[0].id, 6);
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

    describe('Host Settings: newsletter limits', function () {
        afterEach(function () {
            configUtils.set('hostSettings:limits', undefined);
        });

        it('Request fails when newsletter limit is in place', async function () {
            configUtils.set('hostSettings:limits', {
                newsletters: {
                    disabled: true,
                    error: 'Nuh uh'
                }
            });

            agent = await agentProvider.getAdminAPIAgent();
            await fixtureManager.init('newsletters', 'members:newsletters');
            await agent.loginAsOwner();

            const newsletter = {
                name: 'Naughty newsletter'
            };

            await agent
                .post(`newsletters/?opt_in_existing=true`)
                .body({newsletters: [newsletter]})
                .expectStatus(403)
                .matchBodySnapshot({
                    errors: [{
                        id: anyUuid
                    }]
                });
        });
    });

    it('Can add a newsletter - with custom sender_email and subscribe existing members', async function () {
        const db = require('../../../core/server/data/db');
        if (DatabaseInfo.isSQLite(db.knex)) {
            return;
        }
        const newsletter = {
            name: 'My test newsletter with custom sender_email and subscribe existing',
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
            .post(`newsletters/?opt_in_existing=true`)
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

    it(`Can't add multiple newsletters with same name`, async function () {
        const firstNewsletter = {
            name: 'Duplicate newsletter'
        };

        const secondNewsletter = {...firstNewsletter};

        await agent
            .post(`newsletters/`)
            .body({newsletters: [firstNewsletter]})
            .expectStatus(201)
            .matchBodySnapshot({
                newsletters: [newsletterSnapshotWithoutSortOrder]
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('newsletters')
            });

        await agent
            .post(`newsletters/`)
            .body({newsletters: [secondNewsletter]})
            .expectStatus(422)
            .matchBodySnapshot({
                errors: [{
                    id: anyUuid,
                    message: 'Validation error, cannot save newsletter.',
                    context: 'A newsletter with the same name already exists'
                }]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it(`Can't edit multiple newsletters to existing name`, async function () {
        const id = fixtureManager.get('newsletters', 0).id;

        await agent.put(`newsletters/${id}`)
            .body({
                newsletters: [{
                    name: 'Duplicate newsletter'
                }]
            })
            .expectStatus(422)
            .matchBodySnapshot({
                errors: [{
                    id: anyUuid,
                    message: 'Validation error, cannot edit newsletter.',
                    context: 'A newsletter with the same name already exists'
                }]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });
});
