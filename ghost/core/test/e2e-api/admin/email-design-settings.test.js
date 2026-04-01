const {agentProvider, fixtureManager, matchers, dbUtils} = require('../../utils/e2e-framework');
const {anyContentVersion, anyObjectId, anyISODateTime, anyErrorId, anyEtag} = matchers;

const matchEmailDesignSetting = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

describe('Email Design Settings API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsOwner();
    });

    describe('Browse', function () {
        it('Can browse email design settings', async function () {
            await agent
                .get('email_design_settings')
                .expectStatus(200)
                .matchBodySnapshot({
                    email_design_settings: [matchEmailDesignSetting]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });

    describe('Read', function () {
        it('Can read an email design setting by id', async function () {
            const {body: browseBody} = await agent
                .get('email_design_settings')
                .expectStatus(200);

            const id = browseBody.email_design_settings[0].id;

            await agent
                .get(`email_design_settings/${id}`)
                .expectStatus(200)
                .matchBodySnapshot({
                    email_design_settings: [matchEmailDesignSetting]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot read a non-existent email design setting', async function () {
            await agent
                .get('email_design_settings/abcd1234abcd1234abcd1234')
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

    describe('Edit', function () {
        it('Can edit an email design setting', async function () {
            const {body: browseBody} = await agent
                .get('email_design_settings')
                .expectStatus(200);

            const id = browseBody.email_design_settings[0].id;

            await agent
                .put(`email_design_settings/${id}`)
                .body({email_design_settings: [{
                    background_color: '#ffffff',
                    button_corners: 'pill',
                    body_font_category: 'serif'
                }]})
                .expectStatus(200)
                .matchBodySnapshot({
                    email_design_settings: [matchEmailDesignSetting]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Validates button_corners on edit', async function () {
            const {body: browseBody} = await agent
                .get('email_design_settings')
                .expectStatus(200);

            const id = browseBody.email_design_settings[0].id;

            await agent
                .put(`email_design_settings/${id}`)
                .body({email_design_settings: [{
                    button_corners: 'invalid'
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

        it('Validates button_style on edit', async function () {
            const {body: browseBody} = await agent
                .get('email_design_settings')
                .expectStatus(200);

            const id = browseBody.email_design_settings[0].id;

            await agent
                .put(`email_design_settings/${id}`)
                .body({email_design_settings: [{
                    button_style: 'invalid'
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

        it('Validates link_style on edit', async function () {
            const {body: browseBody} = await agent
                .get('email_design_settings')
                .expectStatus(200);

            const id = browseBody.email_design_settings[0].id;

            await agent
                .put(`email_design_settings/${id}`)
                .body({email_design_settings: [{
                    link_style: 'invalid'
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

        it('Validates body_font_category on edit', async function () {
            const {body: browseBody} = await agent
                .get('email_design_settings')
                .expectStatus(200);

            const id = browseBody.email_design_settings[0].id;

            await agent
                .put(`email_design_settings/${id}`)
                .body({email_design_settings: [{
                    body_font_category: 'invalid'
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

        it('Validates title_font_category on edit', async function () {
            const {body: browseBody} = await agent
                .get('email_design_settings')
                .expectStatus(200);

            const id = browseBody.email_design_settings[0].id;

            await agent
                .put(`email_design_settings/${id}`)
                .body({email_design_settings: [{
                    title_font_category: 'invalid'
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

        it('Validates title_font_weight on edit', async function () {
            const {body: browseBody} = await agent
                .get('email_design_settings')
                .expectStatus(200);

            const id = browseBody.email_design_settings[0].id;

            await agent
                .put(`email_design_settings/${id}`)
                .body({email_design_settings: [{
                    title_font_weight: 'invalid'
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

        it('Validates image_corners on edit', async function () {
            const {body: browseBody} = await agent
                .get('email_design_settings')
                .expectStatus(200);

            const id = browseBody.email_design_settings[0].id;

            await agent
                .put(`email_design_settings/${id}`)
                .body({email_design_settings: [{
                    image_corners: 'invalid'
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
        it('Cannot access email design settings as editor', async function () {
            await agent.loginAsEditor();

            await agent
                .get('email_design_settings')
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

        it('Cannot access email design settings as author', async function () {
            await agent.loginAsAuthor();

            await agent
                .get('email_design_settings')
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

        it('Cannot access email design settings as contributor', async function () {
            await agent.loginAsContributor();

            await agent
                .get('email_design_settings')
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
