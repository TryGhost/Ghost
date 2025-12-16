const {agentProvider, fixtureManager, matchers, dbUtils} = require('../../utils/e2e-framework');
const {anyContentVersion, anyObjectId, anyISODateTime, anyErrorId, anyEtag, anyLocationFor} = matchers;
const sinon = require('sinon');
const mailService = require('../../../core/server/services/mail');

const matchAutomatedEmail = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

describe('Automated Emails API', function () {
    let agent;

    const createAutomatedEmail = async (overrides = {}) => {
        const {body} = await agent
            .post('automated_emails')
            .body({automated_emails: [{
                name: 'Welcome Email (Free)',
                slug: 'member-welcome-email-free',
                status: 'inactive',
                subject: 'Welcome to the site!',
                lexical: JSON.stringify({root: {children: []}}),
                ...overrides
            }]})
            .expectStatus(201);
        return body.automated_emails[0];
    };

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsOwner();
    });

    beforeEach(async function () {
        await dbUtils.truncate('brute');
        await dbUtils.truncate('automated_emails');
    });

    describe('Browse', function () {
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

        it('Can browse automated emails', async function () {
            await createAutomatedEmail();

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
    });

    describe('Read', function () {
        it('Can read an automated email by id', async function () {
            const automatedEmail = await createAutomatedEmail();

            const id = automatedEmail.id;

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
    });

    describe('Add', function () {
        it('Can add an automated email', async function () {
            await agent
                .post('automated_emails')
                .body({automated_emails: [{
                    name: 'Welcome Email (Free)',
                    slug: 'member-welcome-email-free',
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

        it('Validates status on add', async function () {
            await agent
                .post('automated_emails')
                .body({automated_emails: [{
                    name: 'Welcome Email (Free)',
                    slug: 'member-welcome-email-free',
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
                    name: 'Welcome Email (Free)',
                    slug: 'member-welcome-email-free',
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
    });

    describe('Edit', function () {
        it('Can edit an automated email', async function () {
            const automatedEmail = await createAutomatedEmail();

            const id = automatedEmail.id;

            await agent
                .put(`automated_emails/${id}`)
                .body({automated_emails: [{
                    name: 'Welcome Email (Free)',
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

        it('Validates status on edit', async function () {
            const automatedEmail = await createAutomatedEmail();

            const id = automatedEmail.id;

            await agent
                .put(`automated_emails/${id}`)
                .body({automated_emails: [{
                    name: 'Welcome Email (Free)',
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

        it('Validates name is required on edit', async function () {
            const automatedEmail = await createAutomatedEmail();

            const id = automatedEmail.id;

            await agent
                .put(`automated_emails/${id}`)
                .body({automated_emails: [{
                    subject: 'Updated subject'
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

        it('Validates name value on edit', async function () {
            const automatedEmail = await createAutomatedEmail();

            const id = automatedEmail.id;

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
            const automatedEmail = await createAutomatedEmail();

            const id = automatedEmail.id;

            await agent
                .put(`automated_emails/${id}`)
                .body({automated_emails: [{
                    name: 'Welcome Email (Free)',
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
    });

    describe('Destroy', function () {
        it('Can destroy an automated email', async function () {
            const automatedEmail = await createAutomatedEmail();

            const id = automatedEmail.id;

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
    });

    describe('SendTestEmail', function () {
        let automatedEmailId;

        const validLexical = JSON.stringify({
            root: {
                children: [{
                    type: 'paragraph',
                    children: [{
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text: 'Welcome!',
                        type: 'text',
                        version: 1
                    }],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    version: 1
                }],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        });

        beforeEach(async function () {
            sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail sent');
            await agent.loginAsOwner();
            const automatedEmail = await createAutomatedEmail({
                status: 'active',
                lexical: validLexical
            });
            automatedEmailId = automatedEmail.id;
        });

        afterEach(function () {
            sinon.restore();
        });

        it('Can send test email', async function () {
            await agent
                .post(`automated_emails/${automatedEmailId}/test/`)
                .body({
                    email: 'test@ghost.org',
                    subject: 'Test Subject',
                    lexical: validLexical
                })
                .expectStatus(204)
                .expectEmptyBody()
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot send test email for non-existent automated email', async function () {
            await agent
                .post('automated_emails/abcd1234abcd1234abcd1234/test/')
                .body({
                    email: 'test@ghost.org',
                    subject: 'Test Subject',
                    lexical: validLexical
                })
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

        it('Cannot send test email without email in body', async function () {
            await agent
                .post(`automated_emails/${automatedEmailId}/test/`)
                .body({})
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

        it('Cannot send test email with invalid email format', async function () {
            await agent
                .post(`automated_emails/${automatedEmailId}/test/`)
                .body({
                    email: 'not-a-valid-email',
                    subject: 'Test Subject',
                    lexical: validLexical
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

        it('Cannot send test email without subject', async function () {
            await agent
                .post(`automated_emails/${automatedEmailId}/test/`)
                .body({
                    email: 'test@ghost.org',
                    lexical: validLexical
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

        it('Cannot send test email without lexical', async function () {
            await agent
                .post(`automated_emails/${automatedEmailId}/test/`)
                .body({
                    email: 'test@ghost.org',
                    subject: 'Test Subject'
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
