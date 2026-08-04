const {agentProvider, fixtureManager, matchers, dbUtils} = require('../../utils/e2e-framework');
const {anyContentVersion, anyObjectId, anyISODateTime, anyErrorId, anyEtag, anyLocationFor} = matchers;
const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const mailService = require('../../../core/server/services/mail');
const SingleUseTokenProvider = require('../../../core/server/services/members/single-use-token-provider');
const emailAddressService = require('../../../core/server/services/email-address');
const models = require('../../../core/server/models');

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
                name: 'Free member welcome flow',
                slug: 'member-welcome-email-free',
                status: 'inactive',
                subject: 'Welcome to the site!',
                lexical: JSON.stringify({root: {children: []}}),
                ...overrides
            }]})
            .expectStatus(201);
        return body.automated_emails[0];
    };

    const getSenderStorage = async (automatedEmailId) => {
        const email = await models.Base.knex('welcome_email_automated_emails')
            .where('welcome_email_automation_id', automatedEmailId)
            .first('sender_name', 'sender_email', 'sender_reply_to', 'email_design_setting_id');

        const designSettings = await models.Base.knex('email_design_settings')
            .where('id', email.email_design_setting_id)
            .first('sender_name', 'sender_email', 'sender_reply_to');

        return {email, designSettings};
    };

    const updateSenderStorage = async (automatedEmailId, {email = {}, designSettings = {}} = {}) => {
        const welcomeEmail = await models.Base.knex('welcome_email_automated_emails')
            .where('welcome_email_automation_id', automatedEmailId)
            .first('id', 'email_design_setting_id');

        if (Object.keys(email).length > 0) {
            await models.Base.knex('welcome_email_automated_emails')
                .where('id', welcomeEmail.id)
                .update(email);
        }

        if (Object.keys(designSettings).length > 0) {
            await models.Base.knex('email_design_settings')
                .where('id', welcomeEmail.email_design_setting_id)
                .update(designSettings);
        }
    };

    beforeAll(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsOwner();
    });

    beforeEach(async function () {
        await dbUtils.truncate('brute');
        await dbUtils.truncate('welcome_email_automated_emails');
        await dbUtils.truncate('automations');
        await models.Base.knex('email_design_settings')
            .where('slug', 'default-automated-email')
            .update({
                sender_name: null,
                sender_email: null,
                sender_reply_to: null
            });
    });

    afterEach(function () {
        sinon.restore();
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

        it('Returns sender details from email design settings before welcome email automated email fields', async function () {
            const automatedEmail = await createAutomatedEmail();
            await updateSenderStorage(automatedEmail.id, {
                email: {
                    sender_name: 'Welcome Sender',
                    sender_email: 'welcome@example.com',
                    sender_reply_to: 'welcome-reply@example.com'
                },
                designSettings: {
                    sender_name: 'Design Sender',
                    sender_email: 'design@example.com',
                    sender_reply_to: 'design-reply@example.com'
                }
            });

            await agent
                .get('automated_emails')
                .expectStatus(200)
                .expect(({body}) => {
                    assert.equal(body.automated_emails[0].sender_name, 'Design Sender');
                    assert.equal(body.automated_emails[0].sender_email, 'design@example.com');
                    assert.equal(body.automated_emails[0].sender_reply_to, 'design-reply@example.com');
                });
        });

        it('Does not return welcome email sender details when email design sender details are empty', async function () {
            const automatedEmail = await createAutomatedEmail();
            await updateSenderStorage(automatedEmail.id, {
                email: {
                    sender_name: 'Welcome Sender',
                    sender_email: 'welcome@example.com',
                    sender_reply_to: 'welcome-reply@example.com'
                },
                designSettings: {
                    sender_name: null,
                    sender_email: null,
                    sender_reply_to: null
                }
            });

            await agent
                .get('automated_emails')
                .expectStatus(200)
                .expect(({body}) => {
                    assert.equal(body.automated_emails[0].sender_name, null);
                    assert.equal(body.automated_emails[0].sender_email, null);
                    assert.equal(body.automated_emails[0].sender_reply_to, null);
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

        it('Returns sender details from email design settings before welcome email automated email fields', async function () {
            const automatedEmail = await createAutomatedEmail();
            await updateSenderStorage(automatedEmail.id, {
                email: {
                    sender_name: 'Welcome Sender',
                    sender_email: 'welcome@example.com',
                    sender_reply_to: 'welcome-reply@example.com'
                },
                designSettings: {
                    sender_name: 'Design Sender',
                    sender_email: 'design@example.com',
                    sender_reply_to: 'design-reply@example.com'
                }
            });

            await agent
                .get(`automated_emails/${automatedEmail.id}`)
                .expectStatus(200)
                .expect(({body}) => {
                    assert.equal(body.automated_emails[0].sender_name, 'Design Sender');
                    assert.equal(body.automated_emails[0].sender_email, 'design@example.com');
                    assert.equal(body.automated_emails[0].sender_reply_to, 'design-reply@example.com');
                });
        });

        it('Does not return welcome email sender details when email design sender details are empty', async function () {
            const automatedEmail = await createAutomatedEmail();
            await updateSenderStorage(automatedEmail.id, {
                email: {
                    sender_name: 'Welcome Sender',
                    sender_email: 'welcome@example.com',
                    sender_reply_to: 'welcome-reply@example.com'
                },
                designSettings: {
                    sender_name: null,
                    sender_email: null,
                    sender_reply_to: null
                }
            });

            await agent
                .get(`automated_emails/${automatedEmail.id}`)
                .expectStatus(200)
                .expect(({body}) => {
                    assert.equal(body.automated_emails[0].sender_name, null);
                    assert.equal(body.automated_emails[0].sender_email, null);
                    assert.equal(body.automated_emails[0].sender_reply_to, null);
                });
        });
    });

    describe('Add', function () {
        it('Can add an automated email', async function () {
            await agent
                .post('automated_emails')
                .body({automated_emails: [{
                    name: 'Free member welcome flow',
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

        it('Writes sender settings to email design settings on add', async function () {
            const automatedEmail = await createAutomatedEmail({
                sender_name: 'Custom Sender',
                sender_email: 'sender@example.com',
                sender_reply_to: 'reply@example.com'
            });

            const {email, designSettings} = await getSenderStorage(automatedEmail.id);

            assert.deepEqual({
                sender_name: email.sender_name,
                sender_email: email.sender_email,
                sender_reply_to: email.sender_reply_to
            }, {
                sender_name: null,
                sender_email: null,
                sender_reply_to: null
            });
            assert.deepEqual(designSettings, {
                sender_name: 'Custom Sender',
                sender_email: 'sender@example.com',
                sender_reply_to: 'reply@example.com'
            });
        });

        it('Rejects disallowed sender email on add', async function () {
            emailAddressService.init();
            const validateStub = sinon.stub(emailAddressService.service, 'validate')
                .returns({allowed: false, verificationEmailRequired: false});

            await agent
                .post('automated_emails')
                .body({automated_emails: [{
                    name: 'Free member welcome flow',
                    slug: 'member-welcome-email-free',
                    status: 'inactive',
                    subject: 'Welcome to the site!',
                    lexical: JSON.stringify({root: {children: []}}),
                    sender_name: 'Custom Sender',
                    sender_email: 'sender@example.com',
                    sender_reply_to: 'reply@example.com'
                }]})
                .expectStatus(422);

            sinon.assert.calledOnceWithExactly(validateStub, 'sender@example.com', 'from');

            const designSettings = await models.Base.knex('email_design_settings')
                .where('slug', 'default-automated-email')
                .first('sender_name', 'sender_email', 'sender_reply_to');

            assert.deepEqual(designSettings, {
                sender_name: null,
                sender_email: null,
                sender_reply_to: null
            });
        });

        it('Rejects sender reply-to that requires verification on add', async function () {
            emailAddressService.init();
            const validateStub = sinon.stub(emailAddressService.service, 'validate')
                .callsFake((email, type) => {
                    if (email === 'reply@example.com' && type === 'replyTo') {
                        return {allowed: true, verificationEmailRequired: true};
                    }

                    return {allowed: true, verificationEmailRequired: false};
                });

            await agent
                .post('automated_emails')
                .body({automated_emails: [{
                    name: 'Free member welcome flow',
                    slug: 'member-welcome-email-free',
                    status: 'inactive',
                    subject: 'Welcome to the site!',
                    lexical: JSON.stringify({root: {children: []}}),
                    sender_name: 'Custom Sender',
                    sender_reply_to: 'reply@example.com'
                }]})
                .expectStatus(422);

            sinon.assert.calledOnceWithExactly(validateStub, 'reply@example.com', 'replyTo');

            const designSettings = await models.Base.knex('email_design_settings')
                .where('slug', 'default-automated-email')
                .first('sender_name', 'sender_email', 'sender_reply_to');

            assert.deepEqual(designSettings, {
                sender_name: null,
                sender_email: null,
                sender_reply_to: null
            });
        });

        it('Validates status on add', async function () {
            await agent
                .post('automated_emails')
                .body({automated_emails: [{
                    name: 'Free member welcome flow',
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
                    name: 'Free member welcome flow',
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

        describe('Structured logging', function () {
            let infoStub;

            beforeEach(function () {
                infoStub = sinon.stub(logging, 'info');
            });

            it('Logs when a welcome email is created as active', async function () {
                const {body} = await agent
                    .post('automated_emails')
                    .body({automated_emails: [{
                        name: 'Free member welcome flow',
                        slug: 'member-welcome-email-free',
                        status: 'active',
                        subject: 'Welcome to the site!',
                        lexical: JSON.stringify({root: {children: []}})
                    }]})
                    .expectStatus(201);

                const automatedEmail = body.automated_emails[0];

                sinon.assert.calledWithMatch(infoStub, {
                    system: {
                        event: 'welcome_email.enabled',
                        automation_id: automatedEmail.id,
                        slug: 'member-welcome-email-free'
                    }
                }, 'Welcome email automation enabled');
            });

            it('Does not log when a welcome email is created as inactive', async function () {
                await agent
                    .post('automated_emails')
                    .body({automated_emails: [{
                        name: 'Free member welcome flow',
                        slug: 'member-welcome-email-free',
                        status: 'inactive',
                        subject: 'Welcome to the site!',
                        lexical: JSON.stringify({root: {children: []}})
                    }]})
                    .expectStatus(201);

                sinon.assert.neverCalledWithMatch(infoStub, {
                    system: {
                        event: 'welcome_email.enabled',
                        slug: 'member-welcome-email-free'
                    }
                }, sinon.match.any);
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
                    name: 'Free member welcome flow',
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

        it('Writes sender settings to email design settings on edit', async function () {
            const automatedEmail = await createAutomatedEmail();

            await agent
                .put(`automated_emails/${automatedEmail.id}`)
                .body({automated_emails: [{
                    name: 'Free member welcome flow',
                    sender_name: 'Custom Sender',
                    sender_email: 'sender@example.com',
                    sender_reply_to: 'reply@example.com'
                }]})
                .expectStatus(200);

            const {email, designSettings} = await getSenderStorage(automatedEmail.id);

            assert.deepEqual({
                sender_name: email.sender_name,
                sender_email: email.sender_email,
                sender_reply_to: email.sender_reply_to
            }, {
                sender_name: null,
                sender_email: null,
                sender_reply_to: null
            });
            assert.deepEqual(designSettings, {
                sender_name: 'Custom Sender',
                sender_email: 'sender@example.com',
                sender_reply_to: 'reply@example.com'
            });
        });

        it('Rejects disallowed sender email on edit', async function () {
            const automatedEmail = await createAutomatedEmail();
            await updateSenderStorage(automatedEmail.id, {
                designSettings: {
                    sender_name: 'Existing Sender',
                    sender_email: 'existing@example.com',
                    sender_reply_to: 'existing-reply@example.com'
                }
            });

            emailAddressService.init();
            const validateStub = sinon.stub(emailAddressService.service, 'validate')
                .returns({allowed: false, verificationEmailRequired: false});

            await agent
                .put(`automated_emails/${automatedEmail.id}`)
                .body({automated_emails: [{
                    name: 'Free member welcome flow',
                    sender_name: 'Custom Sender',
                    sender_email: 'sender@example.com',
                    sender_reply_to: 'reply@example.com'
                }]})
                .expectStatus(422);

            sinon.assert.calledOnceWithExactly(validateStub, 'sender@example.com', 'from');

            const {designSettings} = await getSenderStorage(automatedEmail.id);
            assert.deepEqual(designSettings, {
                sender_name: 'Existing Sender',
                sender_email: 'existing@example.com',
                sender_reply_to: 'existing-reply@example.com'
            });
        });

        it('Rejects sender reply-to that requires verification on edit', async function () {
            const automatedEmail = await createAutomatedEmail();

            emailAddressService.init();
            const validateStub = sinon.stub(emailAddressService.service, 'validate')
                .returns({allowed: true, verificationEmailRequired: true});

            await agent
                .put(`automated_emails/${automatedEmail.id}`)
                .body({automated_emails: [{
                    name: 'Free member welcome flow',
                    sender_reply_to: 'reply@example.com'
                }]})
                .expectStatus(422);

            sinon.assert.calledOnceWithExactly(validateStub, 'reply@example.com', 'replyTo');

            const {designSettings} = await getSenderStorage(automatedEmail.id);
            assert.deepEqual(designSettings, {
                sender_name: null,
                sender_email: null,
                sender_reply_to: null
            });
        });

        it('Does not validate unchanged sender fields on edit', async function () {
            const automatedEmail = await createAutomatedEmail();
            await updateSenderStorage(automatedEmail.id, {
                designSettings: {
                    sender_name: 'Existing Sender',
                    sender_email: 'sender@example.com',
                    sender_reply_to: 'reply@example.com'
                }
            });

            emailAddressService.init();
            const validateStub = sinon.stub(emailAddressService.service, 'validate')
                .callsFake((email, type) => {
                    if (email === 'reply@example.com' && type === 'replyTo') {
                        return {allowed: true, verificationEmailRequired: true};
                    }

                    return {allowed: true, verificationEmailRequired: false};
                });

            await agent
                .put(`automated_emails/${automatedEmail.id}`)
                .body({automated_emails: [{
                    ...automatedEmail,
                    status: 'active',
                    subject: 'Updated subject',
                    sender_name: 'Existing Sender',
                    sender_email: 'sender@example.com',
                    sender_reply_to: 'reply@example.com'
                }]})
                .expectStatus(200);

            sinon.assert.notCalled(validateStub);

            const {designSettings} = await getSenderStorage(automatedEmail.id);
            assert.deepEqual(designSettings, {
                sender_name: 'Existing Sender',
                sender_email: 'sender@example.com',
                sender_reply_to: 'reply@example.com'
            });

            const email = await models.Base.knex('welcome_email_automated_emails')
                .where('welcome_email_automation_id', automatedEmail.id)
                .first('subject');
            assert.equal(email.subject, 'Updated subject');

            const automation = await models.Base.knex('automations')
                .where('id', automatedEmail.id)
                .first('status');
            assert.equal(automation.status, 'active');
        });

        it('Can enable a legacy automated email without a welcome email content row', async function () {
            const automatedEmail = await createAutomatedEmail({status: 'inactive'});
            await models.Base.knex('welcome_email_automated_emails')
                .where('welcome_email_automation_id', automatedEmail.id)
                .del();

            const {body} = await agent
                .get(`automated_emails/${automatedEmail.id}`)
                .expectStatus(200);

            await agent
                .put(`automated_emails/${automatedEmail.id}`)
                .body({automated_emails: [{
                    ...body.automated_emails[0],
                    status: 'active'
                }]})
                .expectStatus(200);

            const welcomeEmailRow = await models.Base.knex('welcome_email_automated_emails')
                .where('welcome_email_automation_id', automatedEmail.id)
                .first('id');
            assert.equal(welcomeEmailRow, undefined);

            const automation = await models.Base.knex('automations')
                .where('id', automatedEmail.id)
                .first('status');
            assert.equal(automation.status, 'active');
        });

        it('Validates status on edit', async function () {
            const automatedEmail = await createAutomatedEmail();

            const id = automatedEmail.id;

            await agent
                .put(`automated_emails/${id}`)
                .body({automated_emails: [{
                    name: 'Free member welcome flow',
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
                    name: 'Free member welcome flow',
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

        describe('Structured logging', function () {
            let infoStub;

            beforeEach(function () {
                infoStub = sinon.stub(logging, 'info');
            });

            it('Logs when a welcome email is enabled', async function () {
                const automatedEmail = await createAutomatedEmail({status: 'inactive'});

                await agent
                    .put(`automated_emails/${automatedEmail.id}`)
                    .body({automated_emails: [{
                        name: 'Free member welcome flow',
                        status: 'active'
                    }]})
                    .expectStatus(200);

                sinon.assert.calledWithMatch(infoStub, {
                    system: {
                        event: 'welcome_email.enabled',
                        automation_id: automatedEmail.id,
                        slug: 'member-welcome-email-free'
                    }
                }, 'Welcome email automation enabled');
            });

            it('Logs when a welcome email is disabled', async function () {
                const automatedEmail = await createAutomatedEmail({status: 'active'});

                await agent
                    .put(`automated_emails/${automatedEmail.id}`)
                    .body({automated_emails: [{
                        name: 'Free member welcome flow',
                        status: 'inactive'
                    }]})
                    .expectStatus(200);

                sinon.assert.calledWithMatch(infoStub, {
                    system: {
                        event: 'welcome_email.disabled',
                        automation_id: automatedEmail.id,
                        slug: 'member-welcome-email-free'
                    }
                }, 'Welcome email automation disabled');
            });

            it('Does not log when status does not change', async function () {
                const automatedEmail = await createAutomatedEmail({status: 'inactive'});

                await agent
                    .put(`automated_emails/${automatedEmail.id}`)
                    .body({automated_emails: [{
                        name: 'Free member welcome flow',
                        subject: 'Updated subject only'
                    }]})
                    .expectStatus(200);

                sinon.assert.neverCalledWithMatch(infoStub, {
                    system: {
                        event: sinon.match(/^welcome_email\.(enabled|disabled)$/)
                    }
                }, sinon.match.any);
            });
        });
    });

    describe('Shared sender settings', function () {
        const createSenderVerificationToken = async (property, value) => {
            return (new SingleUseTokenProvider({
                SingleUseTokenModel: models.SingleUseToken,
                validityPeriod: 24 * 60 * 60 * 1000,
                validityPeriodAfterUsage: 10 * 60 * 1000,
                maxUsageCount: 1
            })).create({property, value});
        };

        beforeEach(async function () {
            await createAutomatedEmail();
            await createAutomatedEmail({
                name: 'Paid member welcome flow',
                slug: 'member-welcome-email-paid',
                subject: 'Welcome paid member'
            });
        });

        it('Can edit sender settings for free and paid welcome emails', async function () {
            await agent
                .put('automated_emails/senders/')
                .body({
                    sender_name: 'Custom Sender',
                    sender_email: 'sender@example.com',
                    sender_reply_to: 'reply@example.com'
                })
                .expectStatus(200)
                .expect(({body}) => {
                    assert.equal(body.automated_emails.length, 2);
                    for (const automatedEmail of body.automated_emails) {
                        assert.equal(automatedEmail.sender_name, 'Custom Sender');
                        assert.equal(automatedEmail.sender_email, 'sender@example.com');
                        assert.equal(automatedEmail.sender_reply_to, 'reply@example.com');
                    }
                });

            const automatedEmails = await models.Base.knex('welcome_email_automated_emails')
                .select('sender_name', 'sender_email', 'sender_reply_to');
            assert.equal(automatedEmails.length, 2);
            for (const automatedEmail of automatedEmails) {
                assert.deepEqual(automatedEmail, {
                    sender_name: null,
                    sender_email: null,
                    sender_reply_to: null
                });
            }

            const designSettings = await models.Base.knex('email_design_settings')
                .where('slug', 'default-automated-email')
                .first('sender_name', 'sender_email', 'sender_reply_to');
            assert.deepEqual(designSettings, {
                sender_name: 'Custom Sender',
                sender_email: 'sender@example.com',
                sender_reply_to: 'reply@example.com'
            });
        });

        it('Can edit shared sender settings without welcome email content rows', async function () {
            await models.Base.knex('welcome_email_automated_emails').del();

            await agent
                .put('automated_emails/senders/')
                .body({
                    sender_name: 'Custom Sender',
                    sender_email: 'sender@example.com',
                    sender_reply_to: 'reply@example.com'
                })
                .expectStatus(200)
                .expect(({body}) => {
                    assert.equal(body.automated_emails.length, 2);
                    for (const automatedEmail of body.automated_emails) {
                        assert.equal(automatedEmail.sender_name, 'Custom Sender');
                        assert.equal(automatedEmail.sender_email, 'sender@example.com');
                        assert.equal(automatedEmail.sender_reply_to, 'reply@example.com');
                    }
                });

            const welcomeEmailRows = await models.Base.knex('welcome_email_automated_emails')
                .select('welcome_email_automation_id');
            assert.equal(welcomeEmailRows.length, 0);

            const designSettings = await models.Base.knex('email_design_settings')
                .where('slug', 'default-automated-email')
                .first('sender_name', 'sender_email', 'sender_reply_to');
            assert.deepEqual(designSettings, {
                sender_name: 'Custom Sender',
                sender_email: 'sender@example.com',
                sender_reply_to: 'reply@example.com'
            });
        });

        it('Can edit shared sender settings without automation rows', async function () {
            await models.Base.knex('welcome_email_automated_emails').del();
            await models.Base.knex('automations').del();

            await agent
                .put('automated_emails/senders/')
                .body({
                    sender_name: 'Custom Sender',
                    sender_email: 'sender@example.com',
                    sender_reply_to: 'reply@example.com'
                })
                .expectStatus(200)
                .expect(({body}) => {
                    assert.equal(body.automated_emails.length, 0);
                });

            const designSettings = await models.Base.knex('email_design_settings')
                .where('slug', 'default-automated-email')
                .first('sender_name', 'sender_email', 'sender_reply_to');
            assert.deepEqual(designSettings, {
                sender_name: 'Custom Sender',
                sender_email: 'sender@example.com',
                sender_reply_to: 'reply@example.com'
            });
        });

        it('Returns sender details from email design settings after editing shared sender settings', async function () {
            await models.Base.knex('email_design_settings')
                .where('slug', 'default-automated-email')
                .update({
                    sender_name: 'Design Sender',
                    sender_email: 'design@example.com',
                    sender_reply_to: 'design-reply@example.com'
                });

            await agent
                .put('automated_emails/senders/')
                .body({
                    sender_name: 'Custom Sender',
                    sender_email: 'sender@example.com',
                    sender_reply_to: 'reply@example.com'
                })
                .expectStatus(200)
                .expect(({body}) => {
                    assert.equal(body.automated_emails.length, 2);
                    for (const automatedEmail of body.automated_emails) {
                        assert.equal(automatedEmail.sender_name, 'Custom Sender');
                        assert.equal(automatedEmail.sender_email, 'sender@example.com');
                        assert.equal(automatedEmail.sender_reply_to, 'reply@example.com');
                    }
                });
        });

        it('Can verify pending sender update with token', async function () {
            const token = await createSenderVerificationToken('sender_reply_to', 'verified-reply@example.com');

            await agent
                .put('automated_emails/verifications/')
                .body({token})
                .expectStatus(200)
                .expect(({body}) => {
                    assert.equal(body.meta.email_verified, 'sender_reply_to');
                    assert.equal(body.automated_emails.length, 2);
                    for (const automatedEmail of body.automated_emails) {
                        assert.equal(automatedEmail.sender_reply_to, 'verified-reply@example.com');
                    }
                });

            const automatedEmails = await models.Base.knex('welcome_email_automated_emails')
                .select('sender_name', 'sender_email', 'sender_reply_to');
            assert.equal(automatedEmails.length, 2);
            for (const automatedEmail of automatedEmails) {
                assert.deepEqual(automatedEmail, {
                    sender_name: null,
                    sender_email: null,
                    sender_reply_to: null
                });
            }

            const designSettings = await models.Base.knex('email_design_settings')
                .where('slug', 'default-automated-email')
                .first('sender_name', 'sender_email', 'sender_reply_to');
            assert.deepEqual(designSettings, {
                sender_name: null,
                sender_email: null,
                sender_reply_to: 'verified-reply@example.com'
            });
        });
    });

    describe('Preview', function () {
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

        beforeEach(function () {
            sinon.stub(Date.prototype, 'getFullYear').returns(2025);
        });

        beforeEach(async function () {
            await agent.loginAsOwner();
            const automatedEmail = await createAutomatedEmail({
                status: 'active',
                lexical: validLexical
            });
            automatedEmailId = automatedEmail.id;
        });

        it('Can render preview', async function () {
            await agent
                .post(`automated_emails/${automatedEmailId}/preview/`)
                .body({
                    subject: 'Test Subject',
                    lexical: validLexical
                })
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot render legacy preview without a welcome email content row', async function () {
            await models.Base.knex('welcome_email_automated_emails')
                .where('welcome_email_automation_id', automatedEmailId)
                .del();

            const welcomeEmailRow = await models.Base.knex('welcome_email_automated_emails')
                .where('welcome_email_automation_id', automatedEmailId)
                .first('id');
            assert.equal(welcomeEmailRow, undefined);

            await agent
                .post(`automated_emails/${automatedEmailId}/preview/`)
                .body({
                    subject: 'Test Subject',
                    lexical: validLexical
                })
                .expectStatus(404)
                .expect(({body}) => {
                    assert.equal(body.errors.length, 1);
                    assert.equal(typeof body.errors[0].id, 'string');
                });
        });

        it('Can preview inactive automated email', async function () {
            const automatedEmail = await createAutomatedEmail({
                name: 'Paid member welcome flow',
                slug: 'member-welcome-email-paid',
                status: 'inactive',
                lexical: validLexical
            });

            await agent
                .post(`automated_emails/${automatedEmail.id}/preview/`)
                .body({
                    subject: 'Test Subject',
                    lexical: validLexical
                })
                .expectStatus(200)
                .expect(({body}) => {
                    assert.equal(body.automated_emails.length, 1);
                    assert.equal(body.automated_emails[0].subject, 'Test Subject');
                });
        });

        it('Renders template replacements in subject and content', async function () {
            const lexicalWithReplacements = JSON.stringify({
                root: {
                    children: [{
                        type: 'paragraph',
                        children: [{
                            detail: 0,
                            format: 0,
                            mode: 'normal',
                            style: '',
                            text: 'Hello {first_name}, your email is {email}.',
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

            await agent
                .post(`automated_emails/${automatedEmailId}/preview/`)
                .body({
                    subject: 'Welcome {first_name}',
                    lexical: lexicalWithReplacements
                })
                .expectStatus(200)
                .expect(({body}) => {
                    assert.equal(body.automated_emails.length, 1);
                    assert.equal(body.automated_emails[0].subject, 'Welcome Jamie');
                    assert.match(body.automated_emails[0].html, /Hello Jamie/);
                    assert.match(body.automated_emails[0].html, /jamie@example\.com/);
                    assert.match(body.automated_emails[0].plaintext, /Hello Jamie/);
                    assert.match(body.automated_emails[0].plaintext, /jamie@example\.com/);
                });
        });

        it('Cannot preview for non-existent automated email', async function () {
            await agent
                .post('automated_emails/abcd1234abcd1234abcd1234/preview/')
                .body({
                    subject: 'Test Subject',
                    lexical: validLexical
                })
                .expectStatus(404)
                .expect(({body}) => {
                    assert.equal(body.errors.length, 1);
                    assert.equal(typeof body.errors[0].id, 'string');
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot preview without subject', async function () {
            await agent
                .post(`automated_emails/${automatedEmailId}/preview/`)
                .body({
                    lexical: validLexical
                })
                .expectStatus(422)
                .expect(({body}) => {
                    assert.equal(body.errors.length, 1);
                    assert.equal(typeof body.errors[0].id, 'string');
                    assert.equal(body.errors[0].property, 'subject');
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot preview without lexical', async function () {
            await agent
                .post(`automated_emails/${automatedEmailId}/preview/`)
                .body({
                    subject: 'Test Subject'
                })
                .expectStatus(422)
                .expect(({body}) => {
                    assert.equal(body.errors.length, 1);
                    assert.equal(typeof body.errors[0].id, 'string');
                    assert.equal(body.errors[0].property, 'lexical');
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot preview automated email without authentication', async function () {
            agent.resetAuthentication();

            await agent
                .post(`automated_emails/${automatedEmailId}/preview/`)
                .body({
                    subject: 'Test Subject',
                    lexical: validLexical
                })
                .expectStatus(403)
                .expect(({body}) => {
                    assert.equal(body.errors.length, 1);
                    assert.equal(typeof body.errors[0].id, 'string');
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

        it('Uses configured sender and reply-to for test email', async function () {
            const senderEmail = 'editor@example.com';
            const senderReplyTo = 'reply@example.com';
            const {body: newslettersBody} = await agent.get('newsletters/?limit=1').expectStatus(200);
            const defaultNewsletterId = newslettersBody.newsletters[0].id;

            await agent
                .put(`newsletters/${defaultNewsletterId}`)
                .body({newsletters: [{
                    sender_email: senderEmail,
                    sender_reply_to: senderReplyTo
                }]})
                .expectStatus(200);

            await agent
                .post(`automated_emails/${automatedEmailId}/test/`)
                .body({
                    email: 'test@ghost.org',
                    subject: 'Test Subject',
                    lexical: validLexical
                })
                .expectStatus(204);

            sinon.assert.calledOnce(mailService.GhostMailer.prototype.send);
            sinon.assert.calledWithMatch(mailService.GhostMailer.prototype.send, {
                from: sinon.match(new RegExp(senderEmail)),
                replyTo: senderReplyTo
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
        let automatedEmailId;

        beforeEach(async function () {
            await agent.loginAsOwner();
            const automatedEmail = await createAutomatedEmail({
                status: 'active',
                lexical: JSON.stringify({root: {children: []}})
            });
            automatedEmailId = automatedEmail.id;
        });

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

        it('Cannot preview automated emails as editor', async function () {
            await agent.loginAsEditor();

            await agent
                .post(`automated_emails/${automatedEmailId}/preview/`)
                .body({
                    subject: 'Test Subject',
                    lexical: JSON.stringify({root: {children: []}})
                })
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

        it('Cannot preview automated emails as author', async function () {
            await agent.loginAsAuthor();

            await agent
                .post(`automated_emails/${automatedEmailId}/preview/`)
                .body({
                    subject: 'Test Subject',
                    lexical: JSON.stringify({root: {children: []}})
                })
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

        it('Cannot preview automated emails as contributor', async function () {
            await agent.loginAsContributor();

            await agent
                .post(`automated_emails/${automatedEmailId}/preview/`)
                .body({
                    subject: 'Test Subject',
                    lexical: JSON.stringify({root: {children: []}})
                })
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
