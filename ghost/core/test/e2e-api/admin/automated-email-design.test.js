const assert = require('node:assert/strict');
const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyObjectId, anyISODateTime, anyErrorId, anyEtag} = matchers;
const models = require('../../../core/server/models');

const matchEmailDesignSetting = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

describe('Automated Email Design API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsOwner();
    });

    beforeEach(async function () {
        const defaultDesign = await models.EmailDesignSetting.findOne({
            slug: 'default-automated-email'
        });

        await models.EmailDesignSetting.edit({
            sender_name: null,
            sender_email: null,
            sender_reply_to: null
        }, {id: defaultDesign.id});
    });

    describe('Read', function () {
        it('Can read the default automated email design', async function () {
            await agent
                .get('automated_emails/design')
                .expectStatus(200)
                .matchBodySnapshot({
                    automated_email_design: [matchEmailDesignSetting]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });

    describe('Edit', function () {
        it('Can edit the automated email design', async function () {
            await agent
                .put('automated_emails/design')
                .body({automated_email_design: [{
                    background_color: 'dark',
                    button_corners: 'pill',
                    link_style: 'bold',
                    show_header_icon: false
                }]})
                .expectStatus(200)
                .matchBodySnapshot({
                    automated_email_design: [matchEmailDesignSetting]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Rejects slug modification', async function () {
            await agent
                .put('automated_emails/design')
                .body({automated_email_design: [{
                    slug: 'custom-slug'
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

        it('Ignores id in the payload', async function () {
            // Read the current design to get the real id
            const {body: before} = await agent
                .get('automated_emails/design')
                .expectStatus(200);

            const realId = before.automated_email_design[0].id;

            // Attempt to change the id
            const {body: after} = await agent
                .put('automated_emails/design')
                .body({automated_email_design: [{
                    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
                    background_color: 'light'
                }]})
                .expectStatus(200);

            assert.equal(after.automated_email_design[0].id, realId);
        });

        it('Validates button_corners value', async function () {
            await agent
                .put('automated_emails/design')
                .body({automated_email_design: [{
                    button_corners: 'invalid-value'
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

        it('Rejects sender field modification', async function () {
            const defaultDesign = await models.EmailDesignSetting.findOne({
                slug: 'default-automated-email'
            });

            await models.EmailDesignSetting.edit({
                sender_name: 'Existing Sender',
                sender_email: 'existing@example.com',
                sender_reply_to: 'existing-reply@example.com'
            }, {id: defaultDesign.id});

            await agent
                .put('automated_emails/design')
                .body({automated_email_design: [{
                    sender_name: 'Changed Sender',
                    sender_email: 'changed@example.com',
                    sender_reply_to: 'changed-reply@example.com'
                }]})
                .expectStatus(422)
                .expect(({body}) => {
                    assert.equal(body.errors[0].context, 'Sender fields cannot be modified through the email design endpoint.');
                });

            const after = await models.EmailDesignSetting.findOne({
                id: defaultDesign.id
            });

            assert.equal(after.get('sender_name'), 'Existing Sender');
            assert.equal(after.get('sender_email'), 'existing@example.com');
            assert.equal(after.get('sender_reply_to'), 'existing-reply@example.com');
        });
    });

    describe('Permissions', function () {
        it('Cannot access automated email design as editor', async function () {
            await agent.loginAsEditor();

            await agent
                .get('automated_emails/design')
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

        it('Cannot access automated email design as author', async function () {
            await agent.loginAsAuthor();

            await agent
                .get('automated_emails/design')
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

        it('Cannot edit automated email design as contributor', async function () {
            await agent.loginAsContributor();

            await agent
                .put('automated_emails/design')
                .body({automated_email_design: [{
                    background_color: 'dark'
                }]})
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
