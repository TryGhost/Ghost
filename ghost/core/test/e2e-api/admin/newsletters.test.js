const assert = require('assert/strict');
const sinon = require('sinon');
const {agentProvider, mockManager, fixtureManager, configUtils, dbUtils, matchers, regexes} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyObjectId, anyUuid, anyErrorId, anyISODateTime, anyLocationFor, anyNumber} = matchers;
const {queryStringToken} = regexes;
const models = require('../../../core/server/models');
const logging = require('@tryghost/logging');
const settingsHelpers = require('../../../core/server/services/settings-helpers');

const assertMemberRelationCount = async (newsletterId, expectedCount) => {
    const relations = await dbUtils.knex('members_newsletters').where({newsletter_id: newsletterId}).pluck('id');

    assert.equal(relations.length, expectedCount);
};

// Change directly in database, to test edge cases
async function editNewsletter(id, changes) {
    await dbUtils.knex('newsletters').where({id}).update(changes);
}

// Get directly from the database
async function getNewsletter(id) {
    return (await dbUtils.knex('newsletters').where({id}))[0];
}

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
    let emailMockReceiver;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        emailMockReceiver = mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
        sinon.restore();
    });

    it('Can browse newsletters', async function () {
        await agent.get('newsletters/')
            .expectStatus(200)
            .matchBodySnapshot({
                newsletters: new Array(4).fill(newsletterSnapshot)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
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
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can include members, active members & posts counts when browsing newsletters', async function () {
        await agent
            .get(`newsletters/?include=count.members,count.active_members,count.posts`)
            .expectStatus(200)
            .matchBodySnapshot({
                newsletters: new Array(4).fill(newsletterSnapshot)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can include members, active members & posts counts when reading a newsletter', async function () {
        await agent
            .get(`newsletters/${fixtureManager.get('newsletters', 0).id}/?include=count.members,count.active_members,count.posts`)
            .expectStatus(200)
            .matchBodySnapshot({
                newsletters: new Array(1).fill(newsletterSnapshot)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
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
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('newsletters')
            });

        const id = body2.newsletters[0].id;

        // Check with a database query if the header_image is saved correctly with a 'transformReady' path
        const [header_image] = await dbUtils.knex('newsletters').where('id', id).pluck('header_image');
        assert.equal(header_image, transformReadyPath);
    });

    it('Can include members, active members & posts counts when adding a newsletter', async function () {
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
            .post(`newsletters/?include=count.members,count.active_members,count.posts`)
            .body({newsletters: [newsletter]})
            .expectStatus(201)
            .matchBodySnapshot({
                newsletters: [newsletterSnapshot]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
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
                'content-version': anyContentVersion,
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
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('newsletters')
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
                'content-version': anyContentVersion,
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
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can include members, active members & posts counts when editing newsletters', async function () {
        const id = fixtureManager.get('newsletters', 0).id;
        await agent.put(`newsletters/${id}/?include=count.members,count.active_members,count.posts`)
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
                'content-version': anyContentVersion,
                etag: anyEtag
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

            sinon.stub(logging, 'error');
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

                sinon.stub(logging, 'error');
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

                sinon.stub(logging, 'error');
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
                        'content-version': anyContentVersion,
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
                        'content-version': anyContentVersion,
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
                        'content-version': anyContentVersion,
                        etag: anyEtag
                    });
            });

            it('Unarchiving a newsletter fails', async function () {
                const allNewsletters = await models.Newsletter.findAll();
                const newsletterCount = allNewsletters.filter(n => n.get('status') === 'active').length;
                assert.equal(newsletterCount, 3, 'This test expects to have 3 current active newsletters');

                const archivedNewsletter = allNewsletters.find(n => n.get('status') !== 'active');
                assert.ok(archivedNewsletter, 'This test expects to have an archived newsletter in the test fixtures');

                sinon.stub(logging, 'error');
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
                        'content-version': anyContentVersion,
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
                        'content-version': anyContentVersion,
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
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('newsletters')
            });

        sinon.stub(logging, 'error');
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
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can add a newsletter and subscribe existing members', async function () {
        const newsletter = {
            name: 'My test newsletter where I want to subscribe existing members',
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
                meta: {opted_in_member_count: 6}
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('newsletters')
            });
    });

    it(`Can't edit multiple newsletters to existing name`, async function () {
        const id = fixtureManager.get('newsletters', 0).id;

        sinon.stub(logging, 'error');
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
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    describe('Managed email without custom sending domain', function () {
        this.beforeEach(function () {
            configUtils.set('hostSettings:managedEmail:enabled', true);
            configUtils.set('hostSettings:managedEmail:sendingDomain', null);
            configUtils.set('mail:from', 'default@email.com');
        });

        describe('Auto correcting invalid domains', function () {
            const id = fixtureManager.get('newsletters', 0).id;

            beforeEach(async function () {
                // Invalid situation in the database)
                await editNewsletter(id, {
                    sender_email: 'notvalid@acme.com',
                    sender_reply_to: 'newsletter'
                });
            });

            after(async function () {
                // Reset
                await editNewsletter(id, {
                    sender_email: null,
                    sender_reply_to: 'newsletter'
                });
            });

            it('Read returns sender_email as sender_reply_to in case we cannot send from sender_email and sender_reply_to is set to newsletter', async function () {
                const {body} = await agent.get(`newsletters/${id}`)
                    .expectStatus(200)
                    .matchBodySnapshot({
                        newsletters: [newsletterSnapshot]
                    })
                    .matchHeaderSnapshot({
                        'content-version': anyContentVersion,
                        etag: anyEtag
                    });

                // Do a manual check to make sure we don't accidentally change snapshots
                assert.equal(body.newsletters[0].sender_email, null);
                assert.equal(body.newsletters[0].sender_reply_to, 'notvalid@acme.com');
            });

            it('Browse returns sender_email as sender_reply_to in case we cannot send from sender_email and sender_reply_to is set to newsletter', async function () {
                const {body} = await agent.get(`newsletters`)
                    .expectStatus(200)
                    .matchHeaderSnapshot({
                        'content-version': anyContentVersion,
                        etag: anyEtag
                    });

                const newsletter = body.newsletters.find(n => n.id === id);

                // Do a manual check to make sure we don't accidentally change snapshots
                assert.equal(newsletter.sender_email, null);
                assert.equal(newsletter.sender_reply_to, 'notvalid@acme.com');
            });

            it('Resets sender_email when editing the newsletter reply_to address', async function () {
                await agent.put(`newsletters/${id}`)
                    .body({
                        newsletters: [{
                            sender_reply_to: 'support'
                        }]
                    })
                    .expectStatus(200)
                    .matchBodySnapshot({
                        newsletters: [newsletterSnapshot]
                    })
                    .matchHeaderSnapshot({
                        'content-version': anyContentVersion,
                        etag: anyEtag
                    });

                const newsletter = await getNewsletter(id);

                // Do a manual check to make sure we don't accidentally change snapshots
                assert.equal(newsletter.sender_email, null);
                assert.equal(newsletter.sender_reply_to, 'support');
            });

            it('Resets sender_email when editing the newsletter reply_to address in combination with resetting sender email', async function () {
                await agent.put(`newsletters/${id}`)
                    .body({
                        newsletters: [{
                            sender_email: null,
                            sender_reply_to: 'something@allowed.com'
                        }]
                    })
                    .expectStatus(200)
                    .matchBodySnapshot({
                        newsletters: [newsletterSnapshot]
                    })
                    .matchHeaderSnapshot({
                        'content-version': anyContentVersion,
                        etag: anyEtag
                    });

                const newsletter = await getNewsletter(id);

                // Do a manual check to make sure we don't accidentally change snapshots
                assert.equal(newsletter.sender_email, null);
                assert.equal(newsletter.sender_reply_to, 'newsletter'); // required validation
            });

            it('Resets sender_email when editing the newsletter reply_to address in combination with keeping sender email', async function () {
                await agent.put(`newsletters/${id}`)
                    .body({
                        newsletters: [{
                            sender_email: 'notvalid@acme.com',
                            sender_reply_to: 'something@allowed.com'
                        }]
                    })
                    .expectStatus(200)
                    .matchBodySnapshot({
                        newsletters: [newsletterSnapshot]
                    })
                    .matchHeaderSnapshot({
                        'content-version': anyContentVersion,
                        etag: anyEtag
                    });

                const newsletter = await getNewsletter(id);

                // Do a manual check to make sure we don't accidentally change snapshots
                assert.equal(newsletter.sender_email, null);
                assert.equal(newsletter.sender_reply_to, 'newsletter'); // required validation
            });

            it('Can switch sender_email to sender_reply_to without validation', async function () {
                // The frontend will try to do this because it gets the mapped values from the API
                await agent.put(`newsletters/${id}`)
                    .body({
                        newsletters: [{
                            sender_email: null,
                            sender_reply_to: 'notvalid@acme.com'
                        }]
                    })
                    .expectStatus(200)
                    .matchBodySnapshot({
                        newsletters: [newsletterSnapshot]
                    })
                    .matchHeaderSnapshot({
                        'content-version': anyContentVersion,
                        etag: anyEtag
                    });

                const newsletter = await getNewsletter(id);

                // Do a manual check to make sure we don't accidentally change snapshots
                assert.equal(newsletter.sender_email, null);
                assert.equal(newsletter.sender_reply_to, 'notvalid@acme.com'); // did not require validation
            });

            it('Does not reset sender_email when editing the newsletter (not the reply-to address)', async function () {
                await agent.put(`newsletters/${id}`)
                    .body({
                        newsletters: [{
                            name: 'My changed newsletter name'
                        }]
                    })
                    .expectStatus(200)
                    .matchBodySnapshot({
                        newsletters: [newsletterSnapshot]
                    })
                    .matchHeaderSnapshot({
                        'content-version': anyContentVersion,
                        etag: anyEtag
                    });

                const newsletter = await getNewsletter(id);
                assert.equal(newsletter.name, 'My changed newsletter name');
                assert.equal(newsletter.sender_email, 'notvalid@acme.com');
                assert.equal(newsletter.sender_reply_to, 'newsletter');
            });
        });

        it('Can set newsletter reply-to to newsletter or support', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_reply_to: 'support'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_reply_to: 'newsletter'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot clear newsletter reply-to', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_reply_to: ''
                    }]
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot set newsletter reply-to to invalid email address', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_reply_to: 'notvalid'
                    }]
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Can set newsletter reply-to to any email address with required verification', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            const before = await models.Newsletter.findOne({id});
            const beforeSenderReplyTo = before.get('sender_reply_to');

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_reply_to: 'hello@acme.com'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot],
                    meta: {
                        sent_email_verification: ['sender_reply_to']
                    }
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            await before.refresh();
            assert.equal(before.get('sender_reply_to'), beforeSenderReplyTo, 'sender_reply_to should not have changed because it first requires verification');

            emailMockReceiver
                .assertSentEmailCount(1)
                .matchMetadataSnapshot()
                .matchHTMLSnapshot([{
                    pattern: queryStringToken('verifyEmail'),
                    replacement: 'verifyEmail=REPLACED_TOKEN'
                }])
                .matchPlaintextSnapshot([{
                    pattern: queryStringToken('verifyEmail'),
                    replacement: 'verifyEmail=REPLACED_TOKEN'
                }]);
        });

        it('Can set newsletter reply-to to the default address without requiring verification', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            const before = await models.Newsletter.findOne({id});
            const beforeEmail = before.get('sender_reply_to');

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_reply_to: 'default@email.com'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            // No verification
            emailMockReceiver.assertSentEmailCount(0);

            await before.refresh();
            assert.equal(before.get('sender_reply_to'), 'default@email.com');

            // Revert back
            before.set('sender_reply_to', beforeEmail);
            await before.save();
        });

        it('Cannot change sender_email', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_email: 'hello@acme.com'
                    }]
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot set newsletter sender_email to invalid email address', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_email: 'notvalid'
                    }]
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Can keep sender_email', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            // Invalid situation in the database)
            await editNewsletter(id, {
                sender_email: 'existing@acme.com',
                sender_reply_to: 'newsletter'
            });

            const before = await models.Newsletter.findOne({id});
            assert(before.get('sender_email'), 'This test requires a non empty sender_email');

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_email: before.get('sender_email')
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            // No verification
            emailMockReceiver.assertSentEmailCount(0);
        });

        it('Can set sender_email to default address', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            const before = await models.Newsletter.findOne({id});
            assert(before.get('sender_email'), 'This test requires a non empty sender_email');
            const defaultAddress = settingsHelpers.getDefaultEmail().address;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_email: defaultAddress
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            // No verification
            emailMockReceiver.assertSentEmailCount(0);
        });

        it('Can clear sender_email', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            const before = await models.Newsletter.findOne({id});
            const beforeEmail = before.get('sender_email');
            assert(before.get('sender_email'), 'This test requires a non empty sender_email');

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_email: ''
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            // No verification
            emailMockReceiver.assertSentEmailCount(0);

            // Revert back
            await before.refresh();
            before.set('sender_email', beforeEmail);
            await before.save();
        });
    });

    describe('Managed email with custom sending domain', function () {
        this.beforeEach(function () {
            configUtils.set('hostSettings:managedEmail:enabled', true);
            configUtils.set('hostSettings:managedEmail:sendingDomain', 'sendingdomain.com');
        });

        describe('Auto correcting invalid domains', function () {
            const id = fixtureManager.get('newsletters', 0).id;

            beforeEach(async function () {
                // Invalid situation in the database)
                await editNewsletter(id, {
                    sender_email: 'notvalid@acme.com',
                    sender_reply_to: 'newsletter'
                });
            });

            after(async function () {
                // Reset
                await editNewsletter(id, {
                    sender_email: null,
                    sender_reply_to: 'newsletter'
                });
            });

            it('Read returns sender_email as sender_reply_to in case we cannot send from sender_email and sender_reply_to is set to newsletter', async function () {
                const {body} = await agent.get(`newsletters/${id}`)
                    .expectStatus(200)
                    .matchBodySnapshot({
                        newsletters: [newsletterSnapshot]
                    })
                    .matchHeaderSnapshot({
                        'content-version': anyContentVersion,
                        etag: anyEtag
                    });

                // Do a manual check to make sure we don't accidentally change snapshots
                assert.equal(body.newsletters[0].sender_email, null);
                assert.equal(body.newsletters[0].sender_reply_to, 'notvalid@acme.com');
            });

            it('Browse returns sender_email as sender_reply_to in case we cannot send from sender_email and sender_reply_to is set to newsletter', async function () {
                const {body} = await agent.get(`newsletters`)
                    .expectStatus(200)
                    .matchHeaderSnapshot({
                        'content-version': anyContentVersion,
                        etag: anyEtag
                    });

                const newsletter = body.newsletters.find(n => n.id === id);

                // Do a manual check to make sure we don't accidentally change snapshots
                assert.equal(newsletter.sender_email, null);
                assert.equal(newsletter.sender_reply_to, 'notvalid@acme.com');
            });

            it('Resets sender_email when editing the newsletter reply_to address', async function () {
                await agent.put(`newsletters/${id}`)
                    .body({
                        newsletters: [{
                            sender_reply_to: 'support'
                        }]
                    })
                    .expectStatus(200)
                    .matchBodySnapshot({
                        newsletters: [newsletterSnapshot]
                    })
                    .matchHeaderSnapshot({
                        'content-version': anyContentVersion,
                        etag: anyEtag
                    });

                const newsletter = await getNewsletter(id);

                // Do a manual check to make sure we don't accidentally change snapshots
                assert.equal(newsletter.sender_email, null);
                assert.equal(newsletter.sender_reply_to, 'support');
            });

            it('Does not reset sender_email when editing the newsletter (not the reply-to address)', async function () {
                await agent.put(`newsletters/${id}`)
                    .body({
                        newsletters: [{
                            name: 'My changed newsletter name'
                        }]
                    })
                    .expectStatus(200)
                    .matchBodySnapshot({
                        newsletters: [newsletterSnapshot]
                    })
                    .matchHeaderSnapshot({
                        'content-version': anyContentVersion,
                        etag: anyEtag
                    });

                const newsletter = await getNewsletter(id);
                assert.equal(newsletter.name, 'My changed newsletter name');
                assert.equal(newsletter.sender_email, 'notvalid@acme.com');
                assert.equal(newsletter.sender_reply_to, 'newsletter');
            });
        });

        it('Can set newsletter reply-to to newsletter or support', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_reply_to: 'support'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_reply_to: 'newsletter'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot clear newsletter reply-to', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_reply_to: ''
                    }]
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot set newsletter reply-to to invalid email address', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_reply_to: 'notvalid'
                    }]
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Can set newsletter reply-to to any email address with required verification', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            const before = await models.Newsletter.findOne({id});
            const beforeSenderReplyTo = before.get('sender_reply_to');

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_reply_to: 'hello@acme.com'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot],
                    meta: {
                        sent_email_verification: ['sender_reply_to']
                    }
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            await before.refresh();
            assert.equal(before.get('sender_reply_to'), beforeSenderReplyTo, 'sender_reply_to should not have changed because it first requires verification');

            emailMockReceiver
                .assertSentEmailCount(1)
                .matchMetadataSnapshot()
                .matchHTMLSnapshot([{
                    pattern: queryStringToken('verifyEmail'),
                    replacement: 'verifyEmail=REPLACED_TOKEN'
                }])
                .matchPlaintextSnapshot([{
                    pattern: queryStringToken('verifyEmail'),
                    replacement: 'verifyEmail=REPLACED_TOKEN'
                }]);
        });

        it('Can set newsletter reply-to to matching sending domain without required verification', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_reply_to: 'anything@sendingdomain.com'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            const before = await models.Newsletter.findOne({id});
            assert.equal(before.get('sender_reply_to'), 'anything@sendingdomain.com');

            emailMockReceiver
                .assertSentEmailCount(0);
        });

        it('Cannot change sender_email to non matching domain', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_email: 'hello@acme.com'
                    }]
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot set newsletter sender_email to invalid email address', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_email: 'notvalid'
                    }]
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Can keep sender_email', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            // Invalid situation in the database)
            await editNewsletter(id, {
                sender_email: 'existing@acme.com',
                sender_reply_to: 'newsletter'
            });

            const before = await models.Newsletter.findOne({id});
            assert(before.get('sender_email'), 'This test requires a non empty sender_email');

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_email: before.get('sender_email')
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Can set sender_email to address matching sending domain, without verification', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_email: 'anything@sendingdomain.com'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            const before = await models.Newsletter.findOne({id});
            assert.equal(before.get('sender_email'), 'anything@sendingdomain.com');

            emailMockReceiver
                .assertSentEmailCount(0);
        });

        it('Can clear sender_email', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            const before = await models.Newsletter.findOne({id});
            const beforeEmail = before.get('sender_email');
            assert(before.get('sender_email'), 'This test requires a non empty sender_email');

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_email: ''
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            // Revert back
            await before.refresh();
            before.set('sender_email', beforeEmail);
            await before.save();
        });
    });

    describe('Self hoster without managed email', function () {
        this.beforeEach(function () {
            configUtils.set('hostSettings:managedEmail:enabled', false);
            configUtils.set('hostSettings:managedEmail:sendingDomain', '');
        });

        it('Can set newsletter reply-to to newsletter or support', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_reply_to: 'support'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_reply_to: 'newsletter'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot clear newsletter reply-to', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_reply_to: ''
                    }]
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot set newsletter reply-to to invalid email address', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_reply_to: 'notvalid'
                    }]
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Can set newsletter reply-to to any email address without required verification', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_reply_to: 'hello@acme.com'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            const before = await models.Newsletter.findOne({id});
            assert.equal(before.get('sender_reply_to'), 'hello@acme.com');

            emailMockReceiver
                .assertSentEmailCount(0);
        });

        it('Can change sender_email to any address without verification', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_email: 'hello@acme.com'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            const before = await models.Newsletter.findOne({id});
            assert.equal(before.get('sender_email'), 'hello@acme.com');

            emailMockReceiver
                .assertSentEmailCount(0);
        });

        it('Cannot set newsletter sender_email to invalid email address', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_email: 'notvalid'
                    }]
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Can clear sender_email', async function () {
            const id = fixtureManager.get('newsletters', 0).id;

            const before = await models.Newsletter.findOne({id});
            const beforeEmail = before.get('sender_email');
            assert(before.get('sender_email'), 'This test requires a non empty sender_email');

            await agent.put(`newsletters/${id}`)
                .body({
                    newsletters: [{
                        sender_email: ''
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    newsletters: [newsletterSnapshot]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            // Revert back
            await before.refresh();
            before.set('sender_email', beforeEmail);
            await before.save();
        });
    });
});
