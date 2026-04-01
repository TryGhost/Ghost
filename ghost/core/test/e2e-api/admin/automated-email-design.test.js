const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyObjectId, anyISODateTime, anyErrorId, anyEtag} = matchers;

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

    describe('Read', function () {
        it('Can read the default automated email design', async function () {
            await agent
                .get('automated_email_design')
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
                .put('automated_email_design')
                .body({automated_email_design: [{
                    background_color: 'dark',
                    button_corners: 'pill',
                    link_style: 'bold'
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
                .put('automated_email_design')
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

        it('Validates button_corners value', async function () {
            await agent
                .put('automated_email_design')
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
    });

    describe('Permissions', function () {
        it('Cannot access automated email design as editor', async function () {
            await agent.loginAsEditor();

            await agent
                .get('automated_email_design')
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
                .get('automated_email_design')
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
                .put('automated_email_design')
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
