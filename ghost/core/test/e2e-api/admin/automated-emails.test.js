const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyObjectId, anyISODateTime, anyErrorId, anyEtag, anyLocationFor} = matchers;

const matchAutomatedEmail = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

describe('Automated Emails API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsOwner();
    });

    it('Can browse with no automated emails', async function () {
        await agent
            .get('automated_emails')
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can add an automated email', async function () {
        await agent
            .post('automated_emails')
            .body({automated_emails: [{
                name: 'member-welcome-email',
                status: 'inactive',
                subject: 'Welcome to the site!',
                lexical: JSON.stringify({root: {children: []}})
            }]})
            .expectStatus(201)
            .matchBodySnapshot({
                automated_emails: [matchAutomatedEmail]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('automated_emails')
            });
    });

    it('Can browse automated emails', async function () {
        await agent
            .get('automated_emails')
            .expectStatus(200)
            .matchBodySnapshot({
                automated_emails: [matchAutomatedEmail]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can read an automated email by id', async function () {
        const {body} = await agent
            .get('automated_emails')
            .expectStatus(200);

        const id = body.automated_emails[0].id;

        await agent
            .get(`automated_emails/${id}`)
            .expectStatus(200)
            .matchBodySnapshot({
                automated_emails: [matchAutomatedEmail]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can edit an automated email', async function () {
        const {body} = await agent
            .get('automated_emails')
            .expectStatus(200);

        const id = body.automated_emails[0].id;

        await agent
            .put(`automated_emails/${id}`)
            .body({automated_emails: [{
                subject: 'Updated subject',
                status: 'active'
            }]})
            .expectStatus(200)
            .matchBodySnapshot({
                automated_emails: [matchAutomatedEmail]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Validates status on add', async function () {
        await agent
            .post('automated_emails')
            .body({automated_emails: [{
                name: 'member-welcome-email',
                status: 'invalid-status',
                subject: 'Test'
            }]})
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

    it('Validates name on add', async function () {
        await agent
            .post('automated_emails')
            .body({automated_emails: [{
                name: 'invalid-name',
                status: 'active',
                subject: 'Test'
            }]})
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

    it('Validates lexical is valid JSON on add', async function () {
        await agent
            .post('automated_emails')
            .body({automated_emails: [{
                name: 'member-welcome-email',
                status: 'active',
                subject: 'Test',
                lexical: 'not-valid-json'
            }]})
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

    it('Validates status on edit', async function () {
        const {body} = await agent
            .get('automated_emails')
            .expectStatus(200);

        const id = body.automated_emails[0].id;

        await agent
            .put(`automated_emails/${id}`)
            .body({automated_emails: [{
                status: 'invalid-status'
            }]})
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

    it('Validates name on edit', async function () {
        const {body} = await agent
            .get('automated_emails')
            .expectStatus(200);

        const id = body.automated_emails[0].id;

        await agent
            .put(`automated_emails/${id}`)
            .body({automated_emails: [{
                name: 'invalid-name'
            }]})
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

    it('Validates lexical is valid JSON on edit', async function () {
        const {body} = await agent
            .get('automated_emails')
            .expectStatus(200);

        const id = body.automated_emails[0].id;

        await agent
            .put(`automated_emails/${id}`)
            .body({automated_emails: [{
                lexical: 'not-valid-json'
            }]})
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

    it('Can destroy an automated email', async function () {
        const {body} = await agent
            .get('automated_emails')
            .expectStatus(200);

        const id = body.automated_emails[0].id;

        await agent
            .delete(`automated_emails/${id}`)
            .expectStatus(204)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Cannot destroy non-existent automated email', async function () {
        await agent
            .delete('automated_emails/abcd1234abcd1234abcd1234')
            .expectStatus(404)
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

    describe('Permissions', function () {
        it('Cannot access automated emails as editor', async function () {
            await agent.loginAsEditor();

            await agent
                .get('automated_emails')
                .expectStatus(403)
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

        it('Cannot access automated emails as author', async function () {
            await agent.loginAsAuthor();

            await agent
                .get('automated_emails')
                .expectStatus(403)
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

        it('Cannot access automated emails as contributor', async function () {
            await agent.loginAsContributor();

            await agent
                .get('automated_emails')
                .expectStatus(403)
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
    });
});
