const assert = require('assert');
const {agentProvider, mockManager, fixtureManager, configUtils, dbUtils, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyUuid, anyISODateTime, anyLocationFor, anyNumber} = matchers;
const models = require('../../../core/server/models');

const assertMemberRelationCount = async (newsletterId, expectedCount) => {
    const relations = await dbUtils.knex('members_newsletters').where({newsletter_id: newsletterId}).pluck('id');

    assert.equal(relations.length, expectedCount);
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
    sort_order: anyNumber
};

describe('Newsletters API', function () {
    let agent;
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
        const siteUrl = configUtils.config.getSiteUrl();
        const relativePath = 'content/images/2022/05/cover-image.jpg';
        const absolutePath = siteUrl + relativePath;
        const transformReadyPath = '__GHOST_URL__/' + relativePath;
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
                assert.equal(body.newsletters[0].header_image, absolutePath);
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('newsletters')
            });

        const id = body2.newsletters[0].id;

        // Check with a database query if the header_image is saved correctly with a 'transformReady' path
        const [header_image] = await dbUtils.knex('newsletters').where('id', id).pluck('header_image');
        assert.equal(header_image, transformReadyPath);
    });

    it('Can include members & posts counts when adding a newsletter', async function () {
        const newsletter = {
            name: 'My test newsletter 2',
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
            .post(`newsletters/?include=count.members,count.posts`)
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

    it('Can include members & posts counts when editing newsletters', async function () {
        const id = fixtureManager.get('newsletters', 0).id;
        await agent.put(`newsletters/${id}/?include=count.members,count.posts`)
            .body({
                newsletters: [{
                    name: 'Updated newsletter name 2'
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
        after(function () {
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

        describe('Max limit', function () {
            before(async function () {
                configUtils.set('hostSettings:limits', {
                    newsletters: {
                        max: 3,
                        error: 'Your plan supports up to {{max}} newsletters. Please upgrade to add more.'
                    }
                });
    
                agent = await agentProvider.getAdminAPIAgent();
                await fixtureManager.init('newsletters', 'members:newsletters');
                await agent.loginAsOwner();
            });

            it('Adding newsletter fails', async function () {
                const allNewsletters = await models.Newsletter.findAll();
                const newsletterCount = allNewsletters.filter(n => n.get('status') === 'active').length;
                assert.equal(newsletterCount, 3, 'This test expects to have 3 current active newsletters');
    
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
                    })
                    .expect(({body}) => {
                        assert.equal(body.errors[0].context, 'Your plan supports up to 3 newsletters. Please upgrade to add more.');
                    });
            });

            it('Adding newsletter fails without transaction', async function () {
                const allNewsletters = await models.Newsletter.findAll();
                const newsletterCount = allNewsletters.filter(n => n.get('status') === 'active').length;
                assert.equal(newsletterCount, 3, 'This test expects to have 3 current active newsletters');
    
                const newsletter = {
                    name: 'Naughty newsletter'
                };
    
                // Note that ?opt_in_existing=true will trigger a transaction, so we explicitly test here without a
                // transaction
                await agent
                    .post(`newsletters/`)
                    .body({newsletters: [newsletter]})
                    .expectStatus(403)
                    .matchBodySnapshot({
                        errors: [{
                            id: anyUuid
                        }]
                    })
                    .expect(({body}) => {
                        assert.equal(body.errors[0].context, 'Your plan supports up to 3 newsletters. Please upgrade to add more.');
                    });
            });

            it('Adding an archived newsletter doesn\'t fail', async function () {
                const allNewsletters = await models.Newsletter.findAll();
                const newsletterCount = allNewsletters.filter(n => n.get('status') === 'active').length;
                assert.equal(newsletterCount, 3, 'This test expects to have 3 current active newsletters');
    
                const newsletter = {
                    name: 'Archived newsletter',
                    status: 'archived'
                };
    
                await agent
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
            });

            it('Editing an active newsletter doesn\'t fail', async function () {
                const allNewsletters = await models.Newsletter.findAll();
                const newsletterCount = allNewsletters.filter(n => n.get('status') === 'active').length;
                assert.equal(newsletterCount, 3, 'This test expects to have 3 current active newsletters');
    
                const activeNewsletter = allNewsletters.find(n => n.get('status') !== 'active');
                assert.ok(activeNewsletter, 'This test expects to have an active newsletter in the test fixtures');
    
                const id = activeNewsletter.id;
                await agent.put(`newsletters/${id}`)
                    .body({
                        newsletters: [{
                            name: 'Updated active newsletter name'
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
    
            it('Editing an archived newsletter doesn\'t fail', async function () {
                const allNewsletters = await models.Newsletter.findAll();
                const newsletterCount = allNewsletters.filter(n => n.get('status') === 'active').length;
                assert.equal(newsletterCount, 3, 'This test expects to have 3 current active newsletters');
    
                const archivedNewsletter = allNewsletters.find(n => n.get('status') !== 'active');
                assert.ok(archivedNewsletter, 'This test expects to have an archived newsletter in the test fixtures');
    
                const id = archivedNewsletter.id;
                await agent.put(`newsletters/${id}`)
                    .body({
                        newsletters: [{
                            name: 'Updated archived newsletter name'
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
    
            it('Unarchiving a newsletter fails', async function () {
                const allNewsletters = await models.Newsletter.findAll();
                const newsletterCount = allNewsletters.filter(n => n.get('status') === 'active').length;
                assert.equal(newsletterCount, 3, 'This test expects to have 3 current active newsletters');
    
                const archivedNewsletter = allNewsletters.find(n => n.get('status') !== 'active');
                assert.ok(archivedNewsletter, 'This test expects to have an archived newsletter in the test fixtures');
    
                const id = archivedNewsletter.id;
                await agent.put(`newsletters/${id}`)
                    .body({
                        newsletters: [{
                            status: 'active'
                        }]
                    })
                    .expectStatus(403)
                    .matchBodySnapshot({
                        errors: [{
                            id: anyUuid
                        }]
                    })
                    .expect(({body}) => {
                        assert.equal(body.errors[0].context, 'Your plan supports up to 3 newsletters. Please upgrade to add more.');
                    });
            });

            it('Archiving a newsletter doesn\'t fail', async function () {
                const allNewsletters = await models.Newsletter.findAll();
                const newsletterCount = allNewsletters.filter(n => n.get('status') === 'active').length;
                assert.equal(newsletterCount, 3, 'This test expects to have 3 current active newsletters');
    
                const activeNewsletter = allNewsletters.find(n => n.get('status') === 'active');
    
                const id = activeNewsletter.id;
                await agent.put(`newsletters/${id}`)
                    .body({
                        newsletters: [{
                            status: 'archived'
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

            it('Adding a newsletter now doesn\'t fail', async function () {
                const allNewsletters = await models.Newsletter.findAll();
                const newsletterCount = allNewsletters.filter(n => n.get('status') === 'active').length;
                assert.equal(newsletterCount, 2, 'This test expects to have 2 current active newsletters');
        
                const newsletter = {
                    name: 'Naughty newsletter'
                };

                await agent
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
            });
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

    it('Can add a newsletter - with custom sender_email and subscribe existing members', async function () {
        if (dbUtils.isSQLite()) {
            // This breaks snapshot tests if you don't update snapshot tests on MySQL + make sure this is the last ADD test
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
